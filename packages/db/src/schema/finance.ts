import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

import {
  bankAccountType,
  cashflowCategory,
  cashflowPaymentMethod,
  cashflowType,
  donationSource,
  donationStatus,
  paymentMethod,
  payoutAccountType,
  payoutStatus,
  pixKeyType,
} from './enums';
import { fk, surrogatePk } from './_id';
import { campaign, campaignItem, recurringNeed } from './campaigns';
import { donor, supporter } from './donors';
import { organization } from './organization';
import { user } from './auth';
import { webhookEvent } from './events';
import type { PayoutDestinationSnapshot } from './types';

/** A single donation transaction. See `modelagem-dados.md` › Donation. */
export const donation = pgTable(
  'donation',
  {
    pk: surrogatePk(),
    id: text().notNull().unique(),
    organizationId: fk()
      .notNull()
      .references(() => organization.pk),
    donorId: fk()
      .notNull()
      .references(() => donor.pk),
    campaignId: fk().references(() => campaign.pk),
    campaignItemId: fk().references(() => campaignItem.pk),
    recurringNeedId: fk().references(() => recurringNeed.pk),
    supporterId: fk().references(() => supporter.pk),
    webhookEventId: text().references(() => webhookEvent.id),
    amount: numeric({ precision: 10, scale: 2 }).notNull(),
    paymentMethod: paymentMethod().notNull(),
    source: donationSource().notNull(),
    status: donationStatus().notNull().default('pending'),
    /** External Asaas payment id; UNIQUE → webhook idempotency. */
    asaasPaymentId: text(),
    confirmedAt: timestamp({ withTimezone: true }),
    message: text(),
    showName: boolean().notNull().default(false),
    showAmount: boolean().notNull().default(true),
    showMessage: boolean().notNull().default(true),
    refundedAt: timestamp({ withTimezone: true }),
    refundReason: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex('donation_asaas_payment_unique')
      .on(t.asaasPaymentId)
      .where(sql`${t.asaasPaymentId} is not null`),
    index('donation_org_confirmed_idx')
      .on(t.organizationId, t.confirmedAt)
      .where(sql`${t.status} = 'confirmed'`),
    index('donation_donor_idx').on(t.donorId, t.confirmedAt),
    index('donation_campaign_idx')
      .on(t.campaignId, t.status)
      .where(sql`${t.campaignId} is not null`),
    index('donation_recurring_need_idx')
      .on(t.recurringNeedId, t.status)
      .where(sql`${t.recurringNeedId} is not null`),
    index('donation_supporter_idx')
      .on(t.supporterId)
      .where(sql`${t.supporterId} is not null`),
  ],
);

/** Generic cashflow ledger entry. Auto-generated from donations + manual entries. */
export const cashflowEntry = pgTable(
  'cashflow_entry',
  {
    pk: surrogatePk(),
    id: text().notNull().unique(),
    organizationId: fk()
      .notNull()
      .references(() => organization.pk),
    type: cashflowType().notNull(),
    category: cashflowCategory().notNull(),
    amount: numeric({ precision: 10, scale: 2 }).notNull(),
    entryDate: timestamp({ mode: 'date', withTimezone: false }).notNull(),
    description: text().notNull(),
    donationId: fk().references(() => donation.pk),
    paymentMethod: cashflowPaymentMethod(),
    createdByUserId: text().references(() => user.id),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index('cashflow_org_date_idx').on(t.organizationId, t.entryDate),
    index('cashflow_org_type_date_idx').on(t.organizationId, t.type, t.entryDate),
    index('cashflow_donation_idx')
      .on(t.donationId)
      .where(sql`${t.donationId} is not null`),
    index('cashflow_org_category_date_idx').on(t.organizationId, t.category, t.entryDate),
  ],
);

/** A configured payout destination (Pix key or bank account). Secrets encrypted. */
export const payoutAccount = pgTable(
  'payout_account',
  {
    pk: surrogatePk(),
    id: text().notNull().unique(),
    organizationId: fk()
      .notNull()
      .references(() => organization.pk),
    type: payoutAccountType().notNull(),
    nickname: text(),
    holderName: text().notNull(),
    holderDocument: text().notNull(),
    pixKeyType: pixKeyType(),
    /** AES-256-GCM encrypted; never returned in plaintext to the UI. */
    pixKeyEncrypted: text(),
    bankCode: text(),
    bankAgency: text(),
    bankAccountEncrypted: text(),
    bankAccountType: bankAccountType(),
    isDefault: boolean().notNull().default(false),
    isActive: boolean().notNull().default(true),
    lastValidatedAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex('payout_account_default_unique')
      .on(t.organizationId)
      .where(sql`${t.isDefault} = true`),
    index('payout_account_active_default_idx').on(t.organizationId, t.isActive, t.isDefault),
    index('payout_account_type_idx').on(t.organizationId, t.type),
  ],
);

/** A transfer from the org's Asaas subaccount to a payout account. Immutable. */
export const payout = pgTable(
  'payout',
  {
    pk: surrogatePk(),
    id: text().notNull().unique(),
    organizationId: fk()
      .notNull()
      .references(() => organization.pk),
    payoutAccountId: fk()
      .notNull()
      .references(() => payoutAccount.pk),
    destinationSnapshot: jsonb().$type<PayoutDestinationSnapshot>().notNull(),
    amount: numeric({ precision: 10, scale: 2 }).notNull(),
    feeAmount: numeric({ precision: 10, scale: 2 }).notNull().default('0'),
    netAmount: numeric({ precision: 10, scale: 2 }).notNull(),
    status: payoutStatus().notNull().default('pending'),
    asaasTransferId: text(),
    requestedByUserId: text().references(() => user.id),
    scheduledFor: timestamp({ withTimezone: true }),
    requestedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    processingStartedAt: timestamp({ withTimezone: true }),
    completedAt: timestamp({ withTimezone: true }),
    failedAt: timestamp({ withTimezone: true }),
    failureReason: text(),
    cashflowEntryId: fk().references(() => cashflowEntry.pk),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex('payout_asaas_transfer_unique')
      .on(t.asaasTransferId)
      .where(sql`${t.asaasTransferId} is not null`),
    index('payout_org_requested_idx').on(t.organizationId, t.requestedAt),
    index('payout_org_status_idx').on(t.organizationId, t.status),
    index('payout_account_idx').on(t.payoutAccountId),
    index('payout_processing_idx')
      .on(t.status, t.processingStartedAt)
      .where(sql`${t.status} = 'processing'`),
  ],
);
