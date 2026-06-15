import { createToken } from '@acolhe-animal/shared';

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
 * Mock payments provider — returns deterministic fake data so Pillar 2 flows can
 * be exercised end-to-end locally without an Asaas account.
 */
export class MockPaymentsProvider implements PaymentsProvider {
  readonly name = 'mock-payments';

  async createSubaccount(_input: CreateSubaccountInput): Promise<CreateSubaccountResult> {
    return {
      accountId: `acc_mock_${createToken(12)}`,
      apiKey: `key_mock_${createToken(24)}`,
      walletId: `wal_mock_${createToken(12)}`,
    };
  }

  async getRequiredDocuments(_accountApiKey: string): Promise<RequiredDocument[]> {
    return [
      { id: 'doc_identification', type: 'IDENTIFICATION' },
      { id: 'doc_selfie', type: 'SELFIE' },
    ];
  }

  async getPixKey(_accountApiKey: string): Promise<string> {
    return `mock-pix-key-${createToken(8)}@acolhe.animal`;
  }

  async createPixCharge(input: CreatePixChargeInput): Promise<CreatePixChargeResult> {
    return {
      paymentId: `pay_mock_${createToken(16)}`,
      qrCodePayload: `00020126MOCK${input.externalReference}`,
      qrCodeImageBase64: '',
    };
  }

  async createTransfer(_input: CreateTransferInput): Promise<CreateTransferResult> {
    return { transferId: `tra_mock_${createToken(16)}`, status: 'processing', fee: 0 };
  }
}
