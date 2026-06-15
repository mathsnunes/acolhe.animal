import { and, eq, isNull } from 'drizzle-orm';

import type { Database, Organization } from '@acolhe-animal/db';
import { organization, organizationMember } from '@acolhe-animal/db';

/**
 * Organization + membership resolution.
 *
 * These take the raw `db` (not a `Ctx`) because they're used to *build* the Ctx:
 * the web layer resolves the user's active membership here, then constructs the
 * tenant-scoped Ctx passed to every other domain function.
 */

export const getOrganizationBySlug = async (db: Database, slug: string): Promise<Organization | null> => {
  const [row] = await db.select().from(organization).where(eq(organization.slug, slug)).limit(1);
  return row ?? null;
};

export const getOrganizationById = async (db: Database, id: string): Promise<Organization | null> => {
  const [row] = await db.select().from(organization).where(eq(organization.id, id)).limit(1);
  return row ?? null;
};

/** Resolve an organization by its internal surrogate key (`ctx.organizationId`). */
export const getOrganizationByPk = async (db: Database, pk: number): Promise<Organization | null> => {
  const [row] = await db.select().from(organization).where(eq(organization.pk, pk)).limit(1);
  return row ?? null;
};

export interface MembershipContext {
  organization: Organization;
  role: 'admin' | 'volunteer';
}

/** The user's active membership in a specific org, or null. */
export const resolveActiveMembership = async (db: Database, userId: string, organizationId: number): Promise<MembershipContext | null> => {
  const [row] = await db
    .select({ role: organizationMember.role, org: organization })
    .from(organizationMember)
    .innerJoin(organization, eq(organizationMember.organizationId, organization.pk))
    .where(
      and(
        eq(organizationMember.userId, userId),
        eq(organizationMember.organizationId, organizationId),
        isNull(organizationMember.removedAt),
      ),
    )
    .limit(1);
  return row ? { organization: row.org, role: row.role } : null;
};

/** All orgs the user is an active member of — for the org switcher / default org. */
export const listActiveMembershipsForUser = async (db: Database, userId: string): Promise<MembershipContext[]> => {
  const rows = await db
    .select({ role: organizationMember.role, org: organization })
    .from(organizationMember)
    .innerJoin(organization, eq(organizationMember.organizationId, organization.pk))
    .where(and(eq(organizationMember.userId, userId), isNull(organizationMember.removedAt)));
  return rows.map((r) => ({ organization: r.org, role: r.role }));
};
