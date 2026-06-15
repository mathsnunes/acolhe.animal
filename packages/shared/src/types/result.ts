import type { DomainErrorCode } from '../errors';

/**
 * The contract between the domain/web boundary and the client.
 *
 * Server Actions return `ActionResult<T>` instead of throwing, so client
 * components can render field errors and messages predictably. Mapping from a
 * thrown `DomainError` to this shape lives in `apps/web/lib/action.ts`.
 */
export type ActionError = {
  code: DomainErrorCode;
  message: string;
  /** Field-level messages keyed by form field path. */
  fields?: Record<string, string>;
};

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: ActionError };

export type Paginated<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};
