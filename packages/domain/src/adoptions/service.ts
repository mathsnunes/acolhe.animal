import { createHash } from 'node:crypto';

import { and, eq, isNull } from 'drizzle-orm';
import { z } from 'zod';

import { createId, NotFoundError, ConflictError } from '@acolhe-animal/shared';
import { cpfSchema, optionalEmailSchema, phoneSchema, postalCodeSchema } from '@acolhe-animal/shared';
import { formatCnpj, formatCpf, formatPhoneBR } from '@acolhe-animal/shared';
import {
  adoption,
  animal,
  application,
  organization,
  person,
  type Adoption,
  type Animal,
} from '@acolhe-animal/db';
import { getStorage } from '@acolhe-animal/integrations';

import type { Ctx } from '../context';
import { withTransaction } from '../context';
import { assertCanManageAnimals } from '../auth/permissions';
import { emitTimelineEvent } from '../timeline/timeline';
import { getPersonByPk, upsertPersonByPhone } from '../people/service';
import { renderTermPdf, type AdoptionTermData } from './term';

const addressSnapshotSchema = z.object({
  street: z.string().default(''),
  number: z.string().default(''),
  complement: z.string().optional(),
  neighborhood: z.string().optional(),
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

/** Store the rendered term PDF and return its public URL + sha256 hash. */
const storeTerm = async (
  adoptionId: string,
  bytes: Uint8Array,
): Promise<{ url: string; hash: string }> => {
  const buf = Buffer.from(bytes);
  const hash = createHash('sha256').update(buf).digest('hex');
  const { url } = await getStorage().put({
    key: `adoptions/${adoptionId}/term.pdf`,
    body: buf,
    contentType: 'application/pdf',
  });
  return { url, hash };
};

/** A short "idade aproximada" line for the term, from the animal's age fields. */
const animalAgeText = (a: Pick<Animal, 'estimatedBirthDate' | 'ageMonthsAtIntake' | 'ageReferenceDate'>): string => {
  let months: number | null = null;
  if (a.estimatedBirthDate) {
    const now = new Date();
    months =
      (now.getFullYear() - a.estimatedBirthDate.getFullYear()) * 12 +
      (now.getMonth() - a.estimatedBirthDate.getMonth());
  } else if (a.ageMonthsAtIntake != null) {
    const since = a.ageReferenceDate ?? null;
    const extra = since
      ? Math.max(0, Math.floor((Date.now() - since.getTime()) / (1000 * 60 * 60 * 24 * 30.44)))
      : 0;
    months = a.ageMonthsAtIntake + extra;
  }
  if (months == null || months < 0) return '';
  if (months < 12) return `${months} ${months === 1 ? 'mês' : 'meses'}`;
  const years = Math.floor(months / 12);
  return `${years} ${years === 1 ? 'ano' : 'anos'}`;
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
      .select({
        name: organization.name,
        document: organization.document,
        documentType: organization.documentType,
        phone: organization.phone,
      })
      .from(organization)
      .where(eq(organization.pk, ctx.organizationId))
      .limit(1),
  ]);
  if (!animalRow) throw new NotFoundError('Animal não encontrado.');

  const adoptionId = createId('adoption');
  const orgDocLabel = org
    ? `${org.documentType === 'cnpj' ? 'CNPJ' : 'CPF'} ${
        org.documentType === 'cnpj' ? formatCnpj(org.document) : formatCpf(org.document)
      }`
    : null;
  const termData: AdoptionTermData = {
    org: {
      name: org?.name ?? 'a organização',
      documentLabel: orgDocLabel,
      phone: org ? formatPhoneBR(org.phone) : null,
      logo: null, // logo upload is a follow-up; embed once orgs can set one.
    },
    adopter: {
      name: personRow.name,
      cpf: formatCpf(data.adopterDocument),
      phone: formatPhoneBR(personRow.phone),
      email: personRow.email,
      address: {
        street: data.adopterAddress.street,
        number: data.adopterAddress.number,
        complement: data.adopterAddress.complement,
        neighborhood: data.adopterAddress.neighborhood,
        city: data.adopterAddress.city,
        state: data.adopterAddress.state,
        postalCode: data.adopterAddress.postalCode,
      },
    },
    animal: {
      name: animalRow.name,
      species: animalRow.species,
      sex: animalRow.sex,
      color: animalRow.predominantColor,
      ageText: animalAgeText(animalRow),
      microchip: animalRow.microchipCode,
    },
    date: new Date(),
    extraClauses: data.extraClauses,
  };
  const pdfBytes = await renderTermPdf(termData);
  const { url, hash } = await storeTerm(adoptionId, pdfBytes);

  return withTransaction(ctx, async (tx) => {
    // Backfill the adopter's CPF on the Person (collected at signature time) — but
    // only when it's free in this org. CPF is unique per organization, and the same
    // human may already hold it under another person record (e.g. a prior candidacy,
    // or an adoption that was later returned). The adoption itself always records
    // `adopterDocument`, so skipping the backfill here loses nothing and avoids a
    // `person_org_cpf_unique` violation.
    if (personRow.cpf !== data.adopterDocument) {
      const [cpfOwner] = await tx.db
        .select({ pk: person.pk })
        .from(person)
        .where(
          and(eq(person.organizationId, ctx.organizationId), eq(person.cpf, data.adopterDocument)),
        )
        .limit(1);
      if (!cpfOwner) {
        await tx.db
          .update(person)
          .set({ cpf: data.adopterDocument })
          .where(eq(person.id, personRow.id));
      }
    }

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

    // The candidacy is now terminal: a formalized adoption closes it as `adopted`,
    // so the funnel can't re-formalize it and it lands in "Encerradas".
    await tx.db
      .update(application)
      .set({ status: 'adopted', statusChangedAt: new Date() })
      .where(eq(application.pk, app.pk));

    // The adoption record carries `adoption.completed`; the candidacy's own
    // history gets the matching transition (kept out of the org feed).
    await emitTimelineEvent(tx, {
      eventType: 'application.adopted',
      entityType: 'application',
      entityId: app.id,
      payload: { animalName: animalRow.name },
    });
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

/**
 * The active (non-cancelled) adoption of an animal, if any — the full record
 * plus the public id of the originating candidacy (null for offline adoptions).
 * The animal detail page renders the whole adoption (adopter, term, origin)
 * inline now that there's no dedicated adoption page.
 */
export const getAdoptionByAnimal = async (
  ctx: Ctx,
  animalId: string,
): Promise<{ adoption: Adoption; originApplicationId: string | null } | null> => {
  const [row] = await ctx.db
    .select({ adoption, originApplicationId: application.id })
    .from(adoption)
    .innerJoin(animal, eq(adoption.animalId, animal.pk))
    .leftJoin(application, eq(adoption.applicationId, application.pk))
    .where(
      and(
        eq(animal.id, animalId),
        eq(adoption.organizationId, ctx.organizationId),
        isNull(adoption.cancelledAt),
      ),
    )
    .limit(1);
  return row ? { adoption: row.adoption, originApplicationId: row.originApplicationId } : null;
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
    // A digital adoption traces back to a candidacy — close it as `cancelled`
    // (encerrada, reopenable) and log the transition on its history. Offline
    // adoptions have no application.
    if (row.applicationId != null) {
      const [appRow] = await tx.db
        .select({ id: application.id })
        .from(application)
        .where(eq(application.pk, row.applicationId))
        .limit(1);
      await tx.db
        .update(application)
        .set({ status: 'cancelled', statusChangedAt: new Date() })
        .where(eq(application.pk, row.applicationId));
      if (appRow) {
        await emitTimelineEvent(tx, {
          eventType: 'application.cancelled',
          entityType: 'application',
          entityId: appRow.id,
          payload: { reason },
        });
      }
    }
    await emitTimelineEvent(tx, {
      eventType: 'adoption.cancelled',
      entityType: 'adoption',
      entityId: adoptionId,
      payload: { reason },
    });
  });
};
