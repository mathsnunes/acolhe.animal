import { and, asc, desc, eq, ilike, inArray, isNull, ne } from 'drizzle-orm';

import { createId, NotFoundError, ValidationError } from '@acolhe-animal/shared';
import { animal, type Animal, type NewAnimal } from '@acolhe-animal/db';

import type { Ctx } from '../context';
import { assertCanManageAnimals } from '../auth/permissions';
import { emitTimelineEvent } from '../timeline/timeline';
import { animalDraftSchema, createAnimalSchema, updateAnimalSchema } from './schemas';

/**
 * Animal operations. Every query is scoped to `ctx.organizationId` — the tenant
 * boundary is enforced here, not in the UI. Validation runs against the Zod
 * schemas so the domain owns its invariants regardless of caller.
 */

const toRow = (data: ReturnType<typeof createAnimalSchema.parse>, organizationId: number) => ({
    id: createId('animal'),
    organizationId,
    name: data.name,
    species: data.species,
    sex: data.sex,
    estimatedBirthDate: data.estimatedBirthDate ?? null,
    ageMonthsAtIntake: data.ageMonthsAtIntake ?? null,
    ageReferenceDate:
      data.ageReferenceDate ?? (data.ageMonthsAtIntake != null ? new Date() : null),
    size: data.size ?? null,
    predominantColor: data.predominantColor ?? null,
    weightKg: data.weightKg != null ? String(data.weightKg) : null,
    neutered: data.neutered,
    vaccinations: data.vaccinations,
    specialConditions: data.specialConditions,
    clinicalCondition: data.clinicalCondition ?? null,
    energyLevel: data.energyLevel ?? null,
    goodWithChildren: data.goodWithChildren ?? null,
    goodWithDogs: data.goodWithDogs ?? null,
    goodWithCats: data.goodWithCats ?? null,
    goodWithStrangers: data.goodWithStrangers ?? null,
    quirks: data.quirks ?? null,
    intakeDate: data.intakeDate,
    rescueDate: data.rescueDate ?? null,
    rescueLocation: data.rescueLocation ?? null,
    shortStory: data.shortStory ?? null,
    visibleOnPortal: data.visibleOnPortal,
    listedForAdoption: data.listedForAdoption,
  });

export const createAnimal = async (ctx: Ctx, input: unknown): Promise<Animal> => {
  assertCanManageAnimals(ctx);
  const data = createAnimalSchema.parse(input);

  const [row] = await ctx.db.insert(animal).values(toRow(data, ctx.organizationId)).returning();
  if (!row) throw new Error('Falha ao cadastrar o animal.');

  await emitTimelineEvent(ctx, {
    eventType: 'animal.created',
    entityType: 'animal',
    entityId: row.id,
    payload: { name: row.name },
  });
  return row;
};

export const updateAnimal = async (ctx: Ctx, id: string, input: unknown): Promise<Animal> => {
  assertCanManageAnimals(ctx);
  await getAnimal(ctx, id); // ensures it exists in this org
  const data = updateAnimalSchema.parse(input);

  const patch: Record<string, unknown> = { ...data };
  if (data.weightKg != null) patch.weightKg = String(data.weightKg);

  const [row] = await ctx.db
    .update(animal)
    .set(patch)
    .where(and(eq(animal.id, id), eq(animal.organizationId, ctx.organizationId)))
    .returning();
  if (!row) throw new NotFoundError('Animal não encontrado.');
  return row;
};

export const archiveAnimal = async (ctx: Ctx, id: string): Promise<void> => {
  assertCanManageAnimals(ctx);
  await getAnimal(ctx, id);
  await ctx.db
    .update(animal)
    .set({ archivedAt: new Date() })
    .where(and(eq(animal.id, id), eq(animal.organizationId, ctx.organizationId)));
  await emitTimelineEvent(ctx, { eventType: 'animal.archived', entityType: 'animal', entityId: id });
};

