'use client';

import { useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Columns3, List, Search } from 'lucide-react';

import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { encodeCandidatesParam, type CanonicalKey } from '@/lib/candidates-search-params';
import { UNASSIGNED } from '@/lib/candidates-query';
import type { ApplicationStatusGroup } from '@acolhe-animal/domain';

type TabKey = 'all' | ApplicationStatusGroup;
type StatusTab = { key: TabKey; labelKey: string; dot?: string };

const STATUS_TABS: StatusTab[] = [
  { key: 'all', labelKey: 'tabs.all' },
  { key: 'new', labelKey: 'tabs.new', dot: 'bg-terra' },
  { key: 'in-progress', labelKey: 'tabs.inProgress', dot: 'bg-gold' },
  { key: 'approved', labelKey: 'tabs.approved', dot: 'bg-green-soft' },
  { key: 'closed', labelKey: 'tabs.closed', dot: 'bg-ink-mute' },
];

export interface CandidatesCurrentFilters {
  status: string;
  search: string;
  animal: string;
  responsible: string;
  view: string;
}

export const CandidatesFilters = ({
  counts,
  current,
  animalOptions,
  members,
}: {
  counts: Record<TabKey, number>;
  current: CandidatesCurrentFilters;
  animalOptions: { id: string; name: string }[];
  members: { userId: string; name: string }[];
}) => {
  const t = useTranslations('candidates');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const setParam = (key: CanonicalKey, value: string) => {
    // The URL is pt-BR; translate the canonical (key, value) before writing.
    const { ptKey, ptValue } = encodeCandidatesParam(key, value);
    const params = new URLSearchParams(searchParams.toString());
    if (ptValue) params.set(ptKey, ptValue);
    else params.delete(ptKey);
    const query = params.toString();
    startTransition(() => {
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    });
  };

  const activeStatus = current.status || 'all';
  // Kanban is the default; only an explicit `tabela` switches to the table.
  const isTable = current.view === 'tabela';

  const animalSelectOptions = [
    { value: '', label: t('filters.allAnimals') },
    ...animalOptions.map((a) => ({ value: a.id, label: a.name })),
  ];
  const responsibleOptions = [
    { value: '', label: t('filters.allResponsibles') },
    { value: UNASSIGNED, label: t('filters.unassigned') },
    ...members.map((m) => ({ value: m.userId, label: m.name })),
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
              {tab.dot && <span className={cn('size-[7px] shrink-0 rounded-full', tab.dot)} aria-hidden />}
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

      {/* Filter row: search · animal · responsável · [quadro|tabela] */}
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
          prefix={t('filters.animalPrefix')}
          ariaLabel={t('filters.animalFilterLabel')}
          value={current.animal}
          options={animalSelectOptions}
          onChange={(v) => setParam('animal', v)}
        />
        <FilterDropdown
          prefix={t('filters.responsiblePrefix')}
          ariaLabel={t('filters.responsibleFilterLabel')}
          value={current.responsible}
          options={responsibleOptions}
          onChange={(v) => setParam('responsible', v)}
        />

        {/* View toggle (kanban / table) — desktop only */}
        <div
          className="ml-auto hidden items-center rounded-[10px] border border-line bg-paper p-0.5 lg:inline-flex"
          role="group"
          aria-label={t('filters.viewLabel')}
        >
          <button
            type="button"
            aria-label={t('filters.viewKanban')}
            aria-pressed={!isTable}
            onClick={() => setParam('view', '')}
            className={cn(
              'flex items-center rounded-[8px] px-2.5 py-1.5 transition-colors',
              !isTable ? 'bg-ink text-paper' : 'text-ink-soft hover:bg-bg-2',
            )}
          >
            <Columns3 className="size-[15px]" strokeWidth={2} />
          </button>
          <button
            type="button"
            aria-label={t('filters.viewTable')}
            aria-pressed={isTable}
            onClick={() => setParam('view', 'tabela')}
            className={cn(
              'flex items-center rounded-[8px] px-2.5 py-1.5 transition-colors',
              isTable ? 'bg-ink text-paper' : 'text-ink-soft hover:bg-bg-2',
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
 * The shared "Prefixo: valor ⌄" filter pill — a Radix Select matching the design
 * system. Radix forbids an empty item value, so the "todos" option uses a
 * sentinel. Unlike the animals filters these values are proper names, so no
 * lowercasing.
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
}) => (
  <Select value={value || ALL_VALUE} onValueChange={(v) => onChange(v === ALL_VALUE ? '' : v)}>
    <SelectTrigger
      aria-label={ariaLabel}
      className={cn(
        'h-[38px] w-auto max-w-[200px] gap-1.5 rounded-[10px] border-line bg-paper px-3.5 text-[12.5px] font-medium shadow-none',
        value ? 'text-ink' : 'text-ink-soft',
      )}
    >
      <span className="text-ink-mute">{prefix}:</span>
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      {options.map((opt) => (
        <SelectItem key={opt.value || ALL_VALUE} value={opt.value || ALL_VALUE}>
          {opt.label}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);
