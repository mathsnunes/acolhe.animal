import { and, desc, eq } from 'drizzle-orm';

import { createId } from '@acolhe-animal/shared';
import { timelineEvent, type JsonRecord, type TimelineEvent } from '@acolhe-animal/db';

import type { Ctx } from '../context';

/**
 * User-visible narrative events. Emitted explicitly from domain operations
 * (no Drizzle middleware) so instrumentation is deliberate and testable. See
 * `modelagem-dados.md` › TimelineEvent.
 */
export type TimelineEventType =
  | 'animal.created'
  | 'animal.archived'
  | 'animal.unarchived'
  | 'application.submitted'
  | 'application.assigned'
  | 'application.approved'
  | 'application.rejected'
  | 'adoption.completed'
  | 'adoption.cancelled'
  | 'campaign.created'
  | 'campaign.closed'
  | 'donation.received'
  | 'payout.completed'
  | 'payout.failed';

export type TimelineEntityType =
  | 'animal'
  | 'application'
  | 'adoption'
  | 'campaign'
  | 'donation';

export const emitTimelineEvent = async (ctx: Ctx, input: {
    eventType: TimelineEventType;
    entityType: TimelineEntityType;
    entityId: string;
    payload?: JsonRecord;
    occurredAt?: Date;
  }): Promise<void> => {
  const actorUserId = ctx.actor.type === 'user' ? ctx.actor.userId : null;
  const actorContext =
    ctx.actor.type === 'public'
      ? { source: 'public_form' }
      : ctx.actor.type === 'system'
        ? { source: ctx.actor.source }
        : null;

  await ctx.db.insert(timelineEvent).values({
    id: createId('timelineEvent'),
    organizationId: ctx.organizationId,
    eventType: input.eventType,
    entityType: input.entityType,
    entityId: input.entityId,
    actorUserId,
    actorContext,
    payload: input.payload ?? null,
    occurredAt: input.occurredAt ?? new Date(),
  });
};

/** The org's recent activity feed (Início). */
export const listOrgTimeline = async (ctx: Ctx, limit = 30): Promise<TimelineEvent[]> => ctx.db
    .select()
    .from(timelineEvent)
    .where(eq(timelineEvent.organizationId, ctx.organizationId))
    .orderBy(desc(timelineEvent.occurredAt))
    .limit(limit);

/** Timeline for a single entity (animal/application/adoption detail). */
export const listEntityTimeline = async (ctx: Ctx, entityType: TimelineEntityType, entityId: string, limit = 50): Promise<TimelineEvent[]> => ctx.db
    .select()
    .from(timelineEvent)
    .where(
      and(
        eq(timelineEvent.organizationId, ctx.organizationId),
        eq(timelineEvent.entityType, entityType),
        eq(timelineEvent.entityId, entityId),
      ),
    )
    .orderBy(desc(timelineEvent.occurredAt))
    .limit(limit);
