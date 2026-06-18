import { isLivePayments } from '@acolhe-animal/shared/env';

import { AsaasPaymentsProvider } from './asaas';
import { MockPaymentsProvider } from './mock';
import type { PaymentsProvider } from './types';

export * from './types';

let cached: PaymentsProvider | null = null;

export const getPayments = (): PaymentsProvider => {
  if (!cached) {
    cached = isLivePayments() ? new AsaasPaymentsProvider() : new MockPaymentsProvider();
  }
  return cached;
};
