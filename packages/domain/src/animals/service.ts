import { and, asc, desc, eq, ilike, inArray, isNull } from 'drizzle-orm';

import { createId, NotFoundError } from '@acolhe-animal/shared';
import { animal, type Animal } from '@acolhe-animal/db';

import type { Ctx } from '../context';
import { assertCanManageAnimals } from '../auth/permissions';
import { emitTimelineEvent } from '../timeline/timeline';
import { createAnimalSchema, updateAnimalSchema } from './schemas';

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
  /** `recent` (newest first, default) or `name` (A→Z). */
  orderBy?: 'recent' | 'name';
}

export const listAnimals = async (ctx: Ctx, filters: ListAnimalsFilters = {}): Promise<Animal[]> => {
  const conditions = [eq(animal.organizationId, ctx.organizationId)];
  if (!filters.includeArchived) conditions.push(isNull(animal.archivedAt));
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
