import type {
  CreatePixChargeInput,
  CreatePixChargeResult,
  CreateSubaccountInput,
  CreateSubaccountResult,
  CreateTransferInput,
  CreateTransferResult,
  PaymentsProvider,
  RequiredDocument,
} from './types';

/**
 * Asaas adapter (BaaS subaccounts + Pix + transfers). Stubbed for the MVP — the
 * live HTTP integration is wired when Pillar 2 ships. See `05-setup-financeiro.md`.
 */
export class AsaasPaymentsProvider implements PaymentsProvider {
  readonly name = 'asaas';

  private notImplemented(): never {
    throw new Error('AsaasPaymentsProvider não implementado no MVP. Use INTEGRATIONS_MODE=mock.');
  }

  createSubaccount(_input: CreateSubaccountInput): Promise<CreateSubaccountResult> {
    return this.notImplemented();
  }
  getRequiredDocuments(_accountApiKey: string): Promise<RequiredDocument[]> {
    return this.notImplemented();
  }
  getPixKey(_accountApiKey: string): Promise<string> {
    return this.notImplemented();
  }
  createPixCharge(_input: CreatePixChargeInput): Promise<CreatePixChargeResult> {
    return this.notImplemented();
  }
  createTransfer(_input: CreateTransferInput): Promise<CreateTransferResult> {
    return this.notImplemented();
  }
}
