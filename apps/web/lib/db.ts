/**
 * Re-export the shared db client so app code imports from a single local path
 * (`@/lib/db`) and we keep one seam if the data access ever moves behind an API.
 */
export { db } from '@acolhe-animal/db';
export type { Database } from '@acolhe-animal/db';
