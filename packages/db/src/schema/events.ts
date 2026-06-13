import { sql } from 'drizzle-orm';
import { index, integer, jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

import { auditActorType, webhookProvider, webhookStatus } from './enums';
import { organization } from './organization';
import { user } from './auth';
import type { ActorContext, JsonRecord } from './types';

/**
 * User-visible narrative history ("Ana cadastrou Frida"). Append-only. Not a
 * forensic trail (that's `auditLog`). See `modelagem-dados.md` › TimelineEvent.
 *
 * `eventType` and `entityType` are free text validated by a closed list in the
 * application — easier to extend than a Postgres enum.
 */
export const timelineEvent = pgTable(
  'timeline_event',
  {
    id: text().primaryKey(),
    organizationId: text()
      .notNull()
      .references(() => organization.id),
    eventType: text().notNull(),
    entityType: text().notNull(),
    /** No FK — entities may become inaccessible (archived); the event survives. */
    entityId: text().notNull(),
    actorUserId: text().references(() => user.id),
    actorContext: jsonb().$type<ActorContext>(),
    payload: jsonb().$type<JsonRecord>(),
    occurredAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('timeline_entity_idx').on(t.organizationId, t.entityType, t.entityId, t.occurredAt),
    index('timeline_org_feed_idx').on(t.organizationId, t.occurredAt),
    index('timeline_actor_idx')
      .on(t.actorUserId, t.occurredAt)
      .where(sql`${t.actorUserId} is not null`),
  ],
);

/**
 * Forensic trail of sensitive actions. Not shown in the UI. Has before/after
 * diffs and a retention window. See `modelagem-dados.md` › AuditLog.
 */
export const auditLog = pgTable(
  'audit_log',
  {
    id: text().primaryKey(),
    organizationId: text().references(() => organization.id),
    actorType: auditActorType().notNull(),
    actorUserId: text().references(() => user.id),
    actorContext: jsonb().$type<ActorContext>(),
    action: text().notNull(),
    entityType: text(),
    entityId: text(),
    previousValue: jsonb().$type<JsonRecord>(),
    newValue: jsonb().$type<JsonRecord>(),
    reason: text(),
    requestMetadata: jsonb().$type<JsonRecord>(),
    retentionUntil: timestamp({ withTimezone: true })
      .notNull()
      .default(sql`now() + interval '2 years'`),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('audit_org_action_idx').on(t.organizationId, t.action, t.createdAt),
    index('audit_actor_idx')
      .on(t.actorUserId, t.createdAt)
      .where(sql`${t.actorUserId} is not null`),
    index('audit_retention_idx').on(t.retentionUntil),
    index('audit_entity_idx').on(t.entityType, t.entityId, t.createdAt),
  ],
);

/**
 * Log of inbound provider webhooks (Asaas). Guarantees idempotency (PK is the
 * provider's event id), preserves payloads for debug/replay. See
 * `modelagem-dados.md` › WebhookEvent.
 */
export const webhookEvent = pgTable(
  'webhook_event',
  {
    /** External event id from the provider — idempotency by construction. */
    id: text().primaryKey(),
    provider: webhookProvider().notNull(),
    eventType: text().notNull(),
    payload: jsonb().$type<JsonRecord>().notNull(),
    receivedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    processedAt: timestamp({ withTimezone: true }),
    status: webhookStatus().notNull().default('received'),
    attempts: integer().notNull().default(0),
    lastError: text(),
  },
  (t) => [
    index('webhook_queue_idx').on(t.status, t.receivedAt),
    index('webhook_type_idx').on(t.provider, t.eventType, t.receivedAt),
  ],
);
