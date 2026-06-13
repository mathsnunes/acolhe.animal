import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { db } from '@acolhe-animal/db';
import {
  listActiveMembershipsForUser,
  resolveActiveMembership,
  type Ctx,
} from '@acolhe-animal/domain';
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
const DEV_FALLBACK = { userId: 'user_matheus000000000', organizationId: 'org_angelifelice00000' };

export async function getOptionalSession() {
  try {
    return await auth.api.getSession({ headers: await headers() });
  } catch {
    return null;
  }
}

export async function getCurrentCtx(): Promise<Ctx | null> {
  const session = await getOptionalSession();
  if (session?.user) {
    const memberships = await listActiveMembershipsForUser(db, session.user.id);
    const membership = memberships[0];
    if (membership) {
      return {
        db,
        organizationId: membership.organization.id,
        actor: { type: 'user', userId: session.user.id, role: membership.role },
      };
    }
  }

  if (serverEnv().NODE_ENV === 'development') {
    const membership = await resolveActiveMembership(
      db,
      DEV_FALLBACK.userId,
      DEV_FALLBACK.organizationId,
    );
    if (membership) {
      return {
        db,
        organizationId: DEV_FALLBACK.organizationId,
        actor: { type: 'user', userId: DEV_FALLBACK.userId, role: membership.role },
      };
    }
  }

  return null;
}

/** Server-component guard: returns a Ctx or redirects to /login. */
export async function requireCtx(): Promise<Ctx> {
  const ctx = await getCurrentCtx();
  if (!ctx) redirect('/entrar');
  return ctx;
}

/** Build a public (no-login) Ctx for the portal + adoption form. */
export function publicCtx(organizationId: string): Ctx {
  return { db, organizationId, actor: { type: 'public' } };
}
