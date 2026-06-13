/**
 * Domain error taxonomy.
 *
 * The domain layer throws `DomainError` (or a subclass) for expected,
 * user-meaningful failures. The web layer (Server Actions / Route Handlers)
 * catches these and maps them to an {@link ActionResult} — see
 * `apps/web/lib/action.ts`. Unexpected errors (bugs) are left to bubble up.
 *
 * `message` is end-user-facing pt-BR copy; `code` is the stable machine key.
 */
export type DomainErrorCode =
  | 'not_found'
  | 'unauthorized'
  | 'forbidden'
  | 'validation'
  | 'conflict'
  | 'precondition_failed'
  | 'rate_limited'
  | 'integration_error'
  | 'internal';

export class DomainError extends Error {
  readonly code: DomainErrorCode;
  /** Optional field-level details for form errors (field path → message). */
  readonly fields?: Record<string, string>;

  constructor(
    code: DomainErrorCode,
    message: string,
    options?: { fields?: Record<string, string>; cause?: unknown },
  ) {
    super(message, { cause: options?.cause });
    this.name = 'DomainError';
    this.code = code;
    this.fields = options?.fields;
  }
}

export class NotFoundError extends DomainError {
  constructor(message = 'Não encontramos o que você procura.') {
    super('not_found', message);
    this.name = 'NotFoundError';
  }
}

export class ForbiddenError extends DomainError {
  constructor(message = 'Você não tem permissão para fazer isso.') {
    super('forbidden', message);
    this.name = 'ForbiddenError';
  }
}

export class ConflictError extends DomainError {
  constructor(message: string, fields?: Record<string, string>) {
    super('conflict', message, { fields });
    this.name = 'ConflictError';
  }
}

export class ValidationError extends DomainError {
  constructor(message: string, fields?: Record<string, string>) {
    super('validation', message, { fields });
    this.name = 'ValidationError';
  }
}

export function isDomainError(err: unknown): err is DomainError {
  return err instanceof DomainError;
}
