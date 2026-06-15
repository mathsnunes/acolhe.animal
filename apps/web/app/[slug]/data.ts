import 'server-only';

import { and, asc, eq, inArray } from 'drizzle-orm';

import { animal, animalPhoto, db, type Animal, type Organization } from '@acolhe-animal/db';
import { getOrganizationBySlug, listAnimals } from '@acolhe-animal/domain';

import { publicCtx } from '@/lib/auth-context';
import type { PortalAnimalsPage } from '@/lib/portal-query';

/**
 * Shared server-side loaders for the public portal. The org id is always
 * resolved from the slug here — never trusted from the client.
 */

/** Resolve a public, active organization by slug (or null when not adoptable). */
export const getPublicOrganization = async (slug: string): Promise<Organization | null> => {
  const org = await getOrganizationBySlug(db, slug);
  if (!org || org.status !== 'active') return null;
  return org;
};

/**
 * A page of available animals the org chose to show publicly. The portal flags
 * (`visibleOnPortal && listedForAdoption`) and pagination are pushed down to the
 * query so infinite scroll fetches only what it renders.
 */
export const getPortalAnimals = async (
  organizationPk: number,
  page: { limit: number; offset: number },
): Promise<PortalAnimalsPage> => {
  const ctx = publicCtx(organizationPk);
  const rows = await listAnimals(ctx, {
    status: ['available'],
    visibleOnPortal: true,
    listedForAdoption: true,
    limit: page.limit,
    offset: page.offset,
  });
  const photos = await getPrimaryPhotos(rows.map((a) => a.pk));
  const items = rows.map((a) => ({ animal: a, photoUrl: photos[a.id] ?? null }));

  return { items, nextOffset: page.offset + rows.length, hasMore: rows.length === page.limit };
};

/**
 * Map of animal *public* id → primary (or first) photo medium URL. Takes the
 * animals' surrogate keys (photo FKs reference `animal.pk`) but keys the result
 * by the public id the UI holds.
 */
export const getPrimaryPhotos = async (animalPks: number[]): Promise<Record<string, string>> => {
  if (animalPks.length === 0) return {};
  const rows = await db
    .select({
      animalId: animal.id,
      mediumUrl: animalPhoto.mediumUrl,
      isPrimary: animalPhoto.isPrimary,
      displayOrder: animalPhoto.displayOrder,
    })
    .from(animalPhoto)
    .innerJoin(animal, eq(animalPhoto.animalId, animal.pk))
    .where(inArray(animalPhoto.animalId, animalPks))
    .orderBy(asc(animalPhoto.displayOrder));

  const byAnimal: Record<string, string> = {};
  for (const row of rows) {
    // Prefer an explicit primary; otherwise keep the first (lowest order) seen.
    if (row.isPrimary || !byAnimal[row.animalId]) {
      byAnimal[row.animalId] = row.mediumUrl;
    }
  }
  return byAnimal;
};

/** A single public animal that is still listed/visible, or null. */
export const getPortalAnimal = async (organizationPk: number, animalId: string): Promise<{ animal: Animal; photoUrl: string | null } | null> => {
  const [row] = await db
    .select()
    .from(animal)
    .where(and(eq(animal.id, animalId), eq(animal.organizationId, organizationPk)))
    .limit(1);
  if (!row) return null;
  const photos = await getPrimaryPhotos([row.pk]);
  return { animal: row, photoUrl: photos[row.id] ?? null };
};
