'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { formatRelative, initials } from '@acolhe-animal/shared';

import { cn } from '@/lib/utils';
import type { CandidateListItem } from '@/lib/candidates-query';
import { AlertChips } from './alert-chips';
import { STATUS_META, statusLabelKey } from './status-meta';

/**
 * Dense ("tabela") variant of the candidates listing — one row. Desktop-only (the
 * mobile breakpoint shows cards), so it's a fixed grid: candidate · animal ·
 * alerts · submitted · status · responsible. A stagnant candidacy gets a terra
 * leading accent and a terra "submitted" time.
 */
export const CANDIDATE_ROW_COLS =
  'grid-cols-[1.5fr_1.2fr_1.4fr_96px_128px_132px]';

const ColHead = ({ children }: { children: React.ReactNode }) => (
  <span className="text-[10.5px] font-medium uppercase tracking-[0.18em] text-ink-mute">
    {children}
  </span>
);

/** The column header row for the table view. Borderless, matching the animals listing. */
export const CandidatesListHeader = () => {
  const t = useTranslations('candidates');
  return (
    <div
      className={cn('grid items-center gap-4 border-b border-line px-4 pb-3', CANDIDATE_ROW_COLS)}
    >
      <ColHead>{t('table.candidate')}</ColHead>
      <ColHead>{t('table.animal')}</ColHead>
      <ColHead>{t('table.alerts')}</ColHead>
      <ColHead>{t('table.submitted')}</ColHead>
      <ColHead>{t('table.status')}</ColHead>
      <ColHead>{t('table.responsible')}</ColHead>
    </div>
  );
};

export const CandidateRow = ({ item }: { item: CandidateListItem }) => {
  const t = useTranslations('candidates');
  const { application, coverUrl, alerts, stale } = item;
  const { person, animal, assignee } = application;
  const meta = STATUS_META[application.status];
  const isNew = application.status === 'new';

  const animalMeta = [t(`species.${animal.species}`), animal.size ? t(`size.${animal.size}`) : null]
    .filter(Boolean)
    .join(' · ');
  const when = formatRelative(application.submittedAt ?? application.statusChangedAt);

  return (
    <Link
      href={`/candidatos/${application.id}`}
      aria-label={t('table.open', { name: person.name })}
      className={cn(
        'relative grid items-center gap-4 border-b border-line-soft px-4 py-3.5 transition-colors hover:bg-bg-2',
        CANDIDATE_ROW_COLS,
      )}
    >
      {stale && (
        <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-terra" aria-hidden />
      )}

      {/* Candidate */}
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="flex size-[26px] shrink-0 items-center justify-center rounded-full bg-terra-bg text-[10px] font-medium uppercase text-terra">
          {initials(person.name)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-[13px] font-medium leading-tight text-ink">{person.name}</p>
          {person.cityName && (
            <p className="truncate text-[10.5px] leading-tight text-ink-mute">{person.cityName}</p>
          )}
        </div>
      </div>

      {/* Animal */}
      <div className="flex min-w-0 items-center gap-2">
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- user media on R2/local
          <img
            src={coverUrl}
            alt={animal.name}
            loading="lazy"
            className="size-7 shrink-0 rounded-full object-cover"
          />
        ) : (
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-terra-bg text-[10px] font-medium text-terra">
            {initials(animal.name)}
          </span>
        )}
        <div className="min-w-0">
          <p className="display truncate text-[13.5px] italic leading-tight text-ink">
            {animal.name}
          </p>
          {animalMeta && (
            <p className="truncate text-[10.5px] leading-tight text-ink-mute">{animalMeta}</p>
          )}
        </div>
      </div>

      {/* Alerts */}
      <div className="min-w-0">
        {alerts.length > 0 ? (
          <AlertChips alerts={alerts} />
        ) : (
          <span className="text-ink-mute">—</span>
        )}
      </div>

      {/* Submitted */}
      <span className={cn('text-[12px]', stale ? 'font-medium text-terra' : 'text-ink-soft')}>
        {when}
      </span>

      {/* Status */}
      <span>
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium leading-tight',
            meta.chip,
          )}
        >
          <span
            className={cn('size-1.5 rounded-full', meta.dot, isNew && 'animate-pulse-dot')}
            aria-hidden
          />
          {t(`status.${statusLabelKey(application.status)}`)}
        </span>
      </span>

      {/* Responsible */}
      {assignee ? (
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-green text-[8.5px] font-medium uppercase text-paper">
            {initials(assignee.name)}
          </span>
          <span className="truncate text-[11.5px] text-ink-soft">{assignee.name}</span>
        </span>
      ) : (
        <span className="text-[11.5px] italic text-ink-mute">—</span>
      )}
    </Link>
  );
};
