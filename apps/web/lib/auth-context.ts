import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { db } from '@acolhe-animal/db';
import { listActiveMembershipsForUser, type Ctx } from '@acolhe-animal/domain';
import { serverEnv } from '@acolhe-animal/shared/env';

import { auth } from './auth';

/**
 * Resolves the authenticated request into a domain {@link Ctx} (db + tenant +
 * actor). The web layer is the *only* place that reads a session; everything
 * downstream receives a Ctx.
 *
 * Dev shortcut: when there's no session in development, we fall back to the
 * seeded admin so the whole admin surface is demoable without completing the
 * login flow. This NEVER applies in production.
 */
const DEV_FALLBACK_USER_ID = 'user_matheus000000000';

export const getOptionalSession = async () => {
  try {
    return await auth.api.getSession({ headers: await headers() });
  } catch {
    return null;
  }
};

export const getCurrentCtx = async (): Promise<Ctx | null> => {
  const session = await getOptionalSession();
  const userId =
    session?.user?.id ??
    (serverEnv().NODE_ENV === 'development' ? DEV_FALLBACK_USER_ID : null);
  if (!userId) return null;

  // The active membership carries the org and the org's surrogate key (`pk`),
  // which becomes the tenant scope every domain query filters on.
  const memberships = await listActiveMembershipsForUser(db, userId);
  const membership = memberships[0];
  if (!membership) return null;

  return {
    db,
    organizationId: membership.organization.pk,
    actor: { type: 'user', userId, role: membership.role },
  };
};

/** Server-component guard: returns a Ctx or redirects to /login. */
export const requireCtx = async (): Promise<Ctx> => {
  const ctx = await getCurrentCtx();
  if (!ctx) redirect('/entrar');
  return ctx;
};

/** Build a public (no-login) Ctx for the portal + adoption form. */
export const publicCtx = (organizationId: number): Ctx => ({ db, organizationId, actor: { type: 'public' } });
