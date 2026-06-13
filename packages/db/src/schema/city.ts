import { boolean, char, index, numeric, pgTable, text } from 'drizzle-orm/pg-core';

import { brRegion } from './enums';

/**
 * Global IBGE city catalog. Not multi-tenant — seeded once. The PK is the 7-digit
 * IBGE municipality code stored as text (preserves leading zeros). See
 * `modelagem-dados.md` › City.
 */
export const city = pgTable(
  'city',
  {
    /** IBGE municipality code, e.g. "4204608" (Criciúma). */
    id: text().primaryKey(),
    name: text().notNull(),
    /** Accent-free, lowercased — powers autocomplete and search. */
    normalizedName: text().notNull(),
    stateCode: char({ length: 2 }).notNull(),
    stateName: text().notNull(),
    region: brRegion().notNull(),
    microregion: text(),
    mesoregion: text(),
    metroArea: text(),
    latitude: numeric({ precision: 10, scale: 7 }).notNull(),
    longitude: numeric({ precision: 10, scale: 7 }).notNull(),
    isCapital: boolean().notNull().default(false),
  },
  (t) => [
    index('city_normalized_name_idx').on(t.normalizedName),
    index('city_state_normalized_idx').on(t.stateCode, t.normalizedName),
    index('city_state_idx').on(t.stateCode),
  ],
);