export const unarchiveAnimal = async (ctx: Ctx, id: string): Promise<void> => {
  assertCanManageAnimals(ctx);
  await ctx.db
    .update(animal)
    .set({ archivedAt: null })
    .where(and(eq(animal.id, id), eq(animal.organizationId, ctx.organizationId)));
  await emitTimelineEvent(ctx, {
    eventType: 'animal.unarchived',
    entityType: 'animal',
    entityId: id,
  });
};

export interface ListAnimalsFilters {
  status?: Animal['status'][];
  search?: string;
  species?: Animal['species'];
  size?: Animal['size'];
  includeArchived?: boolean;
  /** Drafts (status `draft`) are hidden unless this is set. */
  includeDrafts?: boolean;
  /** `recent` (newest first, default) or `name` (A→Z). */
  orderBy?: 'recent' | 'name';
}

export const listAnimals = async (ctx: Ctx, filters: ListAnimalsFilters = {}): Promise<Animal[]> => {
  const conditions = [eq(animal.organizationId, ctx.organizationId)];
  if (!filters.includeArchived) conditions.push(isNull(animal.archivedAt));
  if (!filters.includeDrafts) conditions.push(ne(animal.status, 'draft'));
  if (filters.status?.length) conditions.push(inArray(animal.status, filters.status));
  if (filters.species) conditions.push(eq(animal.species, filters.species));
  if (filters.size) conditions.push(eq(animal.size, filters.size));
  if (filters.search) conditions.push(ilike(animal.name, `%${filters.search}%`));

  const order = filters.orderBy === 'name' ? asc(animal.name) : desc(animal.createdAt);
  return ctx.db
    .select()
    .from(animal)
    .where(and(...conditions))
    .orderBy(order);
};

export const getAnimal = async (ctx: Ctx, id: string): Promise<Animal> => {
  const [row] = await ctx.db
    .select()
    .from(animal)
    .where(and(eq(animal.id, id), eq(animal.organizationId, ctx.organizationId)))
    .limit(1);
  if (!row) throw new NotFoundError('Animal não encontrado.');
  return row;
};

/** Look up an Animal by its surrogate key (`animalId` foreign keys carry the pk). */
export const getAnimalByPk = async (ctx: Ctx, pk: number): Promise<Animal> => {
  const [row] = await ctx.db
    .select()
    .from(animal)
    .where(and(eq(animal.pk, pk), eq(animal.organizationId, ctx.organizationId)))
    .limit(1);
  if (!row) throw new NotFoundError('Animal não encontrado.');
  return row;
};

/* ── Draft-based wizard (create → autosave → publish) ───────────────────────── */

/** Optional columns nulled (not skipped) on a full publish, so clearing persists. */
const NULLABLE_ON_PUBLISH = new Set<keyof NewAnimal>([
  'size',
  'predominantColor',
  'weightKg',
  'estimatedBirthDate',
  'ageMonthsAtIntake',
  'ageReferenceDate',
  'energyLevel',
  'goodWithChildren',
  'goodWithDogs',
  'goodWithCats',
  'goodWithStrangers',
  'quirks',
  'rescueDate',
  'rescueLocation',
  'shortStory',
  'clinicalCondition',
  'neutered',
]);

/**
 * Map validated input → row columns. `full` (publish) writes null for absent
 * optionals so clearing a field sticks; partial (draft/autosave) only sets the
 * keys actually present.
 */
