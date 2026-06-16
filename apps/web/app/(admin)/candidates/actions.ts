'use server';

import { revalidatePath } from 'next/cache';

import {
  assignApplication,
  setApplicationStatus,
  updateApplicationNotes,
  finalizeDigitalAdoption,
  createManualApplication,
  getApplication,
} from '@acolhe-animal/domain';

import { action } from '@/lib/action';
import { requireCtx } from '@/lib/auth-context';
import type { CandidatesFilterInput, CandidatesPage } from '@/lib/candidates-query';
import { loadCandidatesPage } from './load-candidates';

type TriageStatus = 'in-progress' | 'approved' | 'rejected' | 'withdrew';

/**
 * Next page of the candidates listing for the infinite scroll. A read, so it
 * skips the `action()` wrapper and returns the page directly (the client appends
 * it); tenancy is enforced by `requireCtx` + the domain's org scoping, never the
 * client-supplied filters.
 */
export const loadCandidatesPageAction = async (input: {
  filters: CandidatesFilterInput;
  offset: number;
  limit: number;
}): Promise<CandidatesPage> => {
  const ctx = await requireCtx();
  return loadCandidatesPage(ctx, input.filters, input.offset, input.limit);
};

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

/**
 * Save (or update) the internal notes. Editing a brand-`new` candidacy nudges it
 * to `in-progress` (someone is now looking at it); at every other status the notes
 * are updated without touching the funnel stage — including terminal ones.
 */
export const saveNotesAction = async (id: string, internalNotes: string) =>
  action(async () => {
    const ctx = await requireCtx();
    const app = await getApplication(ctx, id);
    const row =
      app.status === 'new'
        ? await setApplicationStatus(ctx, id, 'in-progress', { internalNotes })
        : await updateApplicationNotes(ctx, id, internalNotes);
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

/** Staff-create a candidacy (fair/presential) straight into the funnel. */
export const createManualCandidacyAction = async (input: {
  animalId: string;
  person: {
    name: string;
    phone: string;
    email?: string;
    cpf?: string;
    cityId?: string;
    streetAddress?: string;
    addressNumber?: string;
    addressComplement?: string;
    addressNeighborhood?: string;
    postalCode?: string;
  };
}) =>
  action(async () => {
    const ctx = await requireCtx();
    const app = await createManualApplication(ctx, input);
    revalidatePath('/candidatos');
    return { id: app.id };
  });

/** Formalize a digital adoption from an approved candidacy. */
export const finalizeAdoptionAction = async (input: {
  applicationId: string;
  adopterDocument: string;
  adopterAddress: {
    street: string;
    number: string;
    complement?: string;
    neighborhood?: string;
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
