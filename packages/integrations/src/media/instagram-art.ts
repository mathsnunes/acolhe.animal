import sharp from 'sharp';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import type { InstagramArtType } from '@acolhe-animal/shared';

import type { ProcessedImage } from './types';
import { FRAUNCES_600_WOFF, INTER_TIGHT_500_WOFF } from './fonts';

/**
 * Instagram art renderer — deterministic, brand-styled PNGs composed from the
 * animal's photo + the org's logo. No external service, no AI: satori turns a
 * layout into SVG (with embedded fonts), resvg rasterizes it to PNG. The caller
 * (domain) supplies copy and bytes; this module only knows about layout.
 *
 * Direction: "foto dominante" — the photo fills the frame, brand text sits over
 * a bottom scrim. Two canvases: feed 1080² and story 1080×1920.
 */

// ── Brand palette (mirrors apps/web globals.css; kept literal — this runs
// outside the web app and has no access to CSS tokens) ──────────────────────
const PAPER = '#faf8f3';
const GOLD = '#e8c879'; // lifted gold so the accent reads on a dark scrim
const SCRIM = 'rgba(18,22,18,0.86)';

interface Canvas {
  width: number;
  height: number;
  pad: number;
  scrimStop: string; // where the bottom scrim fades out (% from bottom)
  eyebrowSize: number;
  titleSize: number;
  factsSize: number;
  logoH: number;
}

const CANVAS: Record<InstagramArtType, Canvas> = {
  'feed-square': {
    width: 1080,
    height: 1080,
    pad: 72,
    scrimStop: '62%',
    eyebrowSize: 28,
    titleSize: 92,
    factsSize: 32,
    logoH: 92,
  },
  'story-vertical': {
    width: 1080,
    height: 1920,
    pad: 88,
    scrimStop: '48%',
    eyebrowSize: 30,
    titleSize: 104,
    factsSize: 34,
    logoH: 104,
  },
};

// ── Fonts: inlined as base64 in ./fonts (.woff, which satori accepts). They're
// embedded rather than read from node_modules because the bundler rewrites
// createRequire/fs at build time, breaking runtime font resolution. ──────────
const FONTS = [
  { name: 'Fraunces', data: FRAUNCES_600_WOFF, weight: 600 as const, style: 'normal' as const },
  { name: 'Inter Tight', data: INTER_TIGHT_500_WOFF, weight: 500 as const, style: 'normal' as const },
];

// ── Tiny element helpers (satori takes a React-like { type, props } tree; we
// build plain objects to avoid pulling React into this package) ─────────────
type El = { type: string; props: Record<string, unknown> };
const div = (style: Record<string, unknown>, children?: unknown): El => ({ type: 'div', props: { style, ...(children !== undefined ? { children } : {}) } });

const toDataUri = (buf: Buffer, mime: string) => `data:${mime};base64,${buf.toString('base64')}`;

export interface InstagramArtInput {
  type: InstagramArtType;
  /** Source photo bytes (any decodable image). */
  photo: Buffer;
  /** Brand mark on the art: the org name in Fraunces, top-left. */
  orgName: string;
  eyebrow: string;
  /** Headline split so the accent word renders in gold. */
  title: { lead: string; accent: string; tail: string };
  facts: string;
}

/**
 * Compose a ready-to-post PNG for the given format. Throws if the photo bytes
 * are undecodable (same contract as the other media transforms).
 */
export const renderInstagramArt = async (input: InstagramArtInput): Promise<ProcessedImage> => {
  const c = CANVAS[input.type];

  // Photo: cover the whole frame, focused on the salient region (pet faces).
  const photoPng = await sharp(input.photo, { failOn: 'error' })
    .rotate()
    .resize({ width: c.width, height: c.height, fit: 'cover', position: 'attention' })
    .jpeg({ quality: 86 })
    .toBuffer();
  const photoUri = toDataUri(photoPng, 'image/jpeg');

  // Brand mark: the org name in Fraunces, top-left.
  const brandTop = div(
    { fontFamily: 'Fraunces', fontSize: Math.round(c.logoH * 0.52), color: PAPER, textShadow: '0 2px 12px rgba(0,0,0,0.45)' },
    input.orgName,
  );

  const root = div(
    { width: c.width, height: c.height, display: 'flex', position: 'relative', fontFamily: 'Inter Tight' },
    [
      // Base photo layer
      { type: 'img', props: { src: photoUri, width: c.width, height: c.height, style: { position: 'absolute', top: 0, left: 0, objectFit: 'cover' } } },
      // Bottom scrim for legibility
      div({ position: 'absolute', top: 0, left: 0, width: c.width, height: c.height, backgroundImage: `linear-gradient(to top, ${SCRIM} 0%, rgba(18,22,18,0.34) ${c.scrimStop}, rgba(18,22,18,0) 78%)` }),
      // Logo / org name, top-left
      div({ position: 'absolute', top: c.pad, left: c.pad, display: 'flex' }, brandTop),
      // Bottom content block
      div(
        { position: 'absolute', left: c.pad, right: c.pad, bottom: c.pad, display: 'flex', flexDirection: 'column' },
        [
          div({ fontSize: c.eyebrowSize, letterSpacing: 4, color: GOLD, marginBottom: 18, textTransform: 'uppercase' }, input.eyebrow),
          div(
            { display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', fontFamily: 'Fraunces', fontSize: c.titleSize, lineHeight: 1.04, color: PAPER },
            [
              input.title.lead,
              { type: 'span', props: { style: { color: GOLD, marginLeft: 14, marginRight: 14 }, children: input.title.accent } },
              input.title.tail,
            ],
          ),
          ...(input.facts
            ? [div({ marginTop: 22, fontSize: c.factsSize, color: 'rgba(250,248,243,0.86)' }, input.facts)]
            : []),
        ],
      ),
    ],
  );

  const svg = await satori(root as unknown as Parameters<typeof satori>[0], {
    width: c.width,
    height: c.height,
    fonts: FONTS,
  });

  const png = new Resvg(svg, { fitTo: { mode: 'width', value: c.width } }).render().asPng();
  return { body: png, contentType: 'image/png', width: c.width, height: c.height };
};
