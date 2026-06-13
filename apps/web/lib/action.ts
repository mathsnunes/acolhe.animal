import { isDomainError, type ActionResult } from '@acolhe-animal/shared';

/**
 * Wrap a Server Action body so domain errors become a typed {@link ActionResult}
 * the client can render, instead of throwing. Unexpected errors are logged and
 * surfaced as a generic message (never leak internals to the user).
 *
 *   export const createAnimalAction = (input) =>
 *     action(async () => { const ctx = await requireCtx(); return createAnimal(ctx, input); });
 */
export async function action<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    const data = await fn();
    return { ok: true, data };
  } catch (err) {
    if (isDomainError(err)) {
      return { ok: false, error: { code: err.code, message: err.message, fields: err.fields } };
    }
    console.error('[action] unexpected error:', err);
    return {
      ok: false,
      error: { code: 'internal', message: 'Algo deu errado. Tente novamente em instantes.' },
    };
  }
}
