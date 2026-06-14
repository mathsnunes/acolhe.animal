'use server';

import { revalidatePath } from 'next/cache';

import {
  archiveAnimal,
  autosaveAnimal,
  createAnimalDraft,
  publishAnimal,
  unarchiveAnimal,
  type AnimalDraftInput,
  type CreateAnimalInput,
} from '@acolhe-animal/domain';
import type { Animal } from '@acolhe-animal/db';
import type { ActionResult } from '@acolhe-animal/shared';

import { action } from '@/lib/action';
import { requireCtx } from '@/lib/auth-context';

/**
 * Server Actions for the Animais area. Each wraps the domain call in `action()`
 * so domain errors come back as a typed {@link ActionResult} instead of
 * throwing, then revalidates the listing. The domain re-validates every input
 * against its Zod schema, so these stay thin.
 */

/** Start a draft animal from the wizard's first step. Returns the created row (with its id). */
export const createAnimalDraftAction = async (input: AnimalDraftInput): Promise<ActionResult<Animal>> => {
  const ctx = await requireCtx();
  const result = await action(() => createAnimalDraft(ctx, input));
  if (result.ok) revalidatePath('/animais');
  return result;
};

/** Debounced autosave of partial wizard state into a draft (or an animal being edited). */
export const autosaveAnimalAction = async (id: string, patch: AnimalDraftInput): Promise<ActionResult<void>> => {
  const ctx = await requireCtx();
  return action(() => autosaveAnimal(ctx, id, patch));
};

/** Validate the full record and finalize it (draft → available, or save an edit). */
export const publishAnimalAction = async (id: string, input: CreateAnimalInput): Promise<ActionResult<Animal>> => {
  const ctx = await requireCtx();
  const result = await action(() => publishAnimal(ctx, id, input));
  if (result.ok) {
    revalidatePath('/animais');
    revalidatePath(`/animais/${id}`);
  }
  return result;
};

export const archiveAnimalAction = async (id: string): Promise<ActionResult> => {
  const ctx = await requireCtx();
  const result = await action(() => archiveAnimal(ctx, id));
  if (result.ok) {
    revalidatePath('/animais');
    revalidatePath(`/animais/${id}`);
  }
  return result;
};

export const unarchiveAnimalAction = async (id: string): Promise<ActionResult> => {
  const ctx = await requireCtx();
  const result = await action(() => unarchiveAnimal(ctx, id));
  if (result.ok) {
    revalidatePath('/animais');
    revalidatePath(`/animais/${id}`);
  }
  return result;
};
