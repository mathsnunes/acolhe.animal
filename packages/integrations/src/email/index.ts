import { isLiveIntegrations } from '@acolhe-animal/shared/env';

import { MockEmailProvider } from './mock';
import { ResendEmailProvider } from './resend';
import type { EmailProvider } from './types';

export * from './types';
export { getMockEmailOutbox } from './mock';

let cached: EmailProvider | null = null;

export const getEmail = (): EmailProvider => {
  if (!cached) {
    cached = isLiveIntegrations() ? new ResendEmailProvider() : new MockEmailProvider();
  }
  return cached;
};
