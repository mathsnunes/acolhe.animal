import { z } from 'zod';

/**
 * Instagram art formats. Mirrors the `instagram_art_type` DB enum and the two
 * canvas sizes the renderer supports. Isomorphic so the web layer, domain and
 * the integrations renderer all speak the same union.
 */
export const INSTAGRAM_ART_TYPES = ['feed-square', 'story-vertical'] as const;
export type InstagramArtType = (typeof INSTAGRAM_ART_TYPES)[number];

/** Input accepted by the generate-art Server Action / domain function. */
export const generateInstagramArtSchema = z.object({
  animalId: z.string().min(1),
  type: z.enum(INSTAGRAM_ART_TYPES),
  /** Which gallery photo to feature — validated server-side against the animal. */
  photoId: z.string().min(1),
});

export type GenerateInstagramArtInput = z.infer<typeof generateInstagramArtSchema>;
