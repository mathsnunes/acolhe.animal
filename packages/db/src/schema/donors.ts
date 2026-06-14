import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

import { supporterStatus } from './enums';
import { fk, surrogatePk } from './_id';
import { city } from './city';
import { organization } from './organization';

/** A donor — created from a portal donation or a Pix webhook. Per-tenant. */
export const donor = pgTable(
  'donor',
  {
    pk: surrogatePk(),
    id: text().notNull().unique(),
    organizationId: fk()
      .notNull()
      .references(() => organization.pk),
    globalDonorId: text(),
    name: text().notNull(),
    phone: text(),
    email: text(),
    cpf: text(),
    cityId: text().references(() => city.id),
    /** Persistent choice to never appear publicly (overrides per-donation flags). */
    isAnonymous: boolean().notNull().default(false),
    notes: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex('donor_org_phone_unique')
      .on(t.organizationId, t.phone)
      .where(sql`${t.phone} is not null`),
    uniqueIndex('donor_org_cpf_unique')
      .on(t.organizationId, t.cpf)
      .where(sql`${t.cpf} is not null`),
    uniqueIndex('donor_org_email_unique')
      .on(t.organizationId, t.email)
      .where(sql`${t.email} is not null`),
    index('donor_org_created_idx').on(t.organizationId, t.createdAt),
  ],
);

/** A monthly recurring supporter (Pix Automático subscription via Asaas). */
export const supporter = pgTable(
  'supporter',
  {
    pk: surrogatePk(),
    id: text().notNull().unique(),
    organizationId: fk()
      .notNull()
      .references(() => organization.pk),
    donorId: fk()
      .notNull()
      .references(() => donor.pk),
    monthlyAmount: numeric({ precision: 10, scale: 2 }).notNull(),
    status: supporterStatus().notNull().default('active'),
    asaasSubscriptionId: text().notNull().unique(),
    startedAt: timestamp({ withTimezone: true }).notNull(),
    cancelledAt: timestamp({ withTimezone: true }),
    cancellationReason: text(),
    nextBillingAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index('supporter_org_status_idx').on(t.organizationId, t.status),
    index('supporter_donor_idx').on(t.donorId),
    index('supporter_next_billing_idx')
      .on(t.nextBillingAt)
      .where(sql`${t.status} = 'active'`),
  ],
);
