import { sql } from 'drizzle-orm';
import { boolean, index, jsonb, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

import { fk, surrogatePk } from './_id';
import { city } from './city';
import {
  asaasKycStatus,
  asaasOnboardingStatus,
  inviteStatus,
  memberRole,
  orgDocumentType,
  organizationStatus,
} from './enums';
import { user } from './auth';
import type { PortalConfig } from './types';

/**
 * The tenant: an NGO or individual protector. Owns all animals, people, donors,
 * campaigns. Has a customizable public portal and (when CNPJ) an Asaas subaccount.
 * See `modelagem-dados.md` › Organization.
 */
export const organization = pgTable(
  'organization',
  {
    pk: surrogatePk(),
    id: text().notNull().unique(),
    name: text().notNull(),
    /**
     * Portal URL: acolhe.animal/<slug>. Globally unique when set. Null until the
     * owner enables the portal in settings — orgs no longer claim a URL at signup.
     */
    slug: text().unique(),
    /** Whether the public portal is live. Off by default; turned on in settings. */
    portalEnabled: boolean().notNull().default(false),
    /** CPF or CNPJ, digits only. */
    document: text().notNull().unique(),
    documentType: orgDocumentType().notNull(),
    status: organizationStatus().notNull().default('onboarding'),

    email: text(),
    phone: text().notNull(),

    cityId: text().references(() => city.id),
    streetAddress: text(),
    addressNumber: text(),
    addressComplement: text(),
    postalCode: text(),
    foundedAt: timestamp({ mode: 'date', withTimezone: false }),

    logoUrl: text(),
    coverUrl: text(),
    aboutText: text(),

    /** Portal rendering config (colors, sections, order). Defaults applied in app. */
    portalConfig: jsonb().$type<PortalConfig>().notNull().default(sql`'{}'::jsonb`),

    // ── Asaas subaccount (Pillar 2) ──
    asaasAccountId: text(),
    /** AES-256-GCM encrypted; never logged, never returned to the client. */
    asaasApiKeyEncrypted: text(),
    asaasWalletId: text(),
    asaasKycStatus: asaasKycStatus().notNull().default('pending'),
    asaasOnboardingStatus: asaasOnboardingStatus().notNull().default('not_started'),
    /** Cached Pix key for portal display; source of truth is Asaas. */
    asaasPixKeyCached: text(),

    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index('organization_status_idx').on(t.status),
    index('organization_active_city_idx')
      .on(t.cityId)
      .where(sql`${t.status} = 'active'`),
  ],
);

/**
 * Junction User ↔ Organization with a role. The source of truth for "can this
 * user operate in this org?". Soft-delete via `removedAt`; readmission is a new
 * row (preserves history). See `modelagem-dados.md` › OrganizationMember.
 */
export const organizationMember = pgTable(
  'organization_member',
  {
    pk: surrogatePk(),
    id: text().notNull().unique(),
    userId: text()
      .notNull()
      .references(() => user.id),
    organizationId: fk()
      .notNull()
      .references(() => organization.pk),
    role: memberRole().notNull(),
    invitedByUserId: text().references(() => user.id),
    joinedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    removedAt: timestamp({ withTimezone: true }),
    removedByUserId: text().references(() => user.id),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    // At most one active membership per (user, org).
    uniqueIndex('organization_member_active_unique')
      .on(t.userId, t.organizationId)
      .where(sql`${t.removedAt} is null`),
    index('organization_member_user_active_idx')
      .on(t.userId)
      .where(sql`${t.removedAt} is null`),
    index('organization_member_org_active_idx')
      .on(t.organizationId)
      .where(sql`${t.removedAt} is null`),
    index('organization_member_org_role_idx')
      .on(t.organizationId, t.role)
      .where(sql`${t.removedAt} is null`),
    index('organization_member_invited_by_idx')
      .on(t.invitedByUserId)
      .where(sql`${t.invitedByUserId} is not null`),
  ],
);

/**
 * A pending invitation to join an org. Lives before the User exists (new person)
 * or alongside an existing User (second org). See `modelagem-dados.md` › OrganizationInvite.
 */
export const organizationInvite = pgTable(
  'organization_invite',
  {
    pk: surrogatePk(),
    id: text().notNull().unique(),
    organizationId: fk()
      .notNull()
      .references(() => organization.pk),
    invitedByUserId: text()
      .notNull()
      .references(() => user.id),
    phoneNumber: text().notNull(),
    name: text(),
    email: text(),
    role: memberRole().notNull(),
    token: text().notNull().unique(),
    status: inviteStatus().notNull().default('pending'),
    expiresAt: timestamp({ withTimezone: true })
      .notNull()
      .default(sql`now() + interval '7 days'`),
    acceptedAt: timestamp({ withTimezone: true }),
    acceptedByUserId: text().references(() => user.id),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // Only one pending invite per phone per org.
    uniqueIndex('organization_invite_pending_unique')
      .on(t.organizationId, t.phoneNumber)
      .where(sql`${t.status} = 'pending'`),
    index('organization_invite_phone_status_idx').on(t.phoneNumber, t.status),
    index('organization_invite_org_status_idx').on(t.organizationId, t.status),
    index('organization_invite_expiry_idx')
      .on(t.expiresAt)
      .where(sql`${t.status} = 'pending'`),
  ],
);
