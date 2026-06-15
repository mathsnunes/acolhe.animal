import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { formatRelative, initials } from '@acolhe-animal/shared';

import { cn } from '@/lib/utils';
import type { CandidateListItem } from '@/lib/candidates-query';
import { AlertChips } from './alert-chips';
import { STATUS_META, statusLabelKey } from './status-meta';

/**
 * A single candidacy in the triage board (and the mobile list). The leading
 * hairline accent keys the card to the funnel's emotional temperature (new →
 * terra, em análise → gold, aprovado → green, encerrado → ink-mute); a stagnant
 * one turns terra to pull the eye. New candidacies get a pulsing terra dot, closed
 * ones a quiet status pill, approved ones a "formalizar adoção" cue.
 */
export const CandidateCard = ({ item }: { item: CandidateListItem }) => {
  const t = useTranslations('candidates');
  const { application, coverUrl, alerts, stale } = item;
  const { person, animal, assignee } = application;

  const isNew = application.status === 'new';
  const isApproved = application.status === 'approved';
  const isClosed =
    application.status === 'adopted' ||
    application.status === 'rejected' ||
    application.status === 'withdrew' ||
    application.status === 'cancelled';
  const meta = STATUS_META[application.status];

  const animalMeta = [t(`species.${animal.species}`), animal.size ? t(`size.${animal.size}`) : null]
    .filter(Boolean)
    .join(' · ');

  const when = formatRelative(application.statusChangedAt);
  const submittedWhen = formatRelative(application.submittedAt ?? application.statusChangedAt);

  return (
    <Link
      href={`/candidatos/${application.id}`}
      className={cn(
        'group relative block overflow-hidden rounded-xl border border-line-soft bg-paper p-3.5 shadow-card transition',
        'hover:-translate-y-0.5 hover:border-line',
        isApproved && 'border-gold/35 bg-gradient-to-t from-gold/[0.06] to-paper',
        isClosed && 'opacity-85',
      )}
    >
      {/* Leading accent — terra when stagnant, otherwise the status temperature */}
      <span
        className={cn('absolute inset-y-0 left-0', stale ? 'w-0.5 bg-terra' : cn('w-0.5', meta.dot))}
        aria-hidden
      />

      {/* Head: candidate + location + status signal */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium leading-snug text-ink">{person.name}</p>
          {person.cityName && (
            <p className="truncate text-[10.5px] leading-tight text-ink-mute">{person.cityName}</p>
          )}
        </div>
        {isNew ? (
          <span className="relative mt-1 flex shrink-0" aria-label={t('card.new')}>
            <span className="size-1.5 rounded-full bg-terra animate-pulse-dot" />
          </span>
        ) : isClosed ? (
          <span
            className={cn(
              'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium leading-tight',
              meta.chip,
            )}
          >
            {t(`status.${statusLabelKey(application.status)}`)}
          </span>
        ) : null}
      </div>

      {/* Animal of interest */}
      <div className="mt-2.5 flex items-center gap-2">
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- user media on R2/local
          <img
            src={coverUrl}
            alt={animal.name}
            loading="lazy"
            className="size-6 shrink-0 rounded-full object-cover"
          />
        ) : (
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-terra-bg text-[9px] font-medium text-terra">
            {initials(animal.name)}
          </span>
        )}
        <div className="min-w-0">
          <p className="display truncate text-sm italic leading-tight text-ink">{animal.name}</p>
          {animalMeta && (
            <p className="truncate text-[10px] leading-tight text-ink-mute">{animalMeta}</p>
          )}
        </div>
      </div>

      <AlertChips alerts={alerts} className="mt-2" />

      {/* Footer: when it last moved + who's responsible */}
      <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-line-soft pt-2">
        <span className={cn('text-[10.5px]', stale ? 'font-medium text-terra' : 'text-ink-mute')}>
          {isApproved ? t('card.approvedAt', { when }) : t('card.submitted', { when: submittedWhen })}
        </span>
        {assignee ? (
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="flex size-[18px] shrink-0 items-center justify-center rounded-full bg-green text-[8.5px] font-medium uppercase text-paper">
              {initials(assignee.name)}
            </span>
            <span className="truncate text-[10.5px] text-ink-soft">{assignee.name}</span>
          </span>
        ) : (
          <span className="text-[10.5px] italic text-ink-mute">{t('card.unassigned')}</span>
        )}
      </div>

      {isApproved && (
        <div className="mt-2 flex justify-end border-t border-gold/25 pt-2">
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-gold">
            {t('card.formalize')} →
          </span>
        </div>
      )}
    </Link>
  );
};
