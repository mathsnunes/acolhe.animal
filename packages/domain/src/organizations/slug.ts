import { and, eq, ne } from 'drizzle-orm';

import { RESERVED_SLUGS, slugSchema } from '@acolhe-animal/shared';
import type { Database } from '@acolhe-animal/db';
import { organization } from '@acolhe-animal/db';

/**
 * Portal-slug availability, for the live feedback under the slug field in the org
 * signup form. Separates the three failure modes the UI renders differently:
 * malformed (`invalid`), platform-reserved (`reserved`), already-in-use (`taken`).
 */
export type SlugAvailability =
  | { available: true }
  | { available: false; reason: 'invalid' | 'reserved' | 'taken' };

export const checkSlugAvailability = async (
  db: Database,
  rawSlug: string,
  excludeOrgPk?: number,
): Promise<SlugAvailability> => {
  const slug = rawSlug.trim().toLowerCase();

  const parsed = slugSchema.safeParse(slug);
  if (!parsed.success) {
    return { available: false, reason: RESERVED_SLUGS.has(slug) ? 'reserved' : 'invalid' };
  }

  const [existing] = await db
    .select({ pk: organization.pk })
    .from(organization)
    .where(
      excludeOrgPk != null
        ? and(eq(organization.slug, parsed.data), ne(organization.pk, excludeOrgPk))
        : eq(organization.slug, parsed.data),
    )
    .limit(1);

  return existing ? { available: false, reason: 'taken' } : { available: true };
};
