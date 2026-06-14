'use server';

import { revalidatePath } from 'next/cache';

import {
  assignApplication,
  setApplicationStatus,
  finalizeDigitalAdoption,
  getApplication,
  type Ctx,
} from '@acolhe-animal/domain';

import { action } from '@/lib/action';
import { requireCtx } from '@/lib/auth-context';

type TriageStatus = 'in-progress' | 'approved' | 'rejected' | 'withdrew';

/** Move a candidacy through the funnel, optionally saving internal notes. */
export const setStatusAction = async (
  id: string,
  status: TriageStatus,
  internalNotes?: string,
) =>
  action(async () => {
    const ctx = await requireCtx();
    const row = await setApplicationStatus(ctx, id, status, { internalNotes });
    revalidatePath('/candidatos');
    revalidatePath(`/candidatos/${id}`);
    return row;
  });

/** Save (or update) the internal notes without changing status. */
export const saveNotesAction = async (id: string, internalNotes: string) =>
  action(async () => {
    const ctx = await requireCtx();
    // Re-assert the current status so notes can be edited at any stage.
    const row = await setApplicationStatusKeepingStage(ctx, id, internalNotes);
    revalidatePath(`/candidatos/${id}`);
    return row;
  });

/** Assign a member as responsible (also nudges `new` â†’ `in-progress`). */
export const assignAction = async (id: string, userId: string) =>
  action(async () => {
    const ctx = await requireCtx();
    await assignApplication(ctx, id, userId);
    revalidatePath('/candidatos');
    revalidatePath(`/candidatos/${id}`);
    return { ok: true };
  });

/** Formalize a digital adoption from an approved candidacy. */
export const finalizeAdoptionAction = async (input: {
  applicationId: string;
  adopterDocument: string;
  adopterAddress: {
    street: string;
    number: string;
    complement?: string;
    city: string;
    state: string;
    postalCode: string;
  };
  extraClauses?: string;
  signature: { ip: string; userAgent: string };
}) =>
  action(async () => {
    const ctx = await requireCtx();
    const adoption = await finalizeDigitalAdoption(ctx, input);
    revalidatePath('/candidatos');
    revalidatePath(`/candidatos/${input.applicationId}`);
    revalidatePath('/adocoes');
    return adoption;
  });

/**
 * Notes are persisted through {@link setApplicationStatus}, which only accepts
 * the four "triage" statuses. To edit notes without advancing the funnel we read
 * the current status and re-apply it when it's one of those; otherwise (a `new`
 * candidacy) we move it to `in-progress`, since editing notes means someone is
 * already looking at it.
 */
const setApplicationStatusKeepingStage = async (ctx: Ctx, id: string, internalNotes: string) => {
  const app = await getApplication(ctx, id);
  const stage: TriageStatus =
    app.status === 'in-progress' ||
    app.status === 'approved' ||
    app.status === 'rejected' ||
    app.status === 'withdrew'
      ? app.status
      : 'in-progress';
  return setApplicationStatus(ctx, id, stage, { internalNotes });
};
