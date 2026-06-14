import { useTranslations } from 'next-intl';

import type { Animal } from '@acolhe-animal/db';

import { cn } from '@/lib/utils';
import type { Translator } from '@/lib/i18n';

export type AnimalStatus = Animal['status'];

/**
 * Single source of truth for how each animal status looks across the listing
 * tabs, the cards and the detail header. Dot colors follow
 * `04-componentes-navegacao.md` › Tabs de filtro (status). Labels are resolved
 * from the `animals` i18n namespace via {@link statusLabel}.
 */
export const statusMeta: Record<AnimalStatus, { dot: string; pill: string }> = {
  available: {
    dot: 'bg-green-soft',
    pill: 'bg-green/10 text-green',
  },
  'under-review': {
    dot: 'bg-gold',
    pill: 'bg-gold/15 text-gold',
  },
  reserved: {
    dot: 'bg-terra',
    pill: 'bg-terra-bg text-terra',
  },
  adopted: {
    dot: 'bg-ink-soft',
    pill: 'bg-bg-2 text-ink-soft',
  },
  unavailable: {
    dot: 'bg-ink-mute',
    pill: 'bg-bg-2 text-ink-mute',
  },
};

/** All animal statuses — the single web-side list (derived from {@link statusMeta}). */
export const ANIMAL_STATUSES = Object.keys(statusMeta) as AnimalStatus[];

/** Resolve the pt-BR label for a status using an `animals`-scoped translator. */
export const statusLabel = (t: Translator, status: AnimalStatus): string => {
  const key = status === 'under-review' ? 'underReview' : status;
  return t(`status.${key}`);
};

/** A colored dot + status label, the soft pill used on detail + cards. */
export const StatusPill = ({
  status,
  className,
}: {
  status: AnimalStatus;
  className?: string;
}) => {
  const t = useTranslations('animals');
  const meta = statusMeta[status];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium',
        meta.pill,
        className,
      )}
    >
      <span className={cn('size-1.5 rounded-full', meta.dot)} aria-hidden />
      {statusLabel(t, status)}
    </span>
  );
};

/** Just the dot — used inside the filter tabs and compact rows. */
export const StatusDot = ({
  status,
  className,
}: {
  status: AnimalStatus;
  className?: string;
}) => <span
      className={cn('size-[7px] shrink-0 rounded-full', statusMeta[status].dot, className)}
      aria-hidden
    />;
