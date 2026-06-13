'use server';

import { revalidatePath } from 'next/cache';

import {
  archiveAnimal,
  createAnimal,
  unarchiveAnimal,
  updateAnimal,
  type CreateAnimalInput,
  type UpdateAnimalInput,
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

export async function createAnimalAction(
  input: CreateAnimalInput,
): Promise<ActionResult<Animal>> {
  const ctx = await requireCtx();
  const result = await action(() => createAnimal(ctx, input));
  if (result.ok) revalidatePath('/animais');
  return result;
}

export async function updateAnimalAction(
  id: string,
  input: UpdateAnimalInput,
): Promise<ActionResult<Animal>> {
  const ctx = await requireCtx();
  const result = await action(() => updateAnimal(ctx, id, input));
  if (result.ok) {
    revalidatePath('/animais');
    revalidatePath(`/animais/${id}`);
  }
  return result;
}

export async function archiveAnimalAction(id: string): Promise<ActionResult> {
  const ctx = await requireCtx();
  const result = await action(() => archiveAnimal(ctx, id));
  if (result.ok) {
    revalidatePath('/animais');
    revalidatePath(`/animais/${id}`);
  }
  return result;
}

export async function unarchiveAnimalAction(id: string): Promise<ActionResult> {
  const ctx = await requireCtx();
  const result = await action(() => unarchiveAnimal(ctx, id));
  if (result.ok) {
    revalidatePath('/animais');
    revalidatePath(`/animais/${id}`);
  }
  return result;
}
