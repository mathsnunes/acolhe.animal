import { asc, eq, ilike, inArray, sql } from 'drizzle-orm';

import { normalizeForSearch } from '@acolhe-animal/shared';
import type { Database } from '@acolhe-animal/db';
import { city } from '@acolhe-animal/db';

/**
 * City autocomplete for the org signup form. Searches the global IBGE catalog by
 * `normalizedName` (accent-free, lowercased), prioritizing prefix matches so that
 * typing "cri" surfaces "Criciúma" before "Santa Cruz". Not tenant-scoped — the
 * city catalog is global.
 */

export interface CitySuggestion {
  id: string;
  name: string;
  stateCode: string;
}

export const searchCities = async (db: Database, query: string, limit = 10): Promise<CitySuggestion[]> => {
  // Same normalization the catalog was seeded with — keeps the match deterministic.
  const q = normalizeForSearch(query);
  if (q.length < 1) return [];

  const rows = await db
    .select({ id: city.id, name: city.name, stateCode: city.stateCode })
    .from(city)
    .where(ilike(city.normalizedName, `%${q}%`))
    // Prefix matches first, then alphabetical.
    .orderBy(sql`(${city.normalizedName} like ${`${q}%`}) desc`, asc(city.name))
    .limit(limit);

  return rows;
};

/** Resolve a single city by its IBGE id — used to validate a selected suggestion. */
export const getCityById = async (db: Database, id: string): Promise<CitySuggestion | null> => {
  const [row] = await db
    .select({ id: city.id, name: city.name, stateCode: city.stateCode })
    .from(city)
    .where(eq(city.id, id))
    .limit(1);
  return row ?? null;
};

/** Resolve many cities at once (e.g. city labels for the org switcher). */
export const getCitiesByIds = async (db: Database, ids: string[]): Promise<CitySuggestion[]> => {
  if (ids.length === 0) return [];
  return db
    .select({ id: city.id, name: city.name, stateCode: city.stateCode })
    .from(city)
    .where(inArray(city.id, ids));
};
