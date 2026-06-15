import type { ApplicationStatusGroup, CandidateListRow, ListApplicationsFilters } from '@acolhe-animal/domain';

/**
 * Canonical (English) filter parsing + the candidates listing's page shape, shared
 * by the server page (first page / full kanban set) and the "load more" Server
 * Action so every fetch runs the same query. The URL is pt-BR and decoded upstream
 * (`lib/candidates-search-params.ts`); here we only validate the canonical values
 * and map them to the domain's {@link ListApplicationsFilters}.
 */

const STATUS_GROUPS = ['new', 'in-progress', 'approved', 'closed'] as const;

/** Canonical filter values as held in the URL/UI (before mapping to the domain). */
export interface CandidatesFilterInput {
  /** Funnel bucket = status tab; omit for "all". */
  status?: string;
  search?: string;
  /** Animal public id. */
  animal?: string;
  /** Member user id, the `UNASSIGNED` sentinel, or omitted for "everyone". */
  responsible?: string;
}

/** Sentinel for the "sem responsável" filter option (kept in the URL as `responsavel=sem`). */
export const UNASSIGNED = 'sem';

export const asStatusGroup = (v?: string): ApplicationStatusGroup | undefined =>
  STATUS_GROUPS.includes(v as ApplicationStatusGroup) ? (v as ApplicationStatusGroup) : undefined;

/** Map canonical URL filters → the domain's filters. */
export const toListApplicationsFilters = (f: CandidatesFilterInput): ListApplicationsFilters => ({
  statusGroup: asStatusGroup(f.status),
  search: f.search?.trim() || undefined,
  animalId: f.animal || undefined,
  unassigned: f.responsible === UNASSIGNED,
  assignedToUserId:
    f.responsible && f.responsible !== UNASSIGNED ? f.responsible : undefined,
});

/**
 * A derived attention flag rendered as a chip on the card/row. Computed in the
 * load layer from staleness, the person's other candidacies, and their adoption
 * history — never from the (untyped) form answers.
 */
export type CandidateAlert =
  | { kind: 'stale'; days: number }
  | { kind: 'multiple'; animalName: string }
  | { kind: 'adopted-before' }
  | { kind: 'returned-before' };

/** One candidacy as the listing renders it: the row plus its derived cover + alerts. */
export interface CandidateListItem {
  application: CandidateListRow;
  coverUrl: string | null;
  alerts: CandidateAlert[];
  /** Stagnant in the funnel (new/in-progress, untouched past the threshold). */
  stale: boolean;
}

/** A page of the admin listing, returned by the server page and the load-more action. */
export interface CandidatesPage {
  items: CandidateListItem[];
  /** Offset to request next; pass straight back into the action. */
  nextOffset: number;
  hasMore: boolean;
}

/** Rows fetched per page on the flat (table / mobile) listing. */
export const CANDIDATES_PAGE_SIZE = 20;

/**
 * Upper bound for the desktop kanban's single full-set fetch. An NGO's live funnel
 * is dozens of candidacies, so this comfortably holds "everything" without paging;
 * the rare overflow still falls back to infinite scroll on the flat views.
 */
export const CANDIDATES_KANBAN_CAP = 500;

/** A candidacy is "stale" once it sits untouched in an open stage past this many days. */
export const STALE_AFTER_DAYS = 3;
