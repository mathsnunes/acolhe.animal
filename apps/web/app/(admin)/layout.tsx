import { eq, inArray } from 'drizzle-orm';
import { getTranslations } from 'next-intl/server';

import { city, db, user as userTable } from '@acolhe-animal/db';
import { getOrganizationByPk, listAnimals, listApplications } from '@acolhe-animal/domain';

import { AdminShell } from '@/components/nav/admin-shell';
import { getCurrentUserMemberships, requireCtx } from '@/lib/auth-context';

/**
 * Admin shell layout. Resolves the tenant Ctx, loads the org + sidebar counts +
 * the user's other orgs (for the switcher), and wraps every admin route in the
 * navigation chrome.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireCtx();
  const org = await getOrganizationByPk(db, ctx.organizationId);
  if (!org) throw new Error('Organização não encontrada.');

  const { memberships, activeOrgId } = await getCurrentUserMemberships();

  // City labels for every org the user belongs to (one query), reused for both
  // the active org header and the switcher entries.
  const cityIds = [...new Set(memberships.map((m) => m.organization.cityId).filter((id): id is string => !!id))];
  const cityRows = cityIds.length
    ? await db.select({ id: city.id, name: city.name, uf: city.stateCode }).from(city).where(inArray(city.id, cityIds))
    : [];
  const cityLabelById = new Map(cityRows.map((c) => [c.id, `${c.name}, ${c.uf}`]));
  const cityLabelFor = (cityId: string | null) => (cityId ? cityLabelById.get(cityId) : undefined);

  const [animals, applications, currentUser] = await Promise.all([
    listAnimals(ctx),
    listApplications(ctx),
    ctx.actor.type === 'user'
      ? db.select({ name: userTable.name }).from(userTable).where(eq(userTable.id, ctx.actor.userId)).limit(1)
      : Promise.resolve([]),
  ]);

  const role = ctx.actor.type === 'user' ? ctx.actor.role : 'volunteer';
  const tNav = await getTranslations('nav');

  const orgs = memberships.map((m) => ({
    id: m.organization.id,
    name: m.organization.name,
    cityLabel: cityLabelFor(m.organization.cityId),
  }));

  return (
    <AdminShell
      org={{ name: org.name, slug: org.portalEnabled ? org.slug : null, cityLabel: cityLabelFor(org.cityId) }}
      orgs={orgs}
      activeOrgId={activeOrgId}
      user={{ name: currentUser[0]?.name ?? tNav('you'), role }}
      counts={{
        animals: animals.length,
        newApplications: applications.filter((a) => a.status === 'new').length,
      }}
    >
      {children}
    </AdminShell>
  );
}
