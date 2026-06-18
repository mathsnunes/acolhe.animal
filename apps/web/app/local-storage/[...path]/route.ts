import { mkdir, open, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, join, normalize } from 'node:path';

import { NextResponse } from 'next/server';

/**
 * Mock-storage endpoint (dev only). `GET` serves files written under
 * `.local-storage/`; `PUT` accepts a direct browser upload and writes the body to
 * disk — mirroring the presigned-URL flow R2 uses in production, where this route
 * doesn't exist (objects are served straight from R2's public URL).
 *
 * `GET` honors HTTP Range requests (206 Partial Content). This matters for video:
 * iOS Safari sends a `Range` probe and refuses to play unless the server answers
 * with `Accept-Ranges`/`206` — desktop Chrome tolerates a plain `200`, iOS doesn't.
 */

const resolvePath = (segments: string[]): string => {
  const safe = normalize(segments.join('/')).replace(/^(\.\.(\/|\\|$))+/, '');
  return join(process.cwd(), '.local-storage', safe);
};

export const GET = async (req: Request, { params }: { params: Promise<{ path: string[] }> }) => {
  const { path } = await params;
  const filePath = resolvePath(path);

  let size: number;
  try {
    size = (await stat(filePath)).size;
  } catch {
    return new NextResponse('Not found', { status: 404 });
  }

  const contentType = guessContentType(filePath);
  const baseHeaders = {
    'content-type': contentType,
    'accept-ranges': 'bytes',
    'cache-control': 'public, max-age=3600',
  };

  const rangeHeader = req.headers.get('range');
  const range = rangeHeader ? parseRange(rangeHeader, size) : null;

  if (range === 'invalid') {
    return new NextResponse('Range Not Satisfiable', {
      status: 416,
      headers: { 'accept-ranges': 'bytes', 'content-range': `bytes */${size}` },
    });
  }

  // Ranged read — slice only the requested bytes off disk.
  if (range) {
    const chunkSize = range.end - range.start + 1;
    const handle = await open(filePath);
    try {
      const buffer = Buffer.alloc(chunkSize);
      await handle.read(buffer, 0, chunkSize, range.start);
      return new NextResponse(new Uint8Array(buffer), {
        status: 206,
        headers: {
          ...baseHeaders,
          'content-length': String(chunkSize),
          'content-range': `bytes ${range.start}-${range.end}/${size}`,
        },
      });
    } finally {
      await handle.close();
    }
  }

  const file = await readFile(filePath);
  return new NextResponse(new Uint8Array(file), {
    headers: { ...baseHeaders, 'content-length': String(size) },
  });
};

/** Parse a single-range `bytes=start-end` header against the file size. */
const parseRange = (
  header: string,
  size: number,
): { start: number; end: number } | 'invalid' | null => {
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match) return null; // unsupported syntax → fall back to a full response
  const [, startStr, endStr] = match;

  let start: number;
  let end: number;
  if (startStr === '') {
    // suffix range: last N bytes
    const suffix = Number(endStr);
    if (!endStr || Number.isNaN(suffix)) return 'invalid';
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = Number(startStr);
    end = endStr === '' ? size - 1 : Math.min(Number(endStr), size - 1);
  }

  if (Number.isNaN(start) || Number.isNaN(end) || start > end || start >= size) return 'invalid';
  return { start, end };
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
  if (path.endsWith('.pdf')) return 'application/pdf';
  return 'application/octet-stream';
};
