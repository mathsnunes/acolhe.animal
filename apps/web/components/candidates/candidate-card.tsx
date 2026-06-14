import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { formatRelative, initials } from '@acolhe-animal/shared';
import type { ApplicationWithRelations } from '@acolhe-animal/domain';

import { cn } from '@/lib/utils';
import { STATUS_META, statusLabelKey } from './status-meta';

/**
 * A single candidacy in the triage board. The leading hairline accent and the
 * candidate's initials avatar key the card to the funnel's emotional temperature
 * (new → terra, em análise → gold, aprovado → green, encerrado → ink-mute). New
 * ones get a pulsing terra dot so the eye lands on what still needs a first look.
 */
export const CandidateCard = ({ application }: { application: ApplicationWithRelations }) => {
  const t = useTranslations('candidates');
  const isNew = application.status === 'new';
  const isApproved = application.status === 'approved';
  const isClosed = application.status === 'rejected' || application.status === 'withdrew';
  const meta = STATUS_META[application.status];
  const when = application.submittedAt ?? application.statusChangedAt;

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
      {/* Leading status accent */}
      <span
        className={cn('absolute inset-y-0 left-0 w-0.5', meta.dot)}
        aria-hidden
      />

      {/* Head: candidate + status signal */}
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 flex-1 truncate text-sm font-medium leading-snug text-ink">
          {application.person.name}
        </p>
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
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-terra-bg text-[9px] font-medium text-terra">
          {initials(application.animal.name)}
        </span>
        <div className="min-w-0">
          <p className="display truncate text-sm italic leading-tight text-ink">
            {application.animal.name}
          </p>
          <p className="truncate text-[10px] leading-tight text-ink-mute">
            {t(`species.${application.animal.species}`)}
          </p>
        </div>
      </div>

      {/* Footer: when it landed */}
      <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-line-soft pt-2 text-[10.5px] text-ink-mute">
        <span>{t('card.submitted', { when: formatRelative(when) })}</span>
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
