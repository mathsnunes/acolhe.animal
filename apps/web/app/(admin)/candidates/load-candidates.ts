import 'server-only';

import {
  getAnimalCovers,
  getMultipleCandidacies,
  getPersonAdoptions,
  listApplicationsPage,
} from '@acolhe-animal/domain';
import type { Ctx } from '@acolhe-animal/domain';

import {
  STALE_AFTER_DAYS,
  toListApplicationsFilters,
  type CandidateAlert,
  type CandidatesFilterInput,
  type CandidatesPage,
} from '@/lib/candidates-query';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Build one page of the candidates listing: the candidacy rows for
 * `[offset, offset+limit)` enriched with the animal cover thumbnail and the
 * derived attention alerts (staleness, multiple candidacies, adoption history).
 * The alert inputs are fetched once per page (batched by person) to avoid an
 * N+1. Shared by the server page (first page / kanban full set) and
 * `loadCandidatesPageAction` (subsequent pages) so the query is identical.
 */
export const loadCandidatesPage = async (
  ctx: Ctx,
  filters: CandidatesFilterInput,
  offset: number,
  limit: number,
): Promise<CandidatesPage> => {
  const rows = await listApplicationsPage(ctx, toListApplicationsFilters(filters), { offset, limit });

  const personPks = rows.map((r) => r.personId);
  const [covers, multiple, adoptions] = await Promise.all([
    getAnimalCovers(ctx, rows.map((r) => r.animalId)),
    getMultipleCandidacies(ctx, personPks),
    getPersonAdoptions(ctx, personPks),
  ]);

  const now = Date.now();
  const items = rows.map((application) => {
    const isOpen = application.status === 'new' || application.status === 'in-progress';
    const days = Math.floor((now - new Date(application.statusChangedAt).getTime()) / DAY_MS);
    const stale = isOpen && days > STALE_AFTER_DAYS;

    const alerts: CandidateAlert[] = [];
    if (stale) alerts.push({ kind: 'stale', days });

    const others = (multiple[application.personId] ?? []).filter(
      (c) => c.animalId !== application.animal.id,
    );
    if (others[0]) alerts.push({ kind: 'multiple', animalName: others[0].animalName });

    // Prior adoptions of this person — excluding this candidacy's own adoption, so
    // an adopted candidacy never flags itself as "já adotou".
    const priorAdoptions = (adoptions[application.personId] ?? []).filter(
      (a) => a.applicationPk !== application.pk,
    );
    if (priorAdoptions.some((a) => a.cancelled)) alerts.push({ kind: 'returned-before' });
    else if (priorAdoptions.some((a) => !a.cancelled)) alerts.push({ kind: 'adopted-before' });

    return {
      application,
      coverUrl: covers[application.animal.id]?.thumbUrl ?? null,
      alerts,
      stale,
    };
  });

  // A short page means we've reached the end; an exact-size page may have more.
  return { items, nextOffset: offset + rows.length, hasMore: rows.length === limit };
};
