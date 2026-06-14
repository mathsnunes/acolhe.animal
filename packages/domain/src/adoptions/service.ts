import { createHash } from 'node:crypto';

import { and, eq } from 'drizzle-orm';
import { z } from 'zod';

import { createId, NotFoundError, ConflictError } from '@acolhe-animal/shared';
import { cpfSchema, optionalEmailSchema, phoneSchema, postalCodeSchema } from '@acolhe-animal/shared';
import {
  adoption,
  animal,
  application,
  organization,
  person,
  type Adoption,
} from '@acolhe-animal/db';
import { getStorage } from '@acolhe-animal/integrations';

import type { Ctx } from '../context';
import { withTransaction } from '../context';
import { assertCanManageAnimals } from '../auth/permissions';
import { emitTimelineEvent } from '../timeline/timeline';
import { getPersonByPk, upsertPersonByPhone } from '../people/service';
import { composeAdoptionTerm, renderTermHtml } from './term';

const addressSnapshotSchema = z.object({
  street: z.string().default(''),
  number: z.string().default(''),
  complement: z.string().optional(),
  city: z.string().default(''),
  state: z.string().default(''),
  postalCode: z.string().default(''),
});

export const finalizeDigitalSchema = z.object({
  applicationId: z.string().min(1),
  adopterDocument: cpfSchema,
  adopterAddress: addressSnapshotSchema,
  extraClauses: z.string().trim().optional(),
  signature: z.object({ ip: z.string(), userAgent: z.string() }),
});

export const registerOfflineSchema = z.object({
  animalId: z.string().min(1),
  adopter: z.object({
    name: z.string().trim().min(1),
    phone: phoneSchema,
    document: cpfSchema,
    email: optionalEmailSchema,
    cityId: z.string().optional(),
    postalCode: postalCodeSchema.optional(),
  }),
  adopterAddress: addressSnapshotSchema,
  termPdfUrl: z.string().url(),
  adoptedAt: z.coerce.date(),
});

/** Store the rendered term and return its public URL + sha256 hash. */
const storeTerm = async (adoptionId: string, termText: string): Promise<{ url: string; hash: string }> => {
  const html = renderTermHtml(termText);
  const bytes = Buffer.from(html, 'utf-8');
  const hash = createHash('sha256').update(bytes).digest('hex');
  const { url } = await getStorage().put({
    key: `adoptions/${adoptionId}/term.html`,
    body: bytes,
    contentType: 'text/html; charset=utf-8',
  });
  return { url, hash };
};

/**
 * Finalize a digital adoption from an approved application: collect the adopter's
 * CPF, compose + store the term, create the immutable Adoption, mark the animal
 * adopted. See `modelagem-dados.md` › Adoption (digital flow).
 */
export const finalizeDigitalAdoption = async (ctx: Ctx, input: unknown): Promise<Adoption> => {
  assertCanManageAnimals(ctx);
  const data = finalizeDigitalSchema.parse(input);

  const [app] = await ctx.db
    .select()
    .from(application)
    .where(and(eq(application.id, data.applicationId), eq(application.organizationId, ctx.organizationId)))
    .limit(1);
  if (!app) throw new NotFoundError('Candidatura não encontrada.');
  if (app.status !== 'approved') {
    throw new ConflictError('A candidatura precisa estar aprovada para formalizar a adoção.');
  }

  const [personRow, [animalRow], [org]] = await Promise.all([
    getPersonByPk(ctx, app.personId),
    ctx.db.select().from(animal).where(eq(animal.pk, app.animalId)).limit(1),
    ctx.db
      .select({ name: organization.name })
      .from(organization)
      .where(eq(organization.pk, ctx.organizationId))
      .limit(1),
  ]);
  if (!animalRow) throw new NotFoundError('Animal não encontrado.');

  const adoptionId = createId('adoption');
  const termText = composeAdoptionTerm({
    organizationName: org?.name ?? 'a organização',
    adopterName: personRow.name,
    adopterDocument: data.adopterDocument,
    animalName: animalRow.name,
    animalSpecies: animalRow.species,
    date: new Date(),
    extraClauses: data.extraClauses,
  });
  const { url, hash } = await storeTerm(adoptionId, termText);

  return withTransaction(ctx, async (tx) => {
    // Persist the adopter's CPF on the Person (collected at signature time).
    await tx.db.update(person).set({ cpf: data.adopterDocument }).where(eq(person.id, personRow.id));

    const [row] = await tx.db
      .insert(adoption)
      .values({
        id: adoptionId,
        organizationId: ctx.organizationId,
        personId: personRow.pk,
        applicationId: app.pk,
        animalId: app.animalId,
        source: 'digital',
        adopterName: personRow.name,
        adopterDocument: data.adopterDocument,
        adopterPhone: personRow.phone,
        adopterAddress: data.adopterAddress,
        extraClauses: data.extraClauses ?? null,
        termPdfUrl: url,
        termPdfHash: hash,
        signatureMetadata: { signedAt: new Date().toISOString(), ...data.signature },
        adoptedAt: new Date(),
      })
      .returning();

    await tx.db.update(animal).set({ status: 'adopted' }).where(eq(animal.pk, app.animalId));

    await emitTimelineEvent(tx, {
      eventType: 'adoption.completed',
      entityType: 'adoption',
      entityId: adoptionId,
      payload: { animalName: animalRow.name, adopterName: personRow.name, source: 'digital' },
    });
    return row!;
  });
};

