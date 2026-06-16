import sharp from 'sharp';

import type { ImageDerivatives, ProcessedImage } from './types';

/**
 * Image derivatives generated at commit (see `docs/uploads.md`). Output is WebP
 * for size; both fit *inside* the target box without enlarging smaller sources.
 */
const THUMB_WIDTH = 400;
const MEDIUM_WIDTH = 1200;
const WEBP_QUALITY = 80;

const toWebp = async (input: Buffer, width: number): Promise<ProcessedImage> => {
  const pipeline = sharp(input, { failOn: 'error' })
    .rotate() // honour EXIF orientation before stripping metadata
    .resize({ width, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY });

  const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });
  return { body: data, contentType: 'image/webp', width: info.width, height: info.height };
};

/**
 * Decode + validate an uploaded image and produce thumb/medium derivatives.
 * Throws if the bytes are not a decodable image — used as the commit-time
 * validation that the upload is genuinely the declared media.
 */
export const processImage = async (input: Buffer): Promise<ImageDerivatives> => {
  const [thumb, medium] = await Promise.all([toWebp(input, THUMB_WIDTH), toWebp(input, MEDIUM_WIDTH)]);
  return { thumb, medium };
};

/**
 * Org logo: a single PNG, resized to fit inside a box (no enlarging), keeping the
 * aspect ratio and transparency. PNG (not WebP) so it embeds in the adoption-term
 * PDF too (pdf-lib supports PNG/JPG, not WebP). Throws on undecodable bytes.
 */
const LOGO_MAX = 512;

export const processLogo = async (input: Buffer): Promise<ProcessedImage> => {
  const pipeline = sharp(input, { failOn: 'error' })
    .rotate()
    .resize({ width: LOGO_MAX, height: LOGO_MAX, fit: 'inside', withoutEnlargement: true })
    .png();
  const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });
  return { body: data, contentType: 'image/png', width: info.width, height: info.height };
};
