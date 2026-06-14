import { bigint } from 'drizzle-orm/pg-core';

/**
 * Hybrid identity helpers.
 *
 * Every domain entity carries TWO identifiers:
 *  - `pk` — an internal `bigint` surrogate (`generated always as identity`). It's
 *           the real PRIMARY KEY and what every foreign key references: cheap
 *           integer joins + sequential B-tree locality. NEVER exposed to clients.
 *  - `id` — the public, app-generated prefixed string (`animal_…`, via
 *           `createId`). A unique business key; what URLs and the API speak.
 *           Declared per table as `id: text().notNull().unique()`.
 *
 * This is the "hybrid" model: opaque, non-enumerable public ids on the outside,
 * fast surrogate keys on the inside. See `docs/conventions.md` › "IDs".
 */

/** Internal surrogate primary key (bigint identity). */
export const surrogatePk = () => bigint({ mode: 'number' }).generatedAlwaysAsIdentity().primaryKey();

/** A foreign key column pointing at another entity's surrogate `pk`. */
export const fk = () => bigint({ mode: 'number' });
