'use server';

import { headers } from 'next/headers';

import { db } from '@acolhe-animal/db';
import { acceptInvite } from '@acolhe-animal/domain';

import { action } from '@/lib/action';
import { auth } from '@/lib/auth';
import { requireUserId } from '@/lib/auth-context';

/**
 * Existing user: they just signed in (client-side) with the invited phone. Link
 * the membership for the current session.
 */
export const joinInviteAction = async (token: string) =>
  action(async () => {
    const userId = await requireUserId();
    await acceptInvite(db, { token, userId });
    return { ok: true };
  });

/**
 * New user: phone OTP has been verified (creating the session). Set their
 * password, finalize their name, and link the membership.
 */
export const finalizeInviteAction = async (input: { token: string; name: string; password: string }) =>
  action(async () => {
    const userId = await requireUserId();
    await auth.api.setPassword({ headers: await headers(), body: { newPassword: input.password } });
    await acceptInvite(db, { token: input.token, userId, name: input.name });
    return { ok: true };
  });
