'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { ACTIVE_ORG_COOKIE, getCurrentUserMemberships } from '@/lib/auth-context';

/**
 * Switch the active organization. Validates the target org is one the caller is
 * actually a member of, persists the choice in a cookie, and reloads the shell.
 */
export const setActiveOrgAction = async (orgId: string): Promise<void> => {
  const { memberships } = await getCurrentUserMemberships();
  if (!memberships.some((m) => m.organization.id === orgId)) return;

  (await cookies()).set(ACTIVE_ORG_COOKIE, orgId, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  });
  revalidatePath('/', 'layout');
  redirect('/inicio');
};
