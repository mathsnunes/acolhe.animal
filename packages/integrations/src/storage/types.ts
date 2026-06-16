/**
 * File storage provider (Cloudflare R2 in production).
 *
 * The domain/web layers depend only on this interface — never on R2 or the S3
 * SDK directly — so swapping the provider is an adapter change, not a domain
 * change. See `docs/architecture.md` › Integrations and `docs/uploads.md`.
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

/** Metadata returned by a HEAD-style lookup of an existing object. */
export interface ObjectInfo {
  size: number;
  contentType: string;
}

export interface CreateUploadUrlInput {
  /** The (temporary) key the client will upload to. */
  key: string;
  /** Declared content type; the presigned URL is locked to it. */
  contentType: string;
  /** Upper bound for the body size; enforced by the signed URL where supported. */
  maxBytes: number;
  /** How long the URL stays valid. */
  expiresInSec?: number;
}

/** A one-time ticket the browser uses to upload bytes straight to storage. */
export interface UploadTicket {
  /** Absolute or same-origin URL the client issues the request to. */
  uploadUrl: string;
  method: 'PUT';
  /** Headers the client must send with the upload (e.g. `content-type`). */
  headers: Record<string, string>;
}

export interface StorageProvider {
  readonly name: string;
  /** Server-side write (used for derivatives generated at commit). */
  put(input: PutObjectInput): Promise<PutObjectResult>;
  /** Read an object's bytes (e.g. the original, to generate derivatives). */
  get(key: string): Promise<Buffer>;
  /** HEAD-style lookup; `null` if the object does not exist. */
  exists(key: string): Promise<ObjectInfo | null>;
  /** Move/rename an object (tmp → final on commit). */
  move(fromKey: string, toKey: string): Promise<void>;
  delete(key: string): Promise<void>;
  /** Mint a presigned URL for a direct browser → storage upload. */
  createUploadUrl(input: CreateUploadUrlInput): Promise<UploadTicket>;
  /** Public URL for an already-stored key. */
  getPublicUrl(key: string): string;
  /** Inverse of `getPublicUrl`: recover the storage key from a public URL. */
  keyFromUrl(url: string): string;
}
