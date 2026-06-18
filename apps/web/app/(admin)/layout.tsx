import { getTranslations } from 'next-intl/server';

import { db } from '@acolhe-animal/db';
import {
  getCitiesByIds,
  getOrganizationByPk,
  getUserName,
  listAnimals,
  listApplications,
} from '@acolhe-animal/domain';

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
  const cityRows = await getCitiesByIds(db, cityIds);
  const cityLabelById = new Map(cityRows.map((c) => [c.id, `${c.name}, ${c.stateCode}`]));
  const cityLabelFor = (cityId: string | null) => (cityId ? cityLabelById.get(cityId) : undefined);

  const [animals, applications, currentUserName] = await Promise.all([
    listAnimals(ctx),
    listApplications(ctx),
    ctx.actor.type === 'user' ? getUserName(db, ctx.actor.userId) : Promise.resolve(null),
  ]);

  const role = ctx.actor.type === 'user' ? ctx.actor.role : 'volunteer';
  const tNav = await getTranslations('nav');

  const orgs = memberships.map((m) => ({
    id: m.organization.id,
    name: m.organization.name,
    cityLabel: cityLabelFor(m.organization.cityId),
    logoUrl: m.organization.logoUrl,
  }));

  return (
    <AdminShell
      org={{ name: org.name, slug: org.portalEnabled ? org.slug : null, cityLabel: cityLabelFor(org.cityId), logoUrl: org.logoUrl }}
      orgs={orgs}
      activeOrgId={activeOrgId}
      user={{ name: currentUserName ?? tNav('you'), role }}
      counts={{
        animals: animals.length,
        newApplications: applications.filter((a) => a.status === 'new').length,
      }}
    >
      {children}
    </AdminShell>
  );
}
