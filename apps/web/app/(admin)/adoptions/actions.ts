'use server';

import { revalidatePath } from 'next/cache';

import { registerOfflineAdoption, cancelAdoption, updateAdoption } from '@acolhe-animal/domain';

import { action } from '@/lib/action';
import { requireCtx } from '@/lib/auth-context';

/** Register an adoption that happened in person (fair, event, walk-in). */
export const registerOfflineAction = async (input: {
  animalId: string;
  adopter: {
    name: string;
    phone: string;
    document: string;
    email?: string;
    postalCode?: string;
  };
  adopterAddress: {
    street: string;
    number: string;
    complement?: string;
    city: string;
    state: string;
    postalCode: string;
  };
  termPdfUrl: string;
  adoptedAt: string;
}) =>
  action(async () => {
    const ctx = await requireCtx();
    const adoption = await registerOfflineAdoption(ctx, input);
    revalidatePath('/adocoes');
    revalidatePath('/animais');
    return adoption;
  });

/** Correct an existing adoption's values + responsible and regenerate the term PDF. */
export const updateAdoptionAction = async (input: {
  adoptionId: string;
  animalId: string;
  adopterName: string;
  adopterDocument: string;
  adopterPhone: string;
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
  responsibleUserId?: string;
}) =>
  action(async () => {
    const ctx = await requireCtx();
    const { adoptionId, animalId, ...patch } = input;
    const adoption = await updateAdoption(ctx, adoptionId, patch);
    revalidatePath(`/animais/${animalId}`);
    revalidatePath('/adocoes');
    return adoption;
  });

/** Register a return/giveback: cancels the adoption and frees the animal again. */
export const cancelAdoptionAction = async (input: { adoptionId: string; reason: string }) =>
  action(async () => {
    const ctx = await requireCtx();
    await cancelAdoption(ctx, input.adoptionId, input.reason);
    revalidatePath('/adocoes');
    revalidatePath(`/adocoes/${input.adoptionId}`);
    revalidatePath('/animais');
    revalidatePath('/candidatos');
    return { ok: true };
  });
