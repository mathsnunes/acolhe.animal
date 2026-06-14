'use client';

import { useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { LayoutGrid, List, Search } from 'lucide-react';

import type { Animal } from '@acolhe-animal/db';

import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { encodeAnimalsParam, type CanonicalKey } from '@/lib/animals-search-params';
import { statusMeta, type AnimalStatus } from './status-pill';

type StatusTab = { key: 'all' | AnimalStatus; labelKey: string };

const STATUS_TABS: StatusTab[] = [
  { key: 'all', labelKey: 'filters.tabAll' },
  { key: 'available', labelKey: 'filters.tabAvailable' },
  { key: 'under-review', labelKey: 'filters.tabUnderReview' },
  { key: 'reserved', labelKey: 'filters.tabReserved' },
  { key: 'adopted', labelKey: 'filters.tabAdopted' },
  { key: 'unavailable', labelKey: 'filters.tabUnavailable' },
];

export interface AnimalsCurrentFilters {
  status: string;
  search: string;
  species: string;
  size: string;
  age: string;
  sort: string;
  view: string;
}

export const AnimalsFilters = ({
  counts,
  current,
}: {
  counts: Record<'all' | AnimalStatus, number>;
  current: AnimalsCurrentFilters;
}) => {
  const t = useTranslations('animals');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const setParam = (key: CanonicalKey, value: string) => {
    // The URL is pt-BR; translate the canonical (key, value) before writing.
    const { ptKey, ptValue } = encodeAnimalsParam(key, value);
    const params = new URLSearchParams(searchParams.toString());
    if (ptValue) params.set(ptKey, ptValue);
    else params.delete(ptKey);
    const query = params.toString();
    startTransition(() => {
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    });
  };

  const activeStatus = current.status || 'all';
  const isList = current.view === 'list';

  const speciesOptions = [
    { value: '', label: t('filters.allSpecies') },
    { value: 'dog', label: t('filters.dogsPlural') },
    { value: 'cat', label: t('filters.catsPlural') },
  ];
  const sizeOptions = [
    { value: '', label: t('filters.allSizes') },
    { value: 'small', label: t('labels.size.small') },
    { value: 'medium', label: t('labels.size.medium') },
    { value: 'large', label: t('labels.size.large') },
  ] satisfies { value: '' | NonNullable<Animal['size']>; label: string }[];
  const ageOptions = [
    { value: '', label: t('filters.allAges') },
    { value: 'baby', label: t('filters.ageBaby') },
    { value: 'adult', label: t('filters.ageAdult') },
    { value: 'senior', label: t('filters.ageSenior') },
  ];
  const sortOptions = [
    { value: '', label: t('filters.sortRecent') },
    { value: 'name', label: t('filters.sortName') },
  ];

  return (
    <div
      className={cn('px-6 sm:px-10', isPending && 'opacity-70 transition-opacity')}
      aria-busy={isPending}
    >
      {/* Status tabs */}
      <div className="flex flex-wrap gap-2" role="tablist" aria-label={t('filters.tabsAriaLabel')}>
        {STATUS_TABS.map((tab) => {
          const isActive = activeStatus === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              onClick={() => setParam('status', tab.key === 'all' ? '' : tab.key)}
              aria-selected={isActive}
              className={cn(
                'inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-[13px] transition-colors',
                isActive
                  ? 'border-ink bg-ink text-paper'
                  : 'border-line bg-paper text-ink-soft hover:bg-bg-2 hover:text-ink',
              )}
            >
              {tab.key !== 'all' && (
                <span
                  className={cn('size-[7px] shrink-0 rounded-full', statusMeta[tab.key].dot)}
                  aria-hidden
                />
              )}
              <span>{t(tab.labelKey)}</span>
              <span
                className={cn(
                  'rounded-full px-2 text-[11.5px] font-medium leading-tight tabular-nums',
                  isActive ? 'bg-white/15 text-paper' : 'bg-bg-2 text-ink-mute',
                )}
              >
                {counts[tab.key] ?? 0}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filter row: search · espécie · tamanho · idade · ordenar · [grade|lista] */}
      <div className="mt-6 flex flex-wrap items-center gap-2.5">
        <div className="relative min-w-[200px] max-w-[320px] flex-1">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 size-[15px] -translate-y-1/2 text-ink-mute"
            aria-hidden
          />
          <input
            type="search"
            defaultValue={current.search}
            placeholder={t('filters.searchPlaceholder')}
            aria-label={t('filters.searchAriaLabel')}
            onChange={(e) => setParam('search', e.target.value.trim())}
            className={cn(
              'h-[38px] w-full rounded-[10px] border border-line bg-paper pl-10 pr-3.5 text-[13px] text-ink',
              'placeholder:text-ink-mute focus-visible:border-terra focus-visible:outline-none',
            )}
          />
        </div>

        <FilterDropdown
          prefix={t('filters.speciesPrefix')}
          ariaLabel={t('filters.speciesFilterLabel')}
          value={current.species}
          options={speciesOptions}
          onChange={(v) => setParam('species', v)}
        />
        <FilterDropdown
          prefix={t('filters.sizePrefix')}
          ariaLabel={t('filters.sizeFilterLabel')}
          value={current.size}
          options={sizeOptions}
          onChange={(v) => setParam('size', v)}
        />
        <FilterDropdown
          prefix={t('filters.agePrefix')}
          ariaLabel={t('filters.ageFilterLabel')}
          value={current.age}
          options={ageOptions}
          onChange={(v) => setParam('age', v)}
        />
        <FilterDropdown
          prefix={t('filters.sortPrefix')}
          ariaLabel={t('filters.sortFilterLabel')}
          value={current.sort}
          options={sortOptions}
          onChange={(v) => setParam('sort', v)}
        />

        {/* View toggle (grid / list) — pushed to the right */}
        <div
          className="ml-auto hidden items-center rounded-[10px] border border-line bg-paper p-0.5 lg:inline-flex"
          role="group"
          aria-label={t('filters.viewLabel')}
        >
          <button
            type="button"
            aria-label={t('filters.viewGrid')}
            aria-pressed={!isList}
            onClick={() => setParam('view', '')}
            className={cn(
              'flex items-center rounded-[8px] px-2.5 py-1.5 transition-colors',
              !isList ? 'bg-ink text-paper' : 'text-ink-soft hover:bg-bg-2',
            )}
          >
            <LayoutGrid className="size-[15px]" strokeWidth={2} />
          </button>
          <button
            type="button"
            aria-label={t('filters.viewList')}
            aria-pressed={isList}
            onClick={() => setParam('view', 'list')}
            className={cn(
              'flex items-center rounded-[8px] px-2.5 py-1.5 transition-colors',
              isList ? 'bg-ink text-paper' : 'text-ink-soft hover:bg-bg-2',
            )}
          >
            <List className="size-[15px]" strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  );
};

const ALL_VALUE = '__all__';

/**
 * The shared "Prefixo: valor ⌄" filter pill — a Radix Select so the open menu
 * matches the design system (paper surface, hairline border, terra check). Radix
 * forbids an empty item value, so the "todas/todos" option uses a sentinel.
 */
const FilterDropdown = ({
  prefix,
  ariaLabel,
  value,
  options,
  onChange,
}: {
  prefix: string;
  ariaLabel: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) => <Select
      value={value || ALL_VALUE}
      onValueChange={(v) => onChange(v === ALL_VALUE ? '' : v)}
    >
      <SelectTrigger
        aria-label={ariaLabel}
        className={cn(
          'h-[38px] w-auto gap-1.5 rounded-[10px] border-line bg-paper px-3.5 text-[12.5px] font-medium lowercase shadow-none',
          value ? 'text-ink' : 'text-ink-soft',
        )}
      >
        <span className="text-ink-mute">{prefix}:</span>
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="lowercase">
        {options.map((opt) => (
          <SelectItem key={opt.value || ALL_VALUE} value={opt.value || ALL_VALUE}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>;
