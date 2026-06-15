import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Plus } from 'lucide-react';

import { countAnimalsByStatus } from '@acolhe-animal/domain';

import { PageHeaderHero } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/empty-state';
import { AnimalsFilters } from '@/components/animals/animals-filters';
import { AnimalsListing } from '@/components/animals/animals-listing';
import { decodeAnimalsParams } from '@/lib/animals-search-params';
import {
  asAge,
  asSize,
  asSpecies,
  ANIMALS_PAGE_SIZE,
  type AnimalsFilterInput,
} from '@/lib/animals-query';
import { requireCtx } from '@/lib/auth-context';
import { loadAnimalsPage } from './load-animals';

export const dynamic = 'force-dynamic';

export default async function AnimaisPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const ctx = await requireCtx();
  const t = await getTranslations('animals');
  const params = await searchParams;
  // The URL is pt-BR (?situacao=&especie=…); decode to canonical values.
  const decoded = decodeAnimalsParams(params);

  const filters: AnimalsFilterInput = {
    status: decoded.status,
    species: decoded.species,
    size: decoded.size,
    search: decoded.search,
    age: decoded.age,
    sort: decoded.sort,
  };
  const isList = decoded.view === 'list';

  // First page of the (cursor-less, offset-paged) listing + the per-status tab
  // counts. Counts honor everything but status — the tabs need every bucket, and
  // `all` folds in drafts (which surface in the list with a badge, no own tab).
  const [firstPage, byStatus] = await Promise.all([
    loadAnimalsPage(ctx, filters, 0, ANIMALS_PAGE_SIZE),
    countAnimalsByStatus(ctx, {
      species: asSpecies(decoded.species),
      size: asSize(decoded.size),
      search: decoded.search?.trim() || undefined,
      age: asAge(decoded.age),
      includeDrafts: true,
    }),
  ]);

  const counts = {
    all: Object.values(byStatus).reduce((sum, n) => sum + n, 0),
    available: byStatus.available,
    'under-review': byStatus['under-review'],
    reserved: byStatus.reserved,
    adopted: byStatus.adopted,
    unavailable: byStatus.unavailable,
  };

  const hasFilters = Boolean(
    decoded.status || decoded.species || decoded.size || decoded.age || decoded.search?.trim(),
  );

  // Resetting the infinite-scroll state on any filter/view change is as simple as
  // remounting: a new key tears down the old accumulated pages.
  const listingKey = [
    decoded.status,
    decoded.species,
    decoded.size,
    decoded.age,
    decoded.search,
    decoded.sort,
    decoded.view,
  ].join('|');

  return (
    <div className="pb-16">
      <PageHeaderHero
        title={t('list.title')}
        description={t('list.description')}
        metric={{ value: counts.all, label: t('list.metricLabel') }}
      />

      {/* Mobile-only primary CTA — on desktop the topbar carries it. */}
      <div className="mb-5 px-6 lg:hidden">
        <Button asChild className="w-full">
          <Link href="/animais/novo">
            <Plus className="size-4" />
            {t('list.newAnimal')}
          </Link>
        </Button>
      </div>

      <AnimalsFilters
        counts={counts}
        current={{
          status: decoded.status ?? '',
          search: decoded.search ?? '',
          species: decoded.species ?? '',
          size: decoded.size ?? '',
          age: decoded.age ?? '',
          sort: decoded.sort ?? '',
          view: decoded.view ?? '',
        }}
      />

      {firstPage.items.length === 0 ? (
        <EmptyState
          eyebrow={t('list.emptyEyebrow')}
          title={hasFilters ? t('list.emptyFilteredTitle') : t('list.emptyTitle')}
          description={hasFilters ? t('list.emptyFilteredDescription') : t('list.emptyDescription')}
          actionHref={hasFilters ? undefined : '/animais/novo'}
          actionLabel={hasFilters ? undefined : t('list.emptyActionLabel')}
        />
      ) : (
        <AnimalsListing
          key={listingKey}
          initial={firstPage}
          view={isList ? 'list' : 'cards'}
          filters={filters}
          pageSize={ANIMALS_PAGE_SIZE}
        />
      )}
    </div>
  );
}
