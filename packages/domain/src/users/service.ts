import { eq } from 'drizzle-orm';

import type { Database, DbExecutor } from '@acolhe-animal/db';
import { user } from '@acolhe-animal/db';

/**
 * User lookups and profile writes used by the onboarding flows (signup, invite).
 *
 * Like `organizations/service.ts`, these take the raw `db` rather than a `Ctx`:
 * they run *before* a tenant-scoped Ctx exists (the user has just verified their
 * phone and has no resolvable active org yet). The web layer calls them from thin
 * server actions after better-auth has authenticated the request.
 */

export interface UserContact {
  id: string;
  email: string | null;
}

/** Resolve a user by their E.164 phone number (the primary identifier). */
export const getUserByPhone = async (db: Database, phoneNumber: string): Promise<UserContact | null> => {
  const [row] = await db
    .select({ id: user.id, email: user.email })
    .from(user)
    .where(eq(user.phoneNumber, phoneNumber))
    .limit(1);
  return row ?? null;
};

/**
 * Set the user's display name (and optional email) right after phone
 * verification. This is account creation — the phone is already verified — so we
 * write directly instead of going through better-auth's email-change flow. The
 * email is stored unverified.
 */
export const setUserProfile = async (
  db: DbExecutor,
  userId: string,
  profile: { name: string; email?: string | null },
): Promise<void> => {
  const patch: { name: string; email?: string } = { name: profile.name };
  if (profile.email) patch.email = profile.email;
  await db.update(user).set(patch).where(eq(user.id, userId));
};
