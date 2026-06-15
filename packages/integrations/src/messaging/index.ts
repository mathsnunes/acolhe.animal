import { isLiveIntegrations } from '@acolhe-animal/shared/env';

import { EvolutionMessagingProvider } from './evolution';
import { MockMessagingProvider } from './mock';
import type { MessagingProvider } from './types';

export * from './types';
export { getMockOutbox } from './mock';

let cached: MessagingProvider | null = null;

export const getMessaging = (): MessagingProvider => {
  if (!cached) {
    cached = isLiveIntegrations()
      ? new EvolutionMessagingProvider()
      : new MockMessagingProvider();
  }
  return cached;
};
