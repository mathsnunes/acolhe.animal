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

/** Staff-created candidacy: who + which animal + optional questionnaire answers. */
export const manualApplicationSchema = z.object({
  animalId: z.string().min(1),
  person: personIdentitySchema,
  applicationData: applicationDataSchema.optional(),
});

export type StartApplicationInput = z.input<typeof startApplicationSchema>;
export type ManualApplicationInput = z.input<typeof manualApplicationSchema>;
