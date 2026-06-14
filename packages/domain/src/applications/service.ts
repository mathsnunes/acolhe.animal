import { and, desc, eq, inArray, ne, notInArray, sql } from 'drizzle-orm';

import { createId, NotFoundError } from '@acolhe-animal/shared';
import { animal, application, type Application, type JsonRecord } from '@acolhe-animal/db';
import { getMessaging } from '@acolhe-animal/integrations';
import {
  applicationReceivedWhatsApp,
  applicationStatusWhatsApp,
} from '@acolhe-animal/messaging';

import type { Ctx } from '../context';
import { withTransaction } from '../context';
import { assertCanManageAnimals } from '../auth/permissions';
import { emitTimelineEvent } from '../timeline/timeline';
import { getPerson, getPersonByPk, upsertPersonByPhone } from '../people/service';
import { startApplicationSchema, saveDraftSchema } from './schemas';

const DRAFT_TTL_DAYS = 7;
const ACTIVE_STATUSES = ['draft', 'new', 'in-progress', 'approved'] as const;

/** Fire-and-forget WhatsApp send; never let a messaging hiccup break the flow. */
const notify = async (to: string, body: string): Promise<void> => {
  try {
    await getMessaging().sendText({ to, body });
  } catch (err) {
     
    console.error('[applications] notification failed:', err);
  }
};

/**
 * Public form entry point: identify/create the Person and return their active
 * application for this animal, creating a draft if none exists. The active-unique
 * index guarantees a single open candidacy per (person, animal).
 */
export const startOrResumeApplication = async (ctx: Ctx, input: unknown): Promise<Application> => {
  const data = startApplicationSchema.parse(input);

  const [animalRow] = await ctx.db
    .select({ pk: animal.pk, species: animal.species, organizationId: animal.organizationId })
    .from(animal)
    .where(and(eq(animal.id, data.animalId), eq(animal.organizationId, ctx.organizationId)))
    .limit(1);
  if (!animalRow) throw new NotFoundError('Animal não encontrado.');

  const personRow = await upsertPersonByPhone(ctx, data.person);

  const [existing] = await ctx.db
    .select()
    .from(application)
    .where(
      and(
        eq(application.organizationId, ctx.organizationId),
        eq(application.personId, personRow.pk),
        eq(application.animalId, animalRow.pk),
        notInArray(application.status, ['rejected', 'withdrew']),
      ),
    )
    .limit(1);
  if (existing) return existing;

  const expiresAt = new Date(Date.now() + DRAFT_TTL_DAYS * 24 * 60 * 60 * 1000);
  const [row] = await ctx.db
    .insert(application)
    .values({
      id: createId('application'),
      organizationId: ctx.organizationId,
      animalId: animalRow.pk,
      personId: personRow.pk,
      formVersion: `${animalRow.species}-v1`,
      status: 'draft',
      expiresAt,
    })
    .returning();
  return row!;
};

/** Autosave a draft's partial answers and refresh its expiry. */
export const saveDraft = async (ctx: Ctx, applicationId: string, input: unknown): Promise<void> => {
  const data = saveDraftSchema.parse(input);
  const expiresAt = new Date(Date.now() + DRAFT_TTL_DAYS * 24 * 60 * 60 * 1000);
  await ctx.db
    .update(application)
    .set({ applicationData: data.applicationData as JsonRecord, expiresAt })
    .where(
      and(
        eq(application.id, applicationId),
        eq(application.organizationId, ctx.organizationId),
        eq(application.status, 'draft'),
      ),
    );
};

/** Submit a draft → `new`. Notifies the candidate. */
export const submitApplication = async (ctx: Ctx, applicationId: string): Promise<Application> => {
  const app = await getApplication(ctx, applicationId);
  if (app.status !== 'draft') return app; // already submitted — idempotent

  const [row] = await ctx.db
    .update(application)
    .set({ status: 'new', submittedAt: new Date(), statusChangedAt: new Date(), expiresAt: null })
    .where(eq(application.id, applicationId))
    .returning();

  await emitTimelineEvent(ctx, {
    eventType: 'application.submitted',
    entityType: 'application',
    entityId: applicationId,
  });

  const person = await getPersonByPk(ctx, app.personId);
  const [animalRow] = await ctx.db
    .select({ name: animal.name })
    .from(animal)
    .where(eq(animal.pk, app.animalId))
    .limit(1);
  if (animalRow) {
    const msg = applicationReceivedWhatsApp({
      candidateName: person.name.split(' ')[0] ?? person.name,
      animalName: animalRow.name,
      organizationName: 'a organização',
    });
    await notify(person.phone, msg.text);
  }
  return row!;
};

