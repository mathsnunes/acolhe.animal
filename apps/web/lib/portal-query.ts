import type { Animal } from '@acolhe-animal/db';

/**
 * Shared page/item shapes for the public portal listing. Kept in a neutral module
 * (no `server-only`) so the client grid can import the types + page size while the
 * server loaders in `app/[slug]/data.ts` produce them.
 */

export interface PortalAnimalItem {
  animal: Animal;
  photoUrl: string | null;
}

export interface PortalAnimalsPage {
  items: PortalAnimalItem[];
  nextOffset: number;
  hasMore: boolean;
}

/** Cards fetched per page on the public portal (3-up grid → multiple of 3). */
export const PORTAL_PAGE_SIZE = 12;
