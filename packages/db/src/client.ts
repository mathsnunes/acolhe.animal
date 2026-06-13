import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import { serverEnv } from '@acolhe-animal/shared/env';

import * as schema from './schema';

/**
 * Drizzle client over a node-postgres Pool.
 *
 * Works against any Postgres (local Docker in dev, Neon in prod — Neon speaks the
 * standard wire protocol). A single Pool is memoized on `globalThis` so Next.js
 * HMR / serverless module reloads don't open a new pool each time.
 *
 * `casing: 'snake_case'` makes Drizzle map camelCase schema keys to snake_case
 * columns at runtime — the same convention the schema files rely on.
 */
const globalForDb = globalThis as unknown as { __acolheAnimalPool?: Pool };

function getPool(): Pool {
  if (!globalForDb.__acolheAnimalPool) {
    globalForDb.__acolheAnimalPool = new Pool({
      connectionString: serverEnv().DATABASE_URL,
    });
  }
  return globalForDb.__acolheAnimalPool;
}

export const db = drizzle(getPool(), { schema, casing: 'snake_case' });

export type Database = typeof db;
/** A transaction handle, for functions that accept either `db` or a tx. */
export type DbExecutor = Database | Parameters<Parameters<Database['transaction']>[0]>[0];

export { schema };
