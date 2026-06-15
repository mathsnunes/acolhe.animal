'use server';

import { revalidatePath } from 'next/cache';

import {
  archiveAnimal,
  autosaveAnimal,
  commitUpload,
  createAnimalDraft,
  deleteAnimalPhoto,
  deleteAnimalVideo,
  listAnimalPhotos,
  listAnimalVideos,
  publishAnimal,
  requestUploads,
  setAnimalCoverPhoto,
  unarchiveAnimal,
  type AnimalDraftInput,
  type CreateAnimalInput,
  type RequestUploadsInput,
  type UploadTicketResult,
} from '@acolhe-animal/domain';
import type { Animal, AnimalPhoto, AnimalVideo } from '@acolhe-animal/db';
import type { ActionResult } from '@acolhe-animal/shared';

import { action } from '@/lib/action';
import { requireCtx } from '@/lib/auth-context';
import type { AnimalsFilterInput, AnimalsPage } from '@/lib/animals-query';
import { loadAnimalsPage } from './load-animals';

/**
 * Server Actions for the Animais area. Each wraps the domain call in `action()`
 * so domain errors come back as a typed {@link ActionResult} instead of
 * throwing, then revalidates the listing. The domain re-validates every input
 * against its Zod schema, so these stay thin.
 */

/**
 * Next page of the animals listing for the infinite scroll. A read, so it skips
 * the `action()` wrapper and returns the page directly (the client appends it);
 * tenancy is enforced by `requireCtx` + the domain's org scoping, never the
 * client-supplied filters.
 */
export const loadAnimalsPageAction = async (input: {
  filters: AnimalsFilterInput;
  offset: number;
  limit: number;
}): Promise<AnimalsPage> => {
  const ctx = await requireCtx();
  return loadAnimalsPage(ctx, input.filters, input.offset, input.limit);
};

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

/* ── Uploads (photos & videos) ──────────────────────────────────────────────
 * The browser uploads bytes straight to storage with the presigned URL these
 * actions mint; each file is then committed (image processed inline, video
 * queued). See `docs/uploads.md`. */

/** Validate a batch + mint presigned upload URLs (one ledger row per file). */
export const requestUploadsAction = async (
  input: RequestUploadsInput,
): Promise<ActionResult<UploadTicketResult[]>> => {
  const ctx = await requireCtx();
  return action(() => requestUploads(ctx, input));
};

/** Finalize one uploaded file → an `animal_photo` (ready) or `animal_video` (queued). */
export const commitUploadAction = async (
  uploadId: string,
): Promise<ActionResult<AnimalPhoto | AnimalVideo>> => {
  const ctx = await requireCtx();
  return action(() => commitUpload(ctx, uploadId));
};

export const listAnimalPhotosAction = async (animalId: string): Promise<ActionResult<AnimalPhoto[]>> => {
  const ctx = await requireCtx();
  return action(() => listAnimalPhotos(ctx, animalId));
};

export const listAnimalVideosAction = async (animalId: string): Promise<ActionResult<AnimalVideo[]>> => {
  const ctx = await requireCtx();
  return action(() => listAnimalVideos(ctx, animalId));
};

export const deleteAnimalPhotoAction = async (photoId: string): Promise<ActionResult> => {
  const ctx = await requireCtx();
  return action(() => deleteAnimalPhoto(ctx, photoId));
};

/** Make a photo the animal's cover (exactly one per animal). */
export const setAnimalCoverAction = async (photoId: string): Promise<ActionResult> => {
  const ctx = await requireCtx();
  const result = await action(() => setAnimalCoverPhoto(ctx, photoId));
  if (result.ok) revalidatePath('/animais');
  return result;
};

export const deleteAnimalVideoAction = async (videoId: string): Promise<ActionResult> => {
  const ctx = await requireCtx();
  return action(() => deleteAnimalVideo(ctx, videoId));
};
