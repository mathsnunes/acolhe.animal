import { sql } from 'drizzle-orm';
import { index, integer, numeric, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

import { campaignGoalBehavior, campaignStatus, recurringNeedStatus } from './enums';
import { animal } from './animals';
import { organization } from './organization';

/** A time-boxed fundraising effort with a goal. See `modelagem-dados.md` › Campaign. */
export const campaign = pgTable(
  'campaign',
  {
    id: text().primaryKey(),
    organizationId: text()
      .notNull()
      .references(() => organization.id),
    animalId: text().references(() => animal.id),
    title: text().notNull(),
    pitch: text(),
    story: text(),
    coverUrl: text(),
    goalAmount: numeric({ precision: 10, scale: 2 }).notNull(),
    startsAt: timestamp({ withTimezone: true }).notNull(),
    endsAt: timestamp({ withTimezone: true }).notNull(),
    status: campaignStatus().notNull().default('draft'),
    behaviorOnGoalReached: campaignGoalBehavior().notNull().default('keep_open'),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index('campaign_org_status_idx').on(t.organizationId, t.status),
    index('campaign_org_ends_idx').on(t.organizationId, t.endsAt),
    index('campaign_animal_idx')
      .on(t.animalId)
      .where(sql`${t.animalId} is not null`),
    index('campaign_active_ends_idx')
      .on(t.endsAt)
      .where(sql`${t.status} = 'active'`),
  ],
);

/** Optional breakdown of a campaign goal into real line items. */
export const campaignItem = pgTable(
  'campaign_item',
  {
    id: text().primaryKey(),
    campaignId: text()
      .notNull()
      .references(() => campaign.id, { onDelete: 'cascade' }),
    name: text().notNull(),
    amount: numeric({ precision: 10, scale: 2 }).notNull(),
    displayOrder: integer().notNull().default(0),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('campaign_item_order_idx').on(t.campaignId, t.displayOrder)],
);

/** A continuous need — no goal, no deadline. See `modelagem-dados.md` › RecurringNeed. */
export const recurringNeed = pgTable(
  'recurring_need',
  {
    id: text().primaryKey(),
    organizationId: text()
      .notNull()
      .references(() => organization.id),
    animalId: text().references(() => animal.id),
    title: text().notNull(),
    description: text(),
    coverUrl: text(),
    suggestedMonthlyAmount: numeric({ precision: 10, scale: 2 }),
    status: recurringNeedStatus().notNull().default('active'),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index('recurring_need_org_status_idx').on(t.organizationId, t.status),
    index('recurring_need_animal_idx')
      .on(t.animalId)
      .where(sql`${t.animalId} is not null`),
  ],
);
