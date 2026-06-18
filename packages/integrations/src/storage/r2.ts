import type {
  CreateUploadUrlInput,
  ObjectInfo,
  PutObjectInput,
  PutObjectResult,
  StorageProvider,
  UploadTicket,
} from './types';

const NOT_IMPLEMENTED = 'R2StorageProvider não implementado no MVP. Use INTEGRATIONS_MODE=mock.';

/**
 * Cloudflare R2 adapter (S3-compatible). Stubbed for the MVP — wire the AWS S3
 * SDK here when `INTEGRATIONS_MODE=live`:
 *  - `createUploadUrl` → `getSignedUrl(PutObjectCommand)` with `ContentType` and a
 *    `ContentLength` range so the policy is enforced at the edge.
 *  - `move` → `CopyObjectCommand` + `DeleteObjectCommand`.
 *  - `get`/`exists` → `GetObjectCommand` / `HeadObjectCommand`.
 * Kept as a separate file so the live implementation never leaks into mock bundles.
 */
export class R2StorageProvider implements StorageProvider {
  readonly name = 'r2';

  put(_input: PutObjectInput): Promise<PutObjectResult> {
    throw new Error(NOT_IMPLEMENTED);
  }

  get(_key: string): Promise<Buffer> {
    throw new Error(NOT_IMPLEMENTED);
  }

  exists(_key: string): Promise<ObjectInfo | null> {
    throw new Error(NOT_IMPLEMENTED);
  }

  move(_fromKey: string, _toKey: string): Promise<void> {
    throw new Error(NOT_IMPLEMENTED);
  }

  delete(_key: string): Promise<void> {
    throw new Error(NOT_IMPLEMENTED);
  }

  createUploadUrl(_input: CreateUploadUrlInput): Promise<UploadTicket> {
    throw new Error(NOT_IMPLEMENTED);
  }

  getPublicUrl(_key: string): string {
    throw new Error(NOT_IMPLEMENTED);
  }

  keyFromUrl(_url: string): string {
    throw new Error(NOT_IMPLEMENTED);
  }
}