const buildAnimalRow = (
  data: ReturnType<typeof animalDraftSchema.parse>,
  full: boolean,
): Partial<NewAnimal> => {
  const row: Partial<NewAnimal> = {};
  const put = <K extends keyof NewAnimal>(key: K, value: NewAnimal[K] | undefined): void => {
    if (value !== undefined) row[key] = value;
    else if (full && NULLABLE_ON_PUBLISH.has(key)) row[key] = null as NewAnimal[K];
  };

  put('name', data.name);
  put('species', data.species);
  put('sex', data.sex);
  put('size', data.size);
  put('predominantColor', data.predominantColor);
  put('weightKg', data.weightKg != null ? String(data.weightKg) : undefined);
  put('neutered', data.neutered);
  put('vaccinations', data.vaccinations);
  put('specialConditions', data.specialConditions);
  put('clinicalCondition', data.clinicalCondition ?? undefined);
  put('energyLevel', data.energyLevel);
  put('goodWithChildren', data.goodWithChildren);
  put('goodWithDogs', data.goodWithDogs);
  put('goodWithCats', data.goodWithCats);
  put('goodWithStrangers', data.goodWithStrangers);
  put('quirks', data.quirks);
  put('intakeDate', data.intakeDate);
  put('rescueDate', data.rescueDate);
  put('rescueLocation', data.rescueLocation);
  put('shortStory', data.shortStory);
  put('visibleOnPortal', data.visibleOnPortal);
  put('listedForAdoption', data.listedForAdoption);
  put('estimatedBirthDate', data.estimatedBirthDate);
  put('ageMonthsAtIntake', data.ageMonthsAtIntake);
  const ageRef =
    data.ageReferenceDate ?? (data.ageMonthsAtIntake != null ? new Date() : undefined);
  put('ageReferenceDate', ageRef);

  return row;
};

/**
 * Create a draft animal (`status: 'draft'`) from the first wizard step. Only the
 * identity essentials are required; everything else fills in over autosaves.
 */
export const createAnimalDraft = async (ctx: Ctx, input: unknown): Promise<Animal> => {
  assertCanManageAnimals(ctx);
  const data = animalDraftSchema.parse(input);
  if (!data.name || !data.species || !data.sex) {
    throw new ValidationError('Informe nome, espécie e sexo para iniciar o cadastro.');
  }

  const [created] = await ctx.db
    .insert(animal)
    .values({
      ...buildAnimalRow(data, false),
      id: createId('animal'),
      organizationId: ctx.organizationId,
      status: 'draft',
      name: data.name,
      species: data.species,
      sex: data.sex,
      intakeDate: data.intakeDate ?? new Date(),
    })
    .returning();
  if (!created) throw new Error('Falha ao criar o rascunho do animal.');
  return created;
};

/** Persist a partial patch to a draft (or an animal being edited). No-op if empty. */
export const autosaveAnimal = async (ctx: Ctx, id: string, patch: unknown): Promise<void> => {
  assertCanManageAnimals(ctx);
  const row = buildAnimalRow(animalDraftSchema.parse(patch), false);
  if (Object.keys(row).length === 0) return;
  await ctx.db
    .update(animal)
    .set(row)
    .where(and(eq(animal.id, id), eq(animal.organizationId, ctx.organizationId)));
};

/**
 * Validate the full record and finalize it. A draft flips to `available` (and
 * gets its `animal.created` timeline event); an already-published animal keeps
 * its status — this doubles as "save" for the edit wizard.
 */
export const publishAnimal = async (ctx: Ctx, id: string, input: unknown): Promise<Animal> => {
  assertCanManageAnimals(ctx);
  const existing = await getAnimal(ctx, id);
  const row = buildAnimalRow(createAnimalSchema.parse(input), true);

  const wasDraft = existing.status === 'draft';
  if (wasDraft) row.status = 'available';

  const [updated] = await ctx.db
    .update(animal)
    .set(row)
    .where(and(eq(animal.id, id), eq(animal.organizationId, ctx.organizationId)))
    .returning();
  if (!updated) throw new NotFoundError('Animal não encontrado.');

  if (wasDraft) {
    await emitTimelineEvent(ctx, {
      eventType: 'animal.created',
      entityType: 'animal',
      entityId: updated.id,
      payload: { name: updated.name },
    });
  }
  return updated;
};