/** Register an adoption that happened offline (fair, event). No application. */
export const registerOfflineAdoption = async (ctx: Ctx, input: unknown): Promise<Adoption> => {
  assertCanManageAnimals(ctx);
  const data = registerOfflineSchema.parse(input);

  const [animalRow] = await ctx.db
    .select()
    .from(animal)
    .where(and(eq(animal.id, data.animalId), eq(animal.organizationId, ctx.organizationId)))
    .limit(1);
  if (!animalRow) throw new NotFoundError('Animal não encontrado.');

  const personRow = await upsertPersonByPhone(ctx, {
    name: data.adopter.name,
    phone: data.adopter.phone,
    email: data.adopter.email,
    cpf: data.adopter.document,
    cityId: data.adopter.cityId,
    postalCode: data.adopter.postalCode,
  });

  const registeredByUserId = ctx.actor.type === 'user' ? ctx.actor.userId : 'system';

  return withTransaction(ctx, async (tx) => {
    const adoptionId = createId('adoption');
    const [row] = await tx.db
      .insert(adoption)
      .values({
        id: adoptionId,
        organizationId: ctx.organizationId,
        personId: personRow.pk,
        applicationId: null,
        animalId: animalRow.pk,
        source: 'offline',
        adopterName: data.adopter.name,
        adopterDocument: data.adopter.document,
        adopterPhone: data.adopter.phone,
        adopterAddress: data.adopterAddress,
        termPdfUrl: data.termPdfUrl,
        termPdfHash: createHash('sha256').update(data.termPdfUrl).digest('hex'),
        signatureMetadata: { signedAt: data.adoptedAt.toISOString(), registeredByUserId },
        adoptedAt: data.adoptedAt,
      })
      .returning();

    await tx.db.update(animal).set({ status: 'adopted' }).where(eq(animal.pk, animalRow.pk));

    await emitTimelineEvent(tx, {
      eventType: 'adoption.completed',
      entityType: 'adoption',
      entityId: adoptionId,
      payload: { animalName: animalRow.name, adopterName: data.adopter.name, source: 'offline' },
    });
    return row!;
  });
};

/** Cancel an adoption (return/giveback). Frees the animal again. */
export const cancelAdoption = async (ctx: Ctx, adoptionId: string, reason: string): Promise<void> => {
  assertCanManageAnimals(ctx);
  const [row] = await ctx.db
    .select()
    .from(adoption)
    .where(and(eq(adoption.id, adoptionId), eq(adoption.organizationId, ctx.organizationId)))
    .limit(1);
  if (!row) throw new NotFoundError('Adoção não encontrada.');

  await withTransaction(ctx, async (tx) => {
    await tx.db
      .update(adoption)
      .set({ cancelledAt: new Date(), cancellationReason: reason })
      .where(eq(adoption.id, adoptionId));
    await tx.db.update(animal).set({ status: 'available' }).where(eq(animal.pk, row.animalId));
    await emitTimelineEvent(tx, {
      eventType: 'adoption.cancelled',
      entityType: 'adoption',
      entityId: adoptionId,
      payload: { reason },
    });
  });
};
