import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Plus } from 'lucide-react';

import { countWaitingApplicationsByAnimal, listAnimals } from '@acolhe-animal/domain';
import type { Animal } from '@acolhe-animal/db';

import { PageHeaderHero } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/empty-state';
import { AnimalCard } from '@/components/animals/animal-card';
import { AnimalsFilters } from '@/components/animals/animals-filters';
import { AnimalsTable } from '@/components/animals/animals-table';
import { ageGroupOf, type AgeGroup } from '@/components/animals/labels';
import { ANIMAL_STATUSES, type AnimalStatus } from '@/components/animals/status-pill';
import { decodeAnimalsParams } from '@/lib/animals-search-params';
import { requireCtx } from '@/lib/auth-context';

export const dynamic = 'force-dynamic';

const asStatus = (v?: string): AnimalStatus | undefined => ANIMAL_STATUSES.find((s) => s === v);
const asSpecies = (v?: string): Animal['species'] | undefined => v === 'dog' || v === 'cat' ? v : undefined;
const asSize = (v?: string): NonNullable<Animal['size']> | undefined => v === 'small' || v === 'medium' || v === 'large' ? v : undefined;
const asAge = (v?: string): AgeGroup | undefined => v === 'baby' || v === 'adult' || v === 'senior' ? v : undefined;
const asSort = (v?: string): 'name' | undefined => v === 'name' ? v : undefined;

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

  const status = asStatus(decoded.status);
  const species = asSpecies(decoded.species);
  const size = asSize(decoded.size);
  const age = asAge(decoded.age);
  const sort = asSort(decoded.sort);
  const search = decoded.search?.trim() || undefined;
  const isList = decoded.view === 'list';

  // One query for everything-but-status (status is just an in-app slice); the tab
  // counts need all statuses, and age is derived (no DB column) so it's filtered
  // in-app too.
  const [allRows, waiting] = await Promise.all([
    listAnimals(ctx, { species, size, search, orderBy: sort, includeDrafts: true }),
    countWaitingApplicationsByAnimal(ctx),
  ]);

  const scopedAll = age ? allRows.filter((a) => ageGroupOf(a) === age) : allRows;
  const animals = status ? scopedAll.filter((a) => a.status === status) : scopedAll;

  const counts = {
    all: scopedAll.length,
    available: scopedAll.filter((a) => a.status === 'available').length,
    'under-review': scopedAll.filter((a) => a.status === 'under-review').length,
    reserved: scopedAll.filter((a) => a.status === 'reserved').length,
    adopted: scopedAll.filter((a) => a.status === 'adopted').length,
    unavailable: scopedAll.filter((a) => a.status === 'unavailable').length,
  };

  const hasFilters = Boolean(status || species || size || age || search);

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

      {animals.length === 0 ? (
        <EmptyState
          eyebrow={t('list.emptyEyebrow')}
          title={hasFilters ? t('list.emptyFilteredTitle') : t('list.emptyTitle')}
          description={hasFilters ? t('list.emptyFilteredDescription') : t('list.emptyDescription')}
          actionHref={hasFilters ? undefined : '/animais/novo'}
          actionLabel={hasFilters ? undefined : t('list.emptyActionLabel')}
        />
      ) : isList ? (
        <AnimalsTable animals={animals} waiting={waiting} />
      ) : (
        <div className="mt-7 grid grid-cols-1 gap-3 px-6 sm:grid-cols-2 sm:gap-[18px] sm:px-10 lg:grid-cols-[repeat(auto-fill,minmax(240px,1fr))]">
          {animals.map((animal) => (
            <AnimalCard key={animal.id} animal={animal} waiting={waiting[animal.id] ?? 0} />
          ))}
        </div>
      )}
    </div>
  );
}
