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
export async function getPublicOrganization(slug: string): Promise<Organization | null> {
  const org = await getOrganizationBySlug(db, slug);
  if (!org || org.status !== 'active') return null;
  return org;
}

/**
 * Available animals that the org chose to show publicly. We filter
 * `visibleOnPortal && listedForAdoption` in app code per the brief.
 */
export async function getPortalAnimals(organizationId: string): Promise<Animal[]> {
  const ctx = publicCtx(organizationId);
  const animals = await listAnimals(ctx, { status: ['available'] });
  return animals.filter((a) => a.visibleOnPortal && a.listedForAdoption);
}

/** Map of animalId → primary (or first) photo medium URL. */
export async function getPrimaryPhotos(
  animalIds: string[],
): Promise<Record<string, string>> {
  if (animalIds.length === 0) return {};
  const rows = await db
    .select({
      animalId: animalPhoto.animalId,
      mediumUrl: animalPhoto.mediumUrl,
      isPrimary: animalPhoto.isPrimary,
      displayOrder: animalPhoto.displayOrder,
    })
    .from(animalPhoto)
    .where(inArray(animalPhoto.animalId, animalIds))
    .orderBy(asc(animalPhoto.displayOrder));

  const byAnimal: Record<string, string> = {};
  for (const row of rows) {
    // Prefer an explicit primary; otherwise keep the first (lowest order) seen.
    if (row.isPrimary || !byAnimal[row.animalId]) {
      byAnimal[row.animalId] = row.mediumUrl;
    }
  }
  return byAnimal;
}

/** A single public animal that is still listed/visible, or null. */
export async function getPortalAnimal(
  organizationId: string,
  animalId: string,
): Promise<{ animal: Animal; photoUrl: string | null } | null> {
  const [row] = await db
    .select()
    .from(animal)
    .where(and(eq(animal.id, animalId), eq(animal.organizationId, organizationId)))
    .limit(1);
  if (!row) return null;
  const photos = await getPrimaryPhotos([animalId]);
  return { animal: row, photoUrl: photos[animalId] ?? null };
}
