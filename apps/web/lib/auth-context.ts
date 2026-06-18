import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { db } from '@acolhe-animal/db';
import { listActiveMembershipsForUser, type Ctx, type MembershipContext } from '@acolhe-animal/domain';

import { auth } from './auth';

/**
 * Resolves the authenticated request into a domain {@link Ctx} (db + tenant +
 * actor). The web layer is the *only* place that reads a session; everything
 * downstream receives a Ctx. There is no dev shortcut — a real login is always
 * required (dev login: +55 48 99999-0000 / acolhe123).
 */

/** Cookie holding the user's chosen active org (public id). Set by the org switcher. */
export const ACTIVE_ORG_COOKIE = 'acolhe_active_org';

export const getOptionalSession = async () => {
  try {
    return await auth.api.getSession({ headers: await headers() });
  } catch {
    return null;
  }
};

/**
 * The user's active memberships plus which org is currently active (cookie-driven,
 * validated against the user's own memberships). Powers the org switcher.
 */
export const getCurrentUserMemberships = async (): Promise<{ memberships: MembershipContext[]; activeOrgId: string | null }> => {
  const session = await getOptionalSession();
  const userId = session?.user?.id;
  if (!userId) return { memberships: [], activeOrgId: null };

  const memberships = await listActiveMembershipsForUser(db, userId);
  const cookieOrgId = (await cookies()).get(ACTIVE_ORG_COOKIE)?.value ?? null;
  const active = cookieOrgId && memberships.some((m) => m.organization.id === cookieOrgId) ? cookieOrgId : null;
  return { memberships, activeOrgId: active ?? memberships[0]?.organization.id ?? null };
};

export const getCurrentCtx = async (): Promise<Ctx | null> => {
  const session = await getOptionalSession();
  const userId = session?.user?.id;
  if (!userId) return null;

  // Active membership carries the org and its surrogate key (`pk`), the tenant
  // scope every domain query filters on. The cookie selects which org is active
  // (only honored when it's one the user actually belongs to).
  const memberships = await listActiveMembershipsForUser(db, userId);
  if (memberships.length === 0) return null;

  const cookieOrgId = (await cookies()).get(ACTIVE_ORG_COOKIE)?.value;
  const membership = (cookieOrgId ? memberships.find((m) => m.organization.id === cookieOrgId) : undefined) ?? memberships[0]!;

  return {
    db,
    organizationId: membership.organization.pk,
    actor: { type: 'user', userId, role: membership.role },
  };
};

/**
 * Resolve just the authenticated user id, without requiring an active org
 * membership. Used by onboarding actions (finalize signup, accept invite) that
 * run *before* the user has a resolvable tenant. Throws when unauthenticated.
 */
export const requireUserId = async (): Promise<string> => {
  const session = await getOptionalSession();
  const userId = session?.user?.id;
  if (!userId) throw new Error('Sessão não encontrada. Faça login novamente.');
  return userId;
};

/** Server-component guard: returns a Ctx or redirects to /login. */
export const requireCtx = async (): Promise<Ctx> => {
  const ctx = await getCurrentCtx();
  if (!ctx) redirect('/entrar');
  return ctx;
};

/** Build a public (no-login) Ctx for the portal + adoption form. */
export const publicCtx = (organizationId: number): Ctx => ({ db, organizationId, actor: { type: 'public' } });
