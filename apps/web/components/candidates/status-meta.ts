import type { Application } from '@acolhe-animal/db';

export type ApplicationStatus = Application['status'];

export interface StatusMeta {
  /** Tailwind classes for a subtle status chip (bg + text). */
  chip: string;
  /** Accent color class for the leading dot. */
  dot: string;
}

/**
 * Status palette mirroring the funnel's emotional temperature:
 * novo → terra (fresh, needs a look), em análise → gold (in our hands),
 * aprovado → green (a yes), recusado/desistiu → ink-mute (closed, gently).
 *
 * Visible labels live in the `candidates` i18n namespace under `status.*`;
 * resolve them with {@link statusLabelKey}.
 */
export const STATUS_META: Record<ApplicationStatus, StatusMeta> = {
  draft: {
    chip: 'bg-bg-2 text-ink-mute',
    dot: 'bg-ink-mute',
  },
  new: {
    chip: 'bg-terra-bg text-terra',
    dot: 'bg-terra',
  },
  'in-progress': {
    chip: 'bg-gold/15 text-gold',
    dot: 'bg-gold',
  },
  approved: {
    chip: 'bg-green/10 text-green',
    dot: 'bg-green',
  },
  rejected: {
    chip: 'bg-bg-2 text-ink-mute',
    dot: 'bg-ink-mute',
  },
  withdrew: {
    chip: 'bg-bg-2 text-ink-mute',
    dot: 'bg-ink-mute',
  },
};

export type KanbanColumnKey = 'new' | 'in-progress' | 'approved' | 'closed';

/** The only kebab→camel key needing translation for `status.*` / `columns.*`. */
const toMessageKey = (value: string): string =>
  value === 'in-progress' ? 'inProgress' : value;

/** Map a status to its key under the `candidates.status.*` i18n namespace. */
export const statusLabelKey = (status: ApplicationStatus): string => toMessageKey(status);

/** Map a column key to its key under the `candidates.columns.*` i18n namespace. */
export const columnLabelKey = (key: KanbanColumnKey): string => toMessageKey(key);

/** Order of columns in the triage board. */
export const KANBAN_COLUMNS: {
  key: KanbanColumnKey;
  /** Statuses that fall under this column. */
  statuses: ApplicationStatus[];
  /** The "closed" column starts collapsed. */
  collapsed?: boolean;
}[] = [
  { key: 'new', statuses: ['new'] },
  { key: 'in-progress', statuses: ['in-progress'] },
  { key: 'approved', statuses: ['approved'] },
  {
    key: 'closed',
    statuses: ['rejected', 'withdrew'],
    collapsed: true,
  },
];
