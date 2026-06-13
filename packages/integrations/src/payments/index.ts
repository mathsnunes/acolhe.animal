import { isLiveIntegrations } from '@acolhe-animal/shared/env';

import { AsaasPaymentsProvider } from './asaas';
import { MockPaymentsProvider } from './mock';
import type { PaymentsProvider } from './types';

export * from './types';

let cached: PaymentsProvider | null = null;

export function getPayments(): PaymentsProvider {
  if (!cached) {
    cached = isLiveIntegrations() ? new AsaasPaymentsProvider() : new MockPaymentsProvider();
  }
  return cached;
}
