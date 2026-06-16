import { z } from 'zod';

import { personIdentitySchema } from '../people/service';

/**
 * Application input schemas. The public 6-step form answers are stored as a
 * flexible JSON snapshot (`applicationData`) validated loosely here — the exact
 * question set evolves per `formVersion` without a migration.
 */
export const applicationDataSchema = z.record(z.string(), z.unknown());

/** Start (or resume) a draft from the public form: who + which animal. */
export const startApplicationSchema = z.object({
  animalId: z.string().min(1),
  person: personIdentitySchema,
});

export const saveDraftSchema = z.object({
  applicationData: applicationDataSchema,
});

/**
 * Staff-built candidacy draft (autosaved). `applicationId` is absent on the first
 * save (creates the draft) and present afterwards (updates it). Who + which animal
 * + optional questionnaire answers — finalized separately into the funnel.
 */
export const manualDraftSchema = z.object({
  applicationId: z.string().optional(),
  animalId: z.string().min(1),
  person: personIdentitySchema,
  applicationData: applicationDataSchema.optional(),
});

export type StartApplicationInput = z.input<typeof startApplicationSchema>;
export type ManualDraftInput = z.input<typeof manualDraftSchema>;
