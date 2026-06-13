import { readFile } from 'node:fs/promises';
import { join, normalize } from 'node:path';

import { NextResponse } from 'next/server';

/**
 * Serves files written by the mock storage provider (dev only). In production,
 * objects are served directly from Cloudflare R2's public URL — this route
 * doesn't exist there.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const safe = normalize(path.join('/')).replace(/^(\.\.(\/|\\|$))+/, '');
  const filePath = join(process.cwd(), '.local-storage', safe);

  try {
    const file = await readFile(filePath);
    const contentType = guessContentType(safe);
    return new NextResponse(new Uint8Array(file), {
      headers: { 'content-type': contentType, 'cache-control': 'public, max-age=3600' },
    });
  } catch {
    return new NextResponse('Not found', { status: 404 });
  }
}

function guessContentType(path: string): string {
  if (path.endsWith('.png')) return 'image/png';
  if (path.endsWith('.jpg') || path.endsWith('.jpeg')) return 'image/jpeg';
  if (path.endsWith('.webp')) return 'image/webp';
  if (path.endsWith('.html')) return 'text/html; charset=utf-8';
  return 'application/octet-stream';
}
