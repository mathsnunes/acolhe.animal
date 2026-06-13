import type { PutObjectInput, PutObjectResult, StorageProvider } from './types';

/**
 * Cloudflare R2 adapter (S3-compatible). Stubbed for the MVP — wire the AWS S3
 * SDK here when `INTEGRATIONS_MODE=live`. Kept as a separate file so the live
 * implementation never leaks into mock/dev bundles.
 */
export class R2StorageProvider implements StorageProvider {
  readonly name = 'r2';

  put(_input: PutObjectInput): Promise<PutObjectResult> {
    throw new Error('R2StorageProvider não implementado no MVP. Use INTEGRATIONS_MODE=mock.');
  }

  delete(_key: string): Promise<void> {
    throw new Error('R2StorageProvider não implementado no MVP. Use INTEGRATIONS_MODE=mock.');
  }

  getPublicUrl(_key: string): string {
    throw new Error('R2StorageProvider não implementado no MVP. Use INTEGRATIONS_MODE=mock.');
  }
}
