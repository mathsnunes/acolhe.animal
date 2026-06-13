import type { DbExecutor } from '@acolhe-animal/db';

/**
 * Who is performing an operation. Drives permission checks and audit/timeline
 * actor attribution.
 *  - `user`   — an authenticated org member (admin/volunteer)
 *  - `public` — the public adoption form (no login)
 *  - `system` — background jobs, webhooks
 */
export type Actor =
  | { type: 'user'; userId: string; role: 'admin' | 'volunteer' }
  | { type: 'public' }
  | { type: 'system'; source: string };

/**
 * The context every domain function receives. It carries the db handle (or a
 * transaction), the tenant scope, and the actor. Multi-tenancy is enforced by
 * always filtering on `ctx.organizationId` — never trusting an id from the client.
 *
 * The web layer builds this from the session + resolved membership and passes it
 * down; domain functions never read a session or `process.env` themselves.
 */
export interface Ctx {
  db: DbExecutor;
  organizationId: string;
  actor: Actor;
}

/** Run a function within a transaction, threading a tx-scoped Ctx. */
export async function withTransaction<T>(
  ctx: Ctx,
  fn: (txCtx: Ctx) => Promise<T>,
): Promise<T> {
  // If we're already inside a tx, reuse it; otherwise open one.
  const exec = ctx.db;
  if ('transaction' in exec && typeof exec.transaction === 'function') {
    return exec.transaction((tx) => fn({ ...ctx, db: tx }));
  }
  return fn(ctx);
}
