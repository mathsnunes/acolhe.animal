/**
 * Payments / BaaS provider (Asaas in production). Models the Asaas surface the
 * product orchestrates: subaccount creation (KYC), Pix charges with split,
 * payouts. Pillar 2 — the interface is defined now so the boundary is honest;
 * the live adapter is wired when Pillar 2 ships. See `modelagem-dados.md` ›
 * "Relacionamento com Asaas".
 *
 * Field names are provider-neutral; the Asaas-specific encoding lives in the
 * adapter. Swapping providers (Iugu, Pagar.me) is an adapter change.
 */

export interface CreateSubaccountInput {
  name: string;
  cpfCnpj: string;
  email: string;
  phone: string;
  mobilePhone?: string;
  birthDate?: string;
  companyType?: string;
  /** Monthly income/revenue in BRL (required by Asaas). */
  incomeValue?: number;
  address?: {
    street: string;
    number: string;
    province: string;
    postalCode: string;
  };
}

export interface CreateSubaccountResult {
  accountId: string;
  /** Returned once at creation — caller must encrypt before storing. */
  apiKey: string;
  walletId: string;
}

export interface RequiredDocument {
  id: string;
  type: string;
  /** When present, upload must go through this external Asaas URL, not the API. */
  onboardingUrl?: string;
}

export interface CreatePixChargeInput {
  /** The org subaccount API key the charge is created under. */
  accountApiKey: string;
  amount: number;
  /** Our Donation id, echoed back on the webhook for reconciliation. */
  externalReference: string;
  description?: string;
  /** Split percentage routed to the platform master wallet (Phase 2). */
  splitPercent?: number;
  /** Donor info — used to upsert an Asaas customer on the subaccount. */
  donor?: { name: string; cpf?: string; email?: string };
}

export interface CreatePixChargeResult {
  paymentId: string;
  qrCodePayload: string;
  qrCodeImageBase64: string;
}

export interface CreateTransferInput {
  accountApiKey: string;
  amount: number;
  pixKey?: string;
  bankAccount?: {
    bankCode: string;
    agency: string;
    account: string;
    accountType: 'checking' | 'savings';
    holderName: string;
    holderDocument: string;
  };
}

export interface CreateTransferResult {
  transferId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  fee: number;
}

export interface AsaasAccountStatus {
  id: string;
  status: 'AWAITING_DOCUMENTS' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'ACTIVE';
  /** Full raw status string from Asaas — kept for logging. */
  rawStatus: string;
}

export interface UploadDocumentInput {
  /** The subaccount's API key. */
  accountApiKey: string;
  /** Document id from getRequiredDocuments(). */
  documentId: string;
  fileBuffer: Buffer;
  mimeType: string;
  /** Original filename for the multipart part. */
  filename: string;
}

export interface PaymentsProvider {
  readonly name: string;
  createSubaccount(input: CreateSubaccountInput): Promise<CreateSubaccountResult>;
  getAccountStatus(accountApiKey: string): Promise<AsaasAccountStatus>;
  getRequiredDocuments(accountApiKey: string): Promise<RequiredDocument[]>;
  uploadDocument(input: UploadDocumentInput): Promise<void>;
  getPixKey(accountApiKey: string): Promise<string>;
  // TODO: remove — sandbox simulation only, not part of the production contract
  simulatePaymentReceived(accountApiKey: string, paymentId: string, amount: number): Promise<void>;
  createPixCharge(input: CreatePixChargeInput): Promise<CreatePixChargeResult>;
  createTransfer(input: CreateTransferInput): Promise<CreateTransferResult>;
}
