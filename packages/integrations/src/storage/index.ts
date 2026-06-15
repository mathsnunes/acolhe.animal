import { isLiveIntegrations } from '@acolhe-animal/shared/env';

import { MockStorageProvider } from './mock';
import { R2StorageProvider } from './r2';
import type { StorageProvider } from './types';

export * from './types';

let cached: StorageProvider | null = null;

/** The active storage provider, chosen by `INTEGRATIONS_MODE`. */
export const getStorage = (): StorageProvider => {
  if (!cached) {
    cached = isLiveIntegrations() ? new R2StorageProvider() : new MockStorageProvider();
  }
  return cached;
};
