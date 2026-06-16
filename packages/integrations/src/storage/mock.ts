import { mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import type {
  CreateUploadUrlInput,
  ObjectInfo,
  PutObjectInput,
  PutObjectResult,
  StorageProvider,
  UploadTicket,
} from './types';

/**
 * Local-disk storage mock. Writes objects under `<cwd>/.local-storage/<key>` and
 * returns origin-relative `/local-storage/<key>` URLs, served by a Next route
 * handler in dev. Direct uploads `PUT` to that same URL — the route writes the
 * body to disk — so the mock mirrors the presigned-URL flow R2 uses in prod.
 * Uploaded files are real and viewable — no S3 needed.
 */
export class MockStorageProvider implements StorageProvider {
  readonly name = 'mock-storage';
  private readonly baseDir = join(process.cwd(), '.local-storage');

  private path(key: string): string {
    return join(this.baseDir, key);
  }

  async put(input: PutObjectInput): Promise<PutObjectResult> {
    const filePath = this.path(input.key);
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, input.body);
    return { key: input.key, url: this.getPublicUrl(input.key) };
  }

  async get(key: string): Promise<Buffer> {
    return readFile(this.path(key));
  }

  async exists(key: string): Promise<ObjectInfo | null> {
    try {
      const info = await stat(this.path(key));
      return { size: info.size, contentType: guessContentType(key) };
    } catch {
      return null;
    }
  }

  async move(fromKey: string, toKey: string): Promise<void> {
    const to = this.path(toKey);
    await mkdir(dirname(to), { recursive: true });
    await rename(this.path(fromKey), to);
  }

  async delete(key: string): Promise<void> {
    await rm(this.path(key), { force: true });
  }

  createUploadUrl(input: CreateUploadUrlInput): Promise<UploadTicket> {
    // The client PUTs straight to the public URL; the local-storage route handler
    // writes the body to disk. No real signing needed offline.
    return Promise.resolve({
      uploadUrl: this.getPublicUrl(input.key),
      method: 'PUT',
      headers: { 'content-type': input.contentType },
    });
  }

  getPublicUrl(key: string): string {
    // The mock is dev-only and served by the `/local-storage` route at the
    // CURRENT origin. Always return an ORIGIN-RELATIVE URL so uploads and images
    // work on localhost, a dev tunnel, or the LAN IP with no env changes —
    // immune to a stray `.env.local` setting an absolute localhost base.
    // (`R2_PUBLIC_URL` is the absolute public domain used by the live R2 adapter.)
    return `/local-storage/${key}`;
  }
}

const guessContentType = (key: string): string => {
  if (key.endsWith('.png')) return 'image/png';
  if (key.endsWith('.jpg') || key.endsWith('.jpeg')) return 'image/jpeg';
  if (key.endsWith('.webp')) return 'image/webp';
  if (key.endsWith('.mp4')) return 'video/mp4';
  if (key.endsWith('.mov')) return 'video/quicktime';
  if (key.endsWith('.pdf')) return 'application/pdf';
  if (key.endsWith('.html')) return 'text/html; charset=utf-8';
  return 'application/octet-stream';
};
