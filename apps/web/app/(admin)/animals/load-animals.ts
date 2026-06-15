import 'server-only';

import { countWaitingApplicationsByAnimal, getAnimalCovers, listAnimals } from '@acolhe-animal/domain';
import type { Ctx } from '@acolhe-animal/domain';

import { toListAnimalsFilters, type AnimalsFilterInput, type AnimalsPage } from '@/lib/animals-query';

/**
 * Build one page of the admin listing: the animal rows for `[offset, offset+limit)`
 * plus their cover thumbnail and waiting-candidate count. Shared by the server
 * page (first page) and `loadAnimalsPageAction` (subsequent pages) so the query
 * is identical on every fetch.
 */
export const loadAnimalsPage = async (
  ctx: Ctx,
  filters: AnimalsFilterInput,
  offset: number,
  limit: number,
): Promise<AnimalsPage> => {
  const rows = await listAnimals(ctx, { ...toListAnimalsFilters(filters), limit, offset });
  const [covers, waiting] = await Promise.all([
    getAnimalCovers(ctx, rows.map((a) => a.pk)),
    countWaitingApplicationsByAnimal(ctx),
  ]);

  const items = rows.map((a) => ({
    animal: a,
    coverUrl: covers[a.id]?.thumbUrl ?? null,
    waiting: waiting[a.id] ?? 0,
  }));

  // A short page means we've reached the end; an exact-size page may have more.
  return { items, nextOffset: offset + rows.length, hasMore: rows.length === limit };
};
