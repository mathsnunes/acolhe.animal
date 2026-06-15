/**
 * @acolhe-animal/domain — pure business logic. No Next, no HTTP, no session.
 *
 * Every operation takes a `Ctx` (db + tenant + actor); the web layer builds the
 * Ctx and calls in. This boundary is what lets the backend be extracted later.
 */
export * from './context';
export * from './auth/permissions';
export * from './timeline/timeline';
export * from './audit/audit';
export * from './organizations';
export * from './animals';
export * from './uploads';
export * from './people';
export * from './applications';
export * from './adoptions';
