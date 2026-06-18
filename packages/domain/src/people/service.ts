import { and, eq } from 'drizzle-orm';
import { z } from 'zod';

import { createId, NotFoundError } from '@acolhe-animal/shared';
import { cpfSchema, optionalEmailSchema, phoneSchema, postalCodeSchema } from '@acolhe-animal/shared';
import { person, type Person } from '@acolhe-animal/db';

import type { Ctx } from '../context';

/**
 * Person operations. A Person is per-tenant identity (candidate / adopter), not a
 * system user. Matching for the public form is by `(organizationId, phone)`. See
 * `modelagem-dados.md` › Person.
 */
export const personIdentitySchema = z.object({
  name: z.string().trim().min(1, 'Informe o nome.'),
  phone: phoneSchema,
  email: optionalEmailSchema,
  cpf: cpfSchema.optional(),
  cityId: z.string().optional(),
  streetAddress: z.string().trim().optional(),
  addressNumber: z.string().trim().optional(),
  addressComplement: z.string().trim().optional(),
  addressNeighborhood: z.string().trim().optional(),
  postalCode: postalCodeSchema.optional(),
});

export type PersonIdentityInput = z.input<typeof personIdentitySchema>;

export const findPersonByPhone = async (ctx: Ctx, phone: string): Promise<Person | null> => {
  const [row] = await ctx.db
    .select()
    .from(person)
    .where(and(eq(person.organizationId, ctx.organizationId), eq(person.phone, phone)))
    .limit(1);
  return row ?? null;
};

export const getPerson = async (ctx: Ctx, id: string): Promise<Person> => {
  const [row] = await ctx.db
    .select()
    .from(person)
    .where(and(eq(person.id, id), eq(person.organizationId, ctx.organizationId)))
    .limit(1);
  if (!row) throw new NotFoundError('Pessoa não encontrada.');
  return row;
};

/** Look up a Person by its surrogate key (`personId` foreign keys carry the pk). */
export const getPersonByPk = async (ctx: Ctx, pk: number): Promise<Person> => {
  const [row] = await ctx.db
    .select()
    .from(person)
    .where(and(eq(person.pk, pk), eq(person.organizationId, ctx.organizationId)))
    .limit(1);
  if (!row) throw new NotFoundError('Pessoa não encontrada.');
  return row;
};

/**
 * Match a Person by phone within the org; update identity if found, create
 * otherwise. The canonical "current identity" is always the latest — historical
 * answers live frozen in `application.applicationData`.
 */
export const upsertPersonByPhone = async (ctx: Ctx, input: unknown): Promise<Person> => {
  const data = personIdentitySchema.parse(input);
  const existing = await findPersonByPhone(ctx, data.phone);

  const values = {
    name: data.name,
    email: data.email ?? null,
    cpf: data.cpf ?? null,
    cityId: data.cityId ?? null,
    streetAddress: data.streetAddress ?? null,
    addressNumber: data.addressNumber ?? null,
    addressComplement: data.addressComplement ?? null,
    addressNeighborhood: data.addressNeighborhood ?? null,
    postalCode: data.postalCode ?? null,
  };

  if (existing) {
    const [row] = await ctx.db
      .update(person)
      .set(values)
      .where(eq(person.id, existing.id))
      .returning();
    return row!;
  }

  const [row] = await ctx.db
    .insert(person)
    .values({ id: createId('person'), organizationId: ctx.organizationId, phone: data.phone, ...values })
    .returning();
  return row!;
};
