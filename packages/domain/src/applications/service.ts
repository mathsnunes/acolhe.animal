import { and, desc, eq, getTableColumns, ilike, inArray, isNull, ne, notInArray, or, sql } from 'drizzle-orm';

import { createId, NotFoundError } from '@acolhe-animal/shared';
import {
  adoption,
  animal,
  application,
  city,
  person,
  user,
  type Animal,
  type Application,
  type JsonRecord,
} from '@acolhe-animal/db';
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

    // Record the transition on the candidacy's own history. `review_started`
    // carries the previous status so the timeline can phrase it (análise iniciada
    // vs. voltou para avaliação vs. reaberta).
    if (status === 'in-progress') {
      await emitTimelineEvent(tx, {
        eventType: 'application.review_started',
        entityType: 'application',
        entityId: applicationId,
        payload: { from: app.status },
      });
    } else if (status === 'approved') {
      await emitTimelineEvent(tx, {
        eventType: 'application.approved',
        entityType: 'application',
        entityId: applicationId,
      });
    } else if (status === 'rejected') {
      await emitTimelineEvent(tx, {
        eventType: 'application.rejected',
        entityType: 'application',
        entityId: applicationId,
      });
    } else if (status === 'withdrew') {
      await emitTimelineEvent(tx, {
        eventType: 'application.withdrew',
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

/**
 * Reject every still-open candidacy for an animal at once — the "recusar
 * restantes" action surfaced once an animal has been adopted. Only `new` /
 * `in-progress` candidacies are touched (the adopted/closed ones stay as they
 * are); each rejected candidate gets the usual notification. Returns how many
 * were rejected (0 when there was nothing waiting).
 */
export const rejectWaitingApplicationsForAnimal = async (
  ctx: Ctx,
  animalId: string,
): Promise<number> => {
  assertCanManageAnimals(ctx);
  const [animalRow] = await ctx.db
    .select({ pk: animal.pk, name: animal.name })
    .from(animal)
    .where(and(eq(animal.id, animalId), eq(animal.organizationId, ctx.organizationId)))
    .limit(1);
  if (!animalRow) throw new NotFoundError('Animal não encontrado.');

  const waiting = await ctx.db
    .select({ id: application.id, personId: application.personId })
    .from(application)
    .where(
      and(
        eq(application.organizationId, ctx.organizationId),
        eq(application.animalId, animalRow.pk),
        inArray(application.status, ['new', 'in-progress']),
      ),
    );
  if (waiting.length === 0) return 0;

  await withTransaction(ctx, async (tx) => {
    for (const w of waiting) {
      await tx.db
        .update(application)
        .set({ status: 'rejected', statusChangedAt: new Date() })
        .where(eq(application.id, w.id));
      await emitTimelineEvent(tx, {
        eventType: 'application.rejected',
        entityType: 'application',
        entityId: w.id,
      });
    }
  });

  // Notify the rejected candidates outside the transaction (best-effort).
  await Promise.all(
    waiting.map(async (w) => {
      const person = await getPersonByPk(ctx, w.personId);
      const msg = applicationStatusWhatsApp({
        candidateName: person.name.split(' ')[0] ?? person.name,
        animalName: animalRow.name,
        status: 'rejected',
      });
      await notify(person.phone, msg.text);
    }),
  );

  return waiting.length;
};

/**
 * Edit the internal triage notes without touching the funnel stage. Safe at any
 * status, including terminal ones (`adopted`, `cancelled`) — unlike routing notes
 * through {@link setApplicationStatus}, which only accepts the four triage states.
 */
export const updateApplicationNotes = async (ctx: Ctx, applicationId: string, internalNotes: string): Promise<Application> => {
  assertCanManageAnimals(ctx);
  await getApplication(ctx, applicationId); // assert exists + tenant scope
  const [row] = await ctx.db
    .update(application)
    .set({ internalNotes })
    .where(
      and(eq(application.id, applicationId), eq(application.organizationId, ctx.organizationId)),
    )
    .returning();
  return row!;
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

/**
 * The approved candidacy holding a reserved animal, if any — used to offer a
 * "formalizar adoção" shortcut straight from the animal page. Returns the public
 * application id and the candidate's name (most recently approved wins if more
 * than one is somehow approved).
 */
export const getApprovedApplicationForAnimal = async (
  ctx: Ctx,
  animalId: string,
): Promise<{ applicationId: string; adopterName: string } | null> => {
  const [row] = await ctx.db
    .select({ applicationId: application.id, adopterName: person.name })
    .from(application)
    .innerJoin(animal, eq(application.animalId, animal.pk))
    .innerJoin(person, eq(application.personId, person.pk))
    .where(
      and(
        eq(animal.id, animalId),
        eq(application.organizationId, ctx.organizationId),
        eq(application.status, 'approved'),
      ),
    )
    .orderBy(desc(application.statusChangedAt))
    .limit(1);
  return row ?? null;
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

/* ── Admin listing (paginated, filtered) ─────────────────────────────────────
 * The listing page mirrors the animals pattern: a flat, offset-paged query the
 * table/mobile cards consume with infinite scroll, plus a full-set variant the
 * desktop kanban renders. Everything is org-scoped; client-supplied ids are only
 * ever used as filters, never to bypass the tenant boundary. */

/** Funnel bucket a status falls into (the kanban columns / status tabs). */
export type ApplicationStatusGroup = 'new' | 'in-progress' | 'approved' | 'closed';

const GROUP_STATUSES: Record<ApplicationStatusGroup, Application['status'][]> = {
  new: ['new'],
  'in-progress': ['in-progress'],
  approved: ['approved'],
  closed: ['adopted', 'rejected', 'withdrew', 'cancelled'],
};
const ALL_LISTED_STATUSES: Application['status'][] = [
  'new',
  'in-progress',
  'approved',
  'adopted',
  'rejected',
  'withdrew',
  'cancelled',
];

const CLOSED_STATUSES: Application['status'][] = ['adopted', 'rejected', 'withdrew', 'cancelled'];

const statusToGroup = (status: Application['status']): ApplicationStatusGroup =>
  CLOSED_STATUSES.includes(status) ? 'closed' : (status as ApplicationStatusGroup);

export interface ListApplicationsFilters {
  /** A single funnel bucket; omit for "all" (every non-draft status). */
  statusGroup?: ApplicationStatusGroup;
  /** Free text matched against the candidate's and the animal's name. */
  search?: string;
  /** Restrict to candidacies for this animal (public id). */
  animalId?: string;
  /** Restrict to candidacies assigned to this member (user id). */
  assignedToUserId?: string;
  /** Restrict to candidacies with no responsible member. */
  unassigned?: boolean;
}

/** One row of the admin listing: the candidacy enriched with the names the UI shows. */
export interface CandidateListRow extends Application {
  person: { id: string; name: string; phone: string; cityName: string | null };
  animal: { id: string; name: string; species: 'dog' | 'cat'; size: Animal['size'] };
  assignee: { id: string; name: string } | null;
}

/** Shared WHERE for the listing + counts: org scope, listed statuses, and filters. */
const applicationFilterConditions = (
  ctx: Ctx,
  filters: ListApplicationsFilters,
  statuses: Application['status'][],
) => {
  const conditions = [
    eq(application.organizationId, ctx.organizationId),
    inArray(application.status, statuses),
  ];
  const search = filters.search?.trim();
  if (search) {
    const pattern = `%${search}%`;
    conditions.push(or(ilike(person.name, pattern), ilike(animal.name, pattern))!);
  }
  if (filters.animalId) conditions.push(eq(animal.id, filters.animalId));
  if (filters.unassigned) conditions.push(isNull(application.assignedToUserId));
  else if (filters.assignedToUserId)
    conditions.push(eq(application.assignedToUserId, filters.assignedToUserId));
  return and(...conditions);
};

/**
 * One offset-paged slice of the admin listing. Joins person + animal (+ the
 * optional assignee and the candidate's city) so a row carries everything the
 * cards/table render without an N+1. Ordered by most-recent activity, with the
 * surrogate pk as a stable tiebreaker so paging never skips or repeats a row.
 */
export const listApplicationsPage = async (
  ctx: Ctx,
  filters: ListApplicationsFilters,
  page: { offset: number; limit: number },
): Promise<CandidateListRow[]> => {
  const statuses = filters.statusGroup ? GROUP_STATUSES[filters.statusGroup] : ALL_LISTED_STATUSES;
  const rows = await ctx.db
    .select({
      ...getTableColumns(application),
      personPublicId: person.id,
      personName: person.name,
      personPhone: person.phone,
      cityName: city.name,
      animalPublicId: animal.id,
      animalName: animal.name,
      animalSpecies: animal.species,
      animalSize: animal.size,
      assigneeName: user.name,
    })
    .from(application)
    .innerJoin(person, eq(application.personId, person.pk))
    .innerJoin(animal, eq(application.animalId, animal.pk))
    .leftJoin(city, eq(person.cityId, city.id))
    .leftJoin(user, eq(application.assignedToUserId, user.id))
    .where(applicationFilterConditions(ctx, filters, statuses))
    .orderBy(desc(application.statusChangedAt), desc(application.pk))
    .limit(page.limit)
    .offset(page.offset);

  return rows.map(
    ({
      personPublicId,
      personName,
      personPhone,
      cityName,
      animalPublicId,
      animalName,
      animalSpecies,
      animalSize,
      assigneeName,
      ...app
    }) => ({
      ...(app as Application),
      person: { id: personPublicId, name: personName, phone: personPhone, cityName },
      animal: {
        id: animalPublicId,
        name: animalName,
        species: animalSpecies,
        size: animalSize,
      },
      assignee: app.assignedToUserId ? { id: app.assignedToUserId, name: assigneeName ?? '' } : null,
    }),
  );
};

/**
 * Count candidacies per funnel bucket for the status tabs. Honors every filter
 * except `statusGroup` (the tabs need each bucket regardless of which is active),
 * mirroring `countAnimalsByStatus`.
 */
export const countApplicationsByStatus = async (
  ctx: Ctx,
  filters: Omit<ListApplicationsFilters, 'statusGroup'>,
): Promise<Record<ApplicationStatusGroup, number>> => {
  const rows = await ctx.db
    .select({ status: application.status, count: sql<number>`count(*)::int` })
    .from(application)
    .innerJoin(person, eq(application.personId, person.pk))
    .innerJoin(animal, eq(application.animalId, animal.pk))
    .where(applicationFilterConditions(ctx, filters, ALL_LISTED_STATUSES))
    .groupBy(application.status);

  const counts: Record<ApplicationStatusGroup, number> = {
    new: 0,
    'in-progress': 0,
    approved: 0,
    closed: 0,
  };
  for (const row of rows) counts[statusToGroup(row.status)] += Number(row.count);
  return counts;
};

/** Distinct animals that have at least one listed (non-draft) candidacy — the Animal filter options. */
export const listApplicationAnimals = async (
  ctx: Ctx,
): Promise<{ id: string; name: string }[]> => {
  const rows = await ctx.db
    .selectDistinct({ id: animal.id, name: animal.name })
    .from(application)
    .innerJoin(animal, eq(application.animalId, animal.pk))
    .where(
      and(
        eq(application.organizationId, ctx.organizationId),
        notInArray(application.status, ['draft']),
      ),
    )
    .orderBy(animal.name);
  return rows;
};

/**
 * Other active candidacies (status new/in-progress/approved) per person, keyed by
 * the person's surrogate pk. Powers the "também candidata a {animal}" alert; the
 * caller drops the current row's own animal.
 */
export const getMultipleCandidacies = async (
  ctx: Ctx,
  personPks: number[],
): Promise<Record<number, { animalId: string; animalName: string }[]>> => {
  if (personPks.length === 0) return {};
  const rows = await ctx.db
    .select({ personPk: application.personId, animalId: animal.id, animalName: animal.name })
    .from(application)
    .innerJoin(animal, eq(application.animalId, animal.pk))
    .where(
      and(
        eq(application.organizationId, ctx.organizationId),
        inArray(application.personId, personPks),
        inArray(application.status, ['new', 'in-progress', 'approved']),
      ),
    );
  const byPerson: Record<number, { animalId: string; animalName: string }[]> = {};
  for (const row of rows) {
    (byPerson[row.personPk] ??= []).push({ animalId: row.animalId, animalName: row.animalName });
  }
  return byPerson;
};

/** One past adoption of a person, with the candidacy it came from (null = offline). */
export interface PersonAdoption {
  /** The `application.pk` this adoption was formalized from, or null for offline adoptions. */
  applicationPk: number | null;
  /** Whether it was later cancelled (the animal was returned). */
  cancelled: boolean;
}

/**
 * Every adoption per person, keyed by surrogate pk. The caller derives the
 * history alert chips ("já adotou" / "devolveu antes") and is responsible for
 * excluding the candidacy's own adoption — otherwise an adopted candidacy would
 * flag itself as a prior adoption.
 */
export const getPersonAdoptions = async (
  ctx: Ctx,
  personPks: number[],
): Promise<Record<number, PersonAdoption[]>> => {
  if (personPks.length === 0) return {};
  const rows = await ctx.db
    .select({
      personPk: adoption.personId,
      applicationPk: adoption.applicationId,
      cancelledAt: adoption.cancelledAt,
    })
    .from(adoption)
    .where(
      and(eq(adoption.organizationId, ctx.organizationId), inArray(adoption.personId, personPks)),
    );
  const byPerson: Record<number, PersonAdoption[]> = {};
  for (const row of rows) {
    (byPerson[row.personPk] ??= []).push({
      applicationPk: row.applicationPk,
      cancelled: row.cancelledAt != null,
    });
  }
  return byPerson;
};

/**
 * Signals for the candidate-detail alerts card: whether this is the person's first
 * contact with the org, and whether they've adopted / returned before — the
 * adoption checks exclude this candidacy's own adoption (see {@link getPersonAdoptions}).
 */
export const getPersonSignals = async (
  ctx: Ctx,
  personPk: number,
  applicationPk: number,
): Promise<{ isFirstCandidacy: boolean; adoptedBefore: boolean; returnedBefore: boolean }> => {
  const [counts, adoptionsByPerson] = await Promise.all([
    ctx.db
      .select({ count: sql<number>`count(*)::int` })
      .from(application)
      .where(
        and(eq(application.organizationId, ctx.organizationId), eq(application.personId, personPk)),
      ),
    getPersonAdoptions(ctx, [personPk]),
  ]);
  const all = adoptionsByPerson[personPk] ?? [];
  const prior = all.filter((a) => a.applicationPk !== applicationPk);
  return {
    isFirstCandidacy: Number(counts[0]?.count ?? 0) <= 1 && all.length === 0,
    adoptedBefore: prior.some((a) => !a.cancelled),
    returnedBefore: prior.some((a) => a.cancelled),
  };
};

export { ACTIVE_STATUSES };
