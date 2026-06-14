'use server';

import { db, type Application } from '@acolhe-animal/db';
import {
  getOrganizationBySlug,
  saveDraft,
  startOrResumeApplication,
  submitApplication,
} from '@acolhe-animal/domain';
import { NotFoundError, type ActionResult } from '@acolhe-animal/shared';

import { action } from '@/lib/action';
import { publicCtx } from '@/lib/auth-context';

/**
 * Public adoption-form Server Actions. Every call re-resolves the organization
 * from the slug server-side and builds a `publicCtx` — the client never sends an
 * orgId, so a candidate can only ever write into the org whose portal they're on.
 */

const publicCtxForSlug = async (slug: string) => {
  const org = await getOrganizationBySlug(db, slug);
  if (!org || org.status !== 'active') {
    throw new NotFoundError('Organização não encontrada.');
  }
  return publicCtx(org.pk);
};

export type StartInput = {
  animalId: string;
  name: string;
  phone: string;
};

/** Step 1 → create (or resume) the draft. Returns the application id. */
export const startApplicationAction = async (slug: string, input: StartInput): Promise<ActionResult<Application>> => action(async () => {
    const ctx = await publicCtxForSlug(slug);
    return startOrResumeApplication(ctx, {
      animalId: input.animalId,
      person: { name: input.name.trim(), phone: input.phone },
    });
  });

/** Debounced autosave of the flat answers record for the active draft. */
export const saveDraftAction = async (slug: string, applicationId: string, applicationData: Record<string, unknown>): Promise<ActionResult<void>> => action(async () => {
    const ctx = await publicCtxForSlug(slug);
    await saveDraft(ctx, applicationId, { applicationData });
  });

/** Final submit → draft becomes `new` and the candidate is notified. */
export const submitApplicationAction = async (slug: string, applicationId: string): Promise<ActionResult<Application>> => action(async () => {
    const ctx = await publicCtxForSlug(slug);
    return submitApplication(ctx, applicationId);
  });
