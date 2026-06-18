import type {
  AsaasAccountStatus,
  CreatePixChargeInput,
  CreatePixChargeResult,
  CreateSubaccountInput,
  CreateSubaccountResult,
  CreateTransferInput,
  CreateTransferResult,
  PaymentsProvider,
  RequiredDocument,
  UploadDocumentInput,
} from './types';

const getBase = () => {
  const url = process.env.ASAAS_BASE_URL;
  if (!url) throw new Error('ASAAS_BASE_URL is not set');
  return url;
};

const getMasterKey = () => {
  const key = process.env.ASAAS_API_KEY;
  if (!key) throw new Error('ASAAS_API_KEY is not set');
  return key;
};

const asaasReq = async (
  apiKey: string,
  method: string,
  path: string,
  body?: unknown,
): Promise<Response> => {
  const res = await fetch(`${getBase()}${path}`, {
    method,
    headers: {
      'access_token': apiKey,
      'Content-Type': 'application/json',
      'User-Agent': 'acolhe-animal/1.0',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res;
};

const toJson = async <T>(res: Response): Promise<T> => {
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Asaas ${res.status}: ${text.slice(0, 300)}`);
  }
  return JSON.parse(text) as T;
};

/**
 * Asaas BaaS adapter — live HTTP implementation.
 * Field names match Asaas v3 API shapes verified against sandbox.
 */
export class AsaasPaymentsProvider implements PaymentsProvider {
  readonly name = 'asaas';

  async createSubaccount(input: CreateSubaccountInput): Promise<CreateSubaccountResult> {
    const res = await asaasReq(getMasterKey(), 'POST', '/accounts', {
      name: input.name,
      email: input.email,
      cpfCnpj: input.cpfCnpj,
      companyType: input.companyType,
      phone: input.phone,
      mobilePhone: input.mobilePhone ?? input.phone,
      birthDate: input.birthDate,
      address: input.address?.street,
      addressNumber: input.address?.number,
      province: input.address?.province,
      postalCode: input.address?.postalCode,
    });
    const data = await toJson<{ id: string; apiKey: string; walletId: string }>(res);
    return { accountId: data.id, apiKey: data.apiKey, walletId: data.walletId };
  }

  async getAccountStatus(accountApiKey: string): Promise<AsaasAccountStatus> {
    const res = await asaasReq(accountApiKey, 'GET', '/myAccount');
    const data = await toJson<Record<string, unknown>>(res);
    const rawStatus = (data['status'] as string) ?? 'ACTIVE';
    const knownStatuses = ['AWAITING_DOCUMENTS', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'ACTIVE'] as const;
    const status = knownStatuses.find((s) => s === rawStatus) ?? 'ACTIVE';
    return { id: data['id'] as string, status, rawStatus };
  }

  async getRequiredDocuments(accountApiKey: string): Promise<RequiredDocument[]> {
    const res = await asaasReq(accountApiKey, 'GET', '/myAccount/documents');
    const data = await toJson<{ data: Array<{ id: string; type: string; onboardingUrl?: string }> }>(res);
    return (data.data ?? []).map((d) => ({
      id: d.id,
      type: d.type,
      ...(d.onboardingUrl ? { onboardingUrl: d.onboardingUrl } : {}),
    }));
  }

  async uploadDocument(input: UploadDocumentInput): Promise<void> {
    const form = new FormData();
    form.append(
      'documentFile',
      new Blob([new Uint8Array(input.fileBuffer)], { type: input.mimeType }),
      input.filename,
    );
    form.append('type', input.filename.toLowerCase().includes('selfie') ? 'SELFIE' : 'IDENTIFICATION');
    const res = await fetch(`${getBase()}/myAccount/documents/${input.documentId}`, {
      method: 'POST',
      headers: { 'access_token': input.accountApiKey },
      body: form,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Asaas document upload failed ${res.status}: ${text.slice(0, 200)}`);
    }
  }

  async getPixKey(accountApiKey: string): Promise<string> {
    const res = await asaasReq(accountApiKey, 'GET', '/myAccount/pixTransactionKeys');
    const data = await toJson<{ data: Array<{ key: string; status: string }> }>(res);
    const active = data.data?.find((k) => k.status === 'ACTIVE');
    if (!active) throw new Error('No active Pix key found on subaccount');
    return active.key;
  }

  async createPixCharge(input: CreatePixChargeInput): Promise<CreatePixChargeResult> {
    const res = await asaasReq(input.accountApiKey, 'POST', '/payments', {
      billingType: 'PIX',
      value: input.amount,
      dueDate: new Date(Date.now() + 30 * 60 * 1000).toISOString().slice(0, 10),
      description: input.description,
      externalReference: input.externalReference,
      ...(input.splitPercent
        ? { split: [{ walletId: process.env.ASAAS_PLATFORM_WALLET_ID, percentualValue: input.splitPercent }] }
        : {}),
    });
    const data = await toJson<{ id: string; pixTransaction?: { payload: string; encodedImage: string } }>(res);
    return {
      paymentId: data.id,
      qrCodePayload: data.pixTransaction?.payload ?? '',
      qrCodeImageBase64: data.pixTransaction?.encodedImage ?? '',
    };
  }

  async createTransfer(input: CreateTransferInput): Promise<CreateTransferResult> {
    const body = input.pixKey
      ? { operationType: 'PIX', pixAddressKey: input.pixKey, value: input.amount }
      : {
          operationType: 'TED',
          bankAccount: {
            bank: { code: input.bankAccount!.bankCode },
            accountName: input.bankAccount!.holderName,
            ownerName: input.bankAccount!.holderName,
            cpfCnpj: input.bankAccount!.holderDocument,
            agency: input.bankAccount!.agency,
            account: input.bankAccount!.account,
            accountDigit: '',
            bankAccountType:
              input.bankAccount!.accountType === 'checking' ? 'CONTA_CORRENTE' : 'CONTA_POUPANCA',
          },
          value: input.amount,
        };
    const res = await asaasReq(input.accountApiKey, 'POST', '/transfers', body);
    const data = await toJson<{ id: string; status: string; transferFee: number }>(res);
    return {
      transferId: data.id,
      status: data.status === 'DONE' ? 'completed' : data.status === 'FAILED' ? 'failed' : 'processing',
      fee: data.transferFee ?? 0,
    };
  }
}
