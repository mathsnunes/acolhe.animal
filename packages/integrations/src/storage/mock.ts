import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { serverEnv } from '@acolhe-animal/shared/env';

import type { PutObjectInput, PutObjectResult, StorageProvider } from './types';

/**
 * Local-disk storage mock. Writes objects under `<cwd>/.local-storage/<key>` and
 * returns a URL under `R2_PUBLIC_URL` (default `/local-storage`, served by a Next
 * route handler in dev). Uploaded images are real and viewable — no S3 needed.
 */
export class MockStorageProvider implements StorageProvider {
  readonly name = 'mock-storage';
  private readonly baseDir = join(process.cwd(), '.local-storage');

  async put(input: PutObjectInput): Promise<PutObjectResult> {
    const filePath = join(this.baseDir, input.key);
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, input.body);
    return { key: input.key, url: this.getPublicUrl(input.key) };
  }

  async delete(key: string): Promise<void> {
    await rm(join(this.baseDir, key), { force: true });
  }

  getPublicUrl(key: string): string {
    const base = serverEnv().R2_PUBLIC_URL.replace(/\/$/, '');
    return `${base}/${key}`;
  }
}
