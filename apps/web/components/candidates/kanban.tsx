'use client';

import { useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { ApplicationWithRelations } from '@acolhe-animal/domain';

import { cn } from '@/lib/utils';
import { CandidateCard } from './candidate-card';
import { KANBAN_COLUMNS, columnLabelKey, type KanbanColumnKey } from './status-meta';

/** Accent dot per column, mirroring the funnel's emotional temperature. */
const COLUMN_DOT: Record<KanbanColumnKey, string> = {
  new: 'bg-terra',
  'in-progress': 'bg-gold',
  approved: 'bg-green-soft',
  closed: 'bg-ink-mute',
};

/**
 * Responsive triage board. On wide screens the four columns sit side by side as
 * tinted lanes; on narrow screens they scroll horizontally so each lane keeps a
 * usable width. The closed column (recusados/desistiram) starts collapsed so the
 * focus stays on the live funnel.
 */
export function Kanban({ applications }: { applications: ApplicationWithRelations[] }) {
  const t = useTranslations('candidates');
  return (
    <div
      className={cn(
        'flex snap-x gap-3.5 overflow-x-auto px-6 pb-16 sm:px-10',
        'lg:grid lg:grid-cols-4 lg:overflow-visible',
      )}
    >
      {KANBAN_COLUMNS.map((column) => {
        const items = applications.filter((a) => column.statuses.includes(a.status));
        return (
          <KanbanColumn
            key={column.key}
            label={t(`columns.${columnLabelKey(column.key)}`)}
            dot={COLUMN_DOT[column.key]}
            count={items.length}
            collapsible={column.collapsed}
          >
            {items.map((application) => (
              <CandidateCard key={application.id} application={application} />
            ))}
          </KanbanColumn>
        );
      })}
    </div>
  );
}

function KanbanColumn({
  label,
  dot,
  count,
  collapsible,
  children,
}: {
  label: string;
  dot: string;
  count: number;
  collapsible?: boolean;
  children: ReactNode;
}) {
  const t = useTranslations('candidates');
  const [open, setOpen] = useState(!collapsible);
  const empty = count === 0;

  return (
    <section className="flex w-[82vw] shrink-0 snap-start flex-col rounded-xl bg-line/20 p-3 sm:w-72 lg:w-auto">
      {collapsible ? (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="mb-3 flex items-center gap-2 px-1 text-left"
        >
          <span className={cn('size-1.5 rounded-full', dot)} aria-hidden />
          <span className="display text-base text-ink">{label}</span>
          <span className="text-xs font-medium text-ink-mute">{count}</span>
          <ChevronDown
            className={cn('ml-auto size-4 text-ink-mute transition-transform', open && 'rotate-180')}
          />
        </button>
      ) : (
        <div className="mb-3 flex items-center gap-2 px-1">
          <span className={cn('size-1.5 rounded-full', dot)} aria-hidden />
          <span className="display text-base text-ink">{label}</span>
          <span className="text-xs font-medium text-ink-mute">{count}</span>
        </div>
      )}

      {open && (
        <div className="flex flex-col gap-2.5">
          {empty ? (
            <p className="display py-9 text-center text-xs italic text-ink-mute">
              {t('kanban.empty')}
            </p>
          ) : (
            children
          )}
        </div>
      )}
    </section>
  );
}
