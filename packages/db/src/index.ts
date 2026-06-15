/**
 * @acolhe-animal/db — Drizzle client, schema and inferred row types.
 *
 * Server-only (opens a Postgres pool). Consumers:
 *   import { db, animal, eq } from '@acolhe-animal/db'  // tables re-exported here
 *   import type { Animal } from '@acolhe-animal/db'
 */
export * from './client';
export * from './schema';
export * from './types';
