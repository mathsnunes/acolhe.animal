import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, normalize } from 'node:path';

import { NextResponse } from 'next/server';

/**
 * Mock-storage endpoint (dev only). `GET` serves files written under
 * `.local-storage/`; `PUT` accepts a direct browser upload and writes the body to
 * disk — mirroring the presigned-URL flow R2 uses in production, where this route
 * doesn't exist (objects are served straight from R2's public URL).
 */

const resolvePath = (segments: string[]): string => {
  const safe = normalize(segments.join('/')).replace(/^(\.\.(\/|\\|$))+/, '');
  return join(process.cwd(), '.local-storage', safe);
};

export const GET = async (_req: Request, { params }: { params: Promise<{ path: string[] }> }) => {
  const { path } = await params;
  const filePath = resolvePath(path);

  try {
    const file = await readFile(filePath);
    return new NextResponse(new Uint8Array(file), {
      headers: { 'content-type': guessContentType(filePath), 'cache-control': 'public, max-age=3600' },
    });
  } catch {
    return new NextResponse('Not found', { status: 404 });
  }
};

export const PUT = async (req: Request, { params }: { params: Promise<{ path: string[] }> }) => {
  const { path } = await params;
  const filePath = resolvePath(path);

  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, Buffer.from(await req.arrayBuffer()));
  return new NextResponse(null, { status: 204 });
};

const guessContentType = (path: string): string => {
  if (path.endsWith('.png')) return 'image/png';
  if (path.endsWith('.jpg') || path.endsWith('.jpeg')) return 'image/jpeg';
  if (path.endsWith('.webp')) return 'image/webp';
  if (path.endsWith('.mp4')) return 'video/mp4';
  if (path.endsWith('.mov')) return 'video/quicktime';
  if (path.endsWith('.html')) return 'text/html; charset=utf-8';
  return 'application/octet-stream';
};
