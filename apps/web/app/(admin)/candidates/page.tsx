import { getTranslations } from 'next-intl/server';
import { and, eq, isNull } from 'drizzle-orm';

import { countApplicationsByStatus, listApplicationAnimals } from '@acolhe-animal/domain';
import { db, organizationMember, user } from '@acolhe-animal/db';

import { requireCtx } from '@/lib/auth-context';
import { PageHeaderHero } from '@/components/page-header';
import { EmptyState } from '@/components/empty-state';
import { CandidatesFilters } from '@/components/candidates/candidates-filters';
import { CandidatesListing } from '@/components/candidates/candidates-listing';
import { decodeCandidatesParams } from '@/lib/candidates-search-params';
import {
  CANDIDATES_KANBAN_CAP,
  CANDIDATES_PAGE_SIZE,
  type CandidatesFilterInput,
} from '@/lib/candidates-query';
import { loadCandidatesPage } from './load-candidates';

export const dynamic = 'force-dynamic';

/** Active members of the org — the options for the "Responsável" filter. */
const listOrgMembers = async (organizationId: number): Promise<{ userId: string; name: string }[]> =>
  db
    .select({ userId: organizationMember.userId, name: user.name })
    .from(organizationMember)
    .innerJoin(user, eq(organizationMember.userId, user.id))
    .where(
      and(
        eq(organizationMember.organizationId, organizationId),
        isNull(organizationMember.removedAt),
      ),
    );

export default async function CandidatosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const ctx = await requireCtx();
  const t = await getTranslations('candidates');
  const params = await searchParams;
  // The URL is pt-BR (?situacao=&responsavel=…); decode to canonical values.
  const decoded = decodeCandidatesParams(params);

  const filters: CandidatesFilterInput = {
    status: decoded.status,
    search: decoded.search,
    animal: decoded.animal,
    responsible: decoded.responsible,
  };
  // Kanban is the default view; only an explicit `tabela` switches to the table.
  const isKanban = decoded.view !== 'tabela';

  // The kanban needs the full set (one capped fetch) for accurate columns; the
  // table/mobile need only the first flat page (infinite scroll pulls the rest).
  const [firstPage, byStatus, animalOptions, members] = await Promise.all([
    loadCandidatesPage(ctx, filters, 0, isKanban ? CANDIDATES_KANBAN_CAP : CANDIDATES_PAGE_SIZE),
    countApplicationsByStatus(ctx, {
      search: filters.search?.trim() || undefined,
      animalId: filters.animal || undefined,
      unassigned: filters.responsible === 'sem',
      assignedToUserId:
        filters.responsible && filters.responsible !== 'sem' ? filters.responsible : undefined,
    }),
    listApplicationAnimals(ctx),
    listOrgMembers(ctx.organizationId),
  ]);

  const counts = {
    all: byStatus.new + byStatus['in-progress'] + byStatus.approved + byStatus.closed,
    new: byStatus.new,
    'in-progress': byStatus['in-progress'],
    approved: byStatus.approved,
    closed: byStatus.closed,
  };
  // The hero metric stays "Esperando": candidacies still awaiting a decision.
  const waiting = byStatus.new + byStatus['in-progress'];

  const hasFilters = Boolean(
    decoded.status || decoded.search?.trim() || decoded.animal || decoded.responsible,
  );

  // Remounting on any filter/view change resets the infinite-scroll state.
  const listingKey = [
    decoded.status,
    decoded.search,
    decoded.animal,
    decoded.responsible,
    decoded.view,
  ].join('|');

  return (
    <div className="pb-16">
      <PageHeaderHero
        title={t('page.title')}
        description={t('page.description')}
        metric={{ value: waiting, label: t('page.metricLabel') }}
      />

      <CandidatesFilters
        counts={counts}
        current={{
          status: decoded.status ?? '',
          search: decoded.search ?? '',
          animal: decoded.animal ?? '',
          responsible: decoded.responsible ?? '',
          view: decoded.view ?? '',
        }}
        animalOptions={animalOptions}
        members={members}
      />

      {firstPage.items.length === 0 ? (
        <div className="mt-7">
          <EmptyState
            eyebrow={t('empty.eyebrow')}
            title={hasFilters ? t('empty.filteredTitle') : t('empty.title')}
            description={hasFilters ? t('empty.filteredDescription') : t('empty.description')}
            actionHref={hasFilters ? undefined : '/animais'}
            actionLabel={hasFilters ? undefined : t('empty.actionLabel')}
          />
        </div>
      ) : (
        <CandidatesListing
          key={listingKey}
          initial={firstPage}
          kanbanItems={isKanban ? firstPage.items : null}
          filters={filters}
          pageSize={CANDIDATES_PAGE_SIZE}
        />
      )}
    </div>
  );
}
