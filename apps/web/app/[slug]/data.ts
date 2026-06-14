import 'server-only';

import { and, asc, eq, inArray } from 'drizzle-orm';

import { animal, animalPhoto, db, type Animal, type Organization } from '@acolhe-animal/db';
import { getOrganizationBySlug, listAnimals } from '@acolhe-animal/domain';

import { publicCtx } from '@/lib/auth-context';

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
 * Available animals that the org chose to show publicly. We filter
 * `visibleOnPortal && listedForAdoption` in app code per the brief.
 */
export const getPortalAnimals = async (organizationPk: number): Promise<Animal[]> => {
  const ctx = publicCtx(organizationPk);
  const animals = await listAnimals(ctx, { status: ['available'] });
  return animals.filter((a) => a.visibleOnPortal && a.listedForAdoption);
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
