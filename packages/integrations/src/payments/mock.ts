import { createToken } from '@acolhe-animal/shared';

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

/**
 * Mock payments provider — returns deterministic fake data so Pillar 2 flows can
 * be exercised end-to-end locally without an Asaas account.
 * Shapes match real Asaas sandbox responses (verified via explore-asaas-sandbox.ts).
 */
export class MockPaymentsProvider implements PaymentsProvider {
  readonly name = 'mock-payments';

  async createSubaccount(_input: CreateSubaccountInput): Promise<CreateSubaccountResult> {
    return {
      accountId: `acc_mock_${createToken(12)}`,
      apiKey: `$aact_mock_${createToken(24)}`,
      walletId: `wal_mock_${createToken(12)}`,
    };
  }

  async getAccountStatus(_accountApiKey: string): Promise<AsaasAccountStatus> {
    return { id: 'acc_mock', status: 'ACTIVE', rawStatus: 'ACTIVE' };
  }

  async getRequiredDocuments(_accountApiKey: string): Promise<RequiredDocument[]> {
    return [
      { id: 'doc_selfie', type: 'SELFIE' },
      {
        id: 'doc_identification',
        type: 'IDENTIFICATION',
        onboardingUrl: 'https://sandbox.asaas.com/onboarding/mock',
      },
    ];
  }

  async uploadDocument(_input: UploadDocumentInput): Promise<void> {
    // no-op in mock
  }

  async getPixKey(_accountApiKey: string): Promise<string> {
    return `mock-pix@acolhe.test`;
  }

  async createPixCharge(input: CreatePixChargeInput): Promise<CreatePixChargeResult> {
    return {
      paymentId: `pay_mock_${createToken(16)}`,
      qrCodePayload: `00020126MOCK${input.externalReference}`,
      qrCodeImageBase64: '',
    };
  }

  // TODO: remove — sandbox simulation only
  async simulatePaymentReceived(_accountApiKey: string, _paymentId: string, _amount: number): Promise<void> {
    // no-op in mock
  }

  async createTransfer(_input: CreateTransferInput): Promise<CreateTransferResult> {
    return { transferId: `tra_mock_${createToken(16)}`, status: 'processing', fee: 0 };
  }
}