/** Assign a member as responsible; moves `new` → `in-progress`. */
export const assignApplication = async (ctx: Ctx, applicationId: string, userId: string): Promise<void> => {
  assertCanManageAnimals(ctx);
  const app = await getApplication(ctx, applicationId);
  await ctx.db
    .update(application)
    .set({
      assignedToUserId: userId,
      status: app.status === 'new' ? 'in-progress' : app.status,
      statusChangedAt: new Date(),
    })
    .where(eq(application.id, applicationId));
  await emitTimelineEvent(ctx, {
    eventType: 'application.assigned',
    entityType: 'application',
    entityId: applicationId,
    payload: { userId },
  });
};

/**
 * Move an application through the funnel. Approving reserves the animal; reverting
 * away from `approved` frees it again if no other approved application remains —
 * both in a single transaction. See `modelagem-dados.md` › Application.
 */
export const setApplicationStatus = async (ctx: Ctx, applicationId: string, status: 'in-progress' | 'approved' | 'rejected' | 'withdrew', options?: { internalNotes?: string }): Promise<Application> => {
  assertCanManageAnimals(ctx);
  const app = await getApplication(ctx, applicationId);

  return withTransaction(ctx, async (tx) => {
    const [row] = await tx.db
      .update(application)
      .set({
        status,
        statusChangedAt: new Date(),
        ...(options?.internalNotes !== undefined ? { internalNotes: options.internalNotes } : {}),
      })
      .where(eq(application.id, applicationId))
      .returning();

    // Approval reserves the animal.
    if (status === 'approved') {
      await tx.db
        .update(animal)
        .set({ status: 'reserved' })
        .where(eq(animal.pk, app.animalId));
    }

    // Reverting away from approval frees the animal if nothing else holds it.
    if (app.status === 'approved' && status !== 'approved') {
      const [stillApproved] = await tx.db
        .select({ id: application.id })
        .from(application)
        .where(
          and(
            eq(application.animalId, app.animalId),
            eq(application.status, 'approved'),
            ne(application.id, applicationId),
          ),
        )
        .limit(1);
      if (!stillApproved) {
        await tx.db.update(animal).set({ status: 'available' }).where(eq(animal.pk, app.animalId));
      }
    }

    if (status === 'approved' || status === 'rejected') {
      await emitTimelineEvent(tx, {
        eventType: status === 'approved' ? 'application.approved' : 'application.rejected',
        entityType: 'application',
        entityId: applicationId,
      });
    }
    return row!;
  }).then(async (row) => {
    // Notify the candidate outside the transaction.
    if (status === 'in-progress' || status === 'approved' || status === 'rejected') {
      const [person, [animalRow]] = await Promise.all([
        getPersonByPk(ctx, app.personId),
        ctx.db.select({ name: animal.name }).from(animal).where(eq(animal.pk, app.animalId)).limit(1),
      ]);
      if (animalRow) {
        const msg = applicationStatusWhatsApp({
          candidateName: person.name.split(' ')[0] ?? person.name,
          animalName: animalRow.name,
          status,
        });
        await notify(person.phone, msg.text);
      }
    }
    return row;
  });
};

export interface ApplicationWithRelations extends Application {
  person: { id: string; name: string; phone: string };
  animal: { id: string; name: string; species: 'dog' | 'cat' };
}

/** Kanban listing: applications for the org joined with person + animal. */
export const listApplications = async (ctx: Ctx, filters: { includeDrafts?: boolean } = {}): Promise<ApplicationWithRelations[]> => {
  const rows = await ctx.db.query.application.findMany({
    where: filters.includeDrafts
      ? eq(application.organizationId, ctx.organizationId)
      : and(
          eq(application.organizationId, ctx.organizationId),
          notInArray(application.status, ['draft']),
        ),
    orderBy: desc(application.statusChangedAt),
    with: {
      person: { columns: { id: true, name: true, phone: true } },
      animal: { columns: { id: true, name: true, species: true } },
    },
  });
  return rows as unknown as ApplicationWithRelations[];
};

/**
 * Count "waiting" candidates (status `new` or `in-progress`) per animal, for the
 * candidates-waiting indicator on the animals listing. Returns a map keyed by
 * animalId; animals with none are simply absent.
 */
export const countWaitingApplicationsByAnimal = async (ctx: Ctx): Promise<Record<string, number>> => {
  // Keyed by the animal's public id (what the listing UI holds), not the surrogate pk.
  const rows = await ctx.db
    .select({ animalId: animal.id, count: sql<number>`count(*)::int` })
    .from(application)
    .innerJoin(animal, eq(application.animalId, animal.pk))
    .where(
      and(
        eq(application.organizationId, ctx.organizationId),
        inArray(application.status, ['new', 'in-progress']),
      ),
    )
    .groupBy(animal.id);
  return Object.fromEntries(rows.map((r) => [r.animalId, Number(r.count)]));
};

export const getApplication = async (ctx: Ctx, id: string): Promise<Application> => {
  const [row] = await ctx.db
    .select()
    .from(application)
    .where(and(eq(application.id, id), eq(application.organizationId, ctx.organizationId)))
    .limit(1);
  if (!row) throw new NotFoundError('Candidatura não encontrada.');
  return row;
};

export { ACTIVE_STATUSES };
