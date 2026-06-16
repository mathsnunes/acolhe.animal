import { and, eq, gt, isNull, sql } from 'drizzle-orm';

import { ConflictError, createId, ForbiddenError } from '@acolhe-animal/shared';
import type { Database, Organization, OrganizationInvite } from '@acolhe-animal/db';
import { organization, organizationInvite, organizationMember, user } from '@acolhe-animal/db';

import { setUserProfile } from '../users/service';

/**
 * Invite acceptance: a person opens `acolhe.animal/convite/[token]` and joins an
 * existing org. Like the other onboarding operations this takes the raw `db` (no
 * tenant Ctx — the joining user has no membership yet). The invited *phone* is
 * the anchor: a valid invite + a session on that phone proves the person.
 */

export interface InviteDetails {
  invite: OrganizationInvite;
  organization: Organization;
}

/** A pending, non-expired invite joined to its org — for the accept screen. */
export const getActiveInviteByToken = async (db: Database, token: string): Promise<InviteDetails | null> => {
  const [row] = await db
    .select({ invite: organizationInvite, org: organization })
    .from(organizationInvite)
    .innerJoin(organization, eq(organizationInvite.organizationId, organization.pk))
    .where(
      and(
        eq(organizationInvite.token, token),
        eq(organizationInvite.status, 'pending'),
        gt(organizationInvite.expiresAt, sql`now()`),
      ),
    )
    .limit(1);
  return row ? { invite: row.invite, organization: row.org } : null;
};

/**
 * Accept an invite for an authenticated user. Validates that the user's phone
 * matches the invited phone, links the membership with the invite's role
 * (idempotent if already a member), optionally finalizes the new user's name,
 * and marks the invite accepted. Runs in one transaction.
 */
export const acceptInvite = async (
  db: Database,
  params: { token: string; userId: string; name?: string },
): Promise<{ organizationId: number }> => {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .select({ invite: organizationInvite, orgPk: organization.pk })
      .from(organizationInvite)
      .innerJoin(organization, eq(organizationInvite.organizationId, organization.pk))
      .where(
        and(
          eq(organizationInvite.token, params.token),
          eq(organizationInvite.status, 'pending'),
          gt(organizationInvite.expiresAt, sql`now()`),
        ),
      )
      .limit(1);
    if (!row) throw new ConflictError('Convite inválido ou expirado.');

    const [account] = await tx
      .select({ phoneNumber: user.phoneNumber, name: user.name })
      .from(user)
      .where(eq(user.id, params.userId))
      .limit(1);
    if (!account) throw new ForbiddenError('Conta não encontrada.');
    if (account.phoneNumber !== row.invite.phoneNumber) {
      throw new ForbiddenError('Este convite é para outro número de telefone.');
    }

    if (params.name && !account.name) {
      await setUserProfile(tx, params.userId, { name: params.name });
    }

    // Link the membership unless one is already active (idempotent re-accept).
    const [active] = await tx
      .select({ pk: organizationMember.pk })
      .from(organizationMember)
      .where(
        and(
          eq(organizationMember.userId, params.userId),
          eq(organizationMember.organizationId, row.orgPk),
          isNull(organizationMember.removedAt),
        ),
      )
      .limit(1);

    if (!active) {
      await tx.insert(organizationMember).values({
        id: createId('organizationMember'),
        userId: params.userId,
        organizationId: row.orgPk,
        role: row.invite.role,
        invitedByUserId: row.invite.invitedByUserId,
      });
    }

    await tx
      .update(organizationInvite)
      .set({ status: 'accepted', acceptedAt: new Date(), acceptedByUserId: params.userId })
      .where(eq(organizationInvite.pk, row.invite.pk));

    return { organizationId: row.orgPk };
  });
};
