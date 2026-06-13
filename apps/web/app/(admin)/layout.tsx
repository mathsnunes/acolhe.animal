import { eq } from 'drizzle-orm';
import { getTranslations } from 'next-intl/server';

import { city, db, user as userTable } from '@acolhe-animal/db';
import { getOrganizationById, listAnimals, listApplications } from '@acolhe-animal/domain';

import { AdminShell } from '@/components/nav/admin-shell';
import { requireCtx } from '@/lib/auth-context';

/**
 * Admin shell layout. Resolves the tenant Ctx, loads the org + sidebar counts,
 * and wraps every admin route in the navigation chrome.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireCtx();
  const org = await getOrganizationById(db, ctx.organizationId);
  if (!org) throw new Error('Organização não encontrada.');

  const [animals, applications, currentUser, cityRow] = await Promise.all([
    listAnimals(ctx),
    listApplications(ctx),
    ctx.actor.type === 'user'
      ? db.select({ name: userTable.name }).from(userTable).where(eq(userTable.id, ctx.actor.userId)).limit(1)
      : Promise.resolve([]),
    org.cityId
      ? db.select({ name: city.name, uf: city.stateCode }).from(city).where(eq(city.id, org.cityId)).limit(1)
      : Promise.resolve([]),
  ]);

  const cityLabel = cityRow[0] ? `${cityRow[0].name}, ${cityRow[0].uf}` : undefined;
  const role = ctx.actor.type === 'user' ? ctx.actor.role : 'volunteer';
  const tNav = await getTranslations('nav');

  return (
    <AdminShell
      org={{ name: org.name, slug: org.slug, cityLabel }}
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
