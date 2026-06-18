import { z } from 'zod';

/**
 * Animal input schemas — shared by the form and the Server Action. Mirrors the
 * `animal` table (`modelagem-dados.md` › Animal). The age rule (a birth date OR
 * months-at-intake) is enforced here and by a DB CHECK.
 */
const sociabilityEnum = z.enum(['yes', 'no', 'with-care', 'unknown']);

export const clinicalConditionSchema = z.object({
  type: z.enum([
    'post-surgery-recovery',
    'chronic-treatment',
    'behavioral-rehabilitation',
    'other',
  ]),
  description: z.string().min(1),
  needsSpecialAdopter: z.boolean(),
  expectedResolution: z.string().nullable(),
});

export const vaccinationSchema = z.object({ name: z.string().min(1), date: z.string() });
export const dewormingSchema = z.object({ product: z.string().optional(), date: z.string().min(1) });

export const createAnimalSchema = z
  .object({
    name: z.string().trim().min(1, 'Informe o nome do animal.'),
    species: z.enum(['dog', 'cat']),
    sex: z.enum(['male', 'female']),

    estimatedBirthDate: z.coerce.date().optional(),
    ageMonthsAtIntake: z.number().int().nonnegative().optional(),
    ageReferenceDate: z.coerce.date().optional(),

    size: z.enum(['small', 'medium', 'large']).optional(),
    predominantColor: z.string().trim().optional(),
    weightKg: z.number().positive().optional(),
    microchipCode: z.string().trim().optional(),

    neutered: z.enum(['yes', 'no', 'scheduled']),
    vaccinations: z.array(vaccinationSchema).default([]),
    dewormings: z.array(dewormingSchema).default([]),
    specialConditions: z.array(z.string().trim().min(1)).default([]),
    clinicalCondition: clinicalConditionSchema.nullish(),

    energyLevel: z.enum(['calm', 'balanced', 'energetic']).optional(),
    goodWithChildren: sociabilityEnum.optional(),
    goodWithDogs: sociabilityEnum.optional(),
    goodWithCats: sociabilityEnum.optional(),
    goodWithStrangers: sociabilityEnum.optional(),
    quirks: z.string().trim().optional(),

    intakeDate: z.coerce.date(),
    rescueDate: z.coerce.date().optional(),
    rescueLocation: z.string().trim().optional(),
    shortStory: z.string().trim().optional(),

    visibleOnPortal: z.boolean().default(true),
    listedForAdoption: z.boolean().default(true),
  })
  .refine(
    (v) => v.estimatedBirthDate != null || v.ageMonthsAtIntake != null,
    {
      message: 'Informe a data de nascimento estimada ou a idade na entrada.',
      path: ['ageMonthsAtIntake'],
    },
  );

export const updateAnimalSchema = createAnimalSchema.innerType().partial();

/**
 * Patch schema for draft autosave: everything optional and — crucially — the
 * defaulted fields are re-declared WITHOUT their defaults, so a partial save
 * never silently overwrites existing vaccines/conditions/visibility with the
 * schema defaults. Only keys actually present in the patch are persisted.
 */
export const animalDraftSchema = createAnimalSchema
  .innerType()
  .partial()
  .extend({
    intakeDate: z.coerce.date().optional(),
    vaccinations: z.array(vaccinationSchema).optional(),
    dewormings: z.array(dewormingSchema).optional(),
    specialConditions: z.array(z.string().trim().min(1)).optional(),
    visibleOnPortal: z.boolean().optional(),
    listedForAdoption: z.boolean().optional(),
  });

export type CreateAnimalInput = z.input<typeof createAnimalSchema>;
export type UpdateAnimalInput = z.infer<typeof updateAnimalSchema>;
export type AnimalDraftInput = z.input<typeof animalDraftSchema>;
