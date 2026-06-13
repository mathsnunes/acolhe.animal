/**
 * File storage provider (Cloudflare R2 in production).
 *
 * The domain/web layers depend only on this interface — never on R2 or the S3
 * SDK directly — so swapping the provider is an adapter change, not a domain
 * change. See `docs/architecture.md` › Integrations.
 */
export interface PutObjectInput {
  /** Object key, e.g. `animals/animal_x/photo_y/original.jpg`. */
  key: string;
  body: Buffer | Uint8Array;
  contentType: string;
}

export interface PutObjectResult {
  key: string;
  url: string;
}

export interface StorageProvider {
  readonly name: string;
  put(input: PutObjectInput): Promise<PutObjectResult>;
  delete(key: string): Promise<void>;
  /** Public URL for an already-stored key. */
  getPublicUrl(key: string): string;
}
