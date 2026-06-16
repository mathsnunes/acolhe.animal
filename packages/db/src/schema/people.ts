import { sql } from 'drizzle-orm';
import { boolean, index, jsonb, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

import { adoptionSource, applicationStatus } from './enums';
import { fk, surrogatePk } from './_id';
import { animal } from './animals';
import { city } from './city';
import { organization } from './organization';
import { user } from './auth';
import type { AdopterAddress, JsonRecord, SignatureMetadata } from './types';

/**
 * A person known to an org — candidate, adopter, or someone who started a form.
 * Per-tenant (no link across orgs). Not a system user. See `modelagem-dados.md` › Person.
 */
export const person = pgTable(
  'person',
  {
    pk: surrogatePk(),
    id: text().notNull().unique(),
    organizationId: fk()
      .notNull()
      .references(() => organization.pk),
    /** Reserved hook for a future cross-org network. Null in the MVP. */
    globalPersonId: text(),
    name: text().notNull(),
    phone: text().notNull(),
    phoneVerified: boolean().notNull().default(false),
    email: text(),
    cpf: text(),
    cityId: text().references(() => city.id),
    streetAddress: text(),
    addressNumber: text(),
    addressComplement: text(),
    addressNeighborhood: text(),
    postalCode: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex('person_org_phone_unique').on(t.organizationId, t.phone),
    uniqueIndex('person_org_cpf_unique')
      .on(t.organizationId, t.cpf)
      .where(sql`${t.cpf} is not null`),
    uniqueIndex('person_org_email_unique')
      .on(t.organizationId, t.email)
      .where(sql`${t.email} is not null`),
    index('person_global_idx')
      .on(t.globalPersonId)
      .where(sql`${t.globalPersonId} is not null`),
  ],
);

/**
 * A candidacy of a Person to an Animal. Each public-form submit (or started
 * draft) is a row. See `modelagem-dados.md` › Application.
 */
export const application = pgTable(
  'application',
  {
    pk: surrogatePk(),
    id: text().notNull().unique(),
    /** Denormalized from animal.organizationId to avoid a JOIN on the hot path. */
    organizationId: fk()
      .notNull()
      .references(() => organization.pk),
    animalId: fk()
      .notNull()
      .references(() => animal.pk),
    personId: fk()
      .notNull()
      .references(() => person.pk),
    /** Immutable snapshot of the form answers at submit (validated by Zod). */
    applicationData: jsonb().$type<JsonRecord>(),
    formVersion: text().notNull(),
    status: applicationStatus().notNull().default('draft'),
    assignedToUserId: text().references(() => user.id),
    internalNotes: text(),
    statusChangedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    submittedAt: timestamp({ withTimezone: true }),
    expiresAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    // One active candidacy per (person, animal) — draft included.
    uniqueIndex('application_active_per_animal')
      .on(t.organizationId, t.personId, t.animalId)
      .where(sql`${t.status} not in ('rejected', 'withdrew')`),
    index('application_org_status_idx').on(t.organizationId, t.status),
    index('application_animal_status_idx').on(t.animalId, t.status),
    index('application_person_idx').on(t.personId),
    index('application_assigned_idx')
      .on(t.assignedToUserId)
      .where(sql`${t.assignedToUserId} is not null`),
    index('application_stale_idx')
      .on(t.statusChangedAt)
      .where(sql`${t.status} in ('new', 'in-progress')`),
    index('application_draft_expiry_idx')
      .on(t.expiresAt)
      .where(sql`${t.status} = 'draft'`),
  ],
);

/**
 * A completed, formalized adoption. Immutable after creation (only `cancelledAt`
 * may be set). Holds the signed term and a snapshot of the adopter. See
 * `modelagem-dados.md` › Adoption.
 */
export const adoption = pgTable(
  'adoption',
  {
    pk: surrogatePk(),
    id: text().notNull().unique(),
    organizationId: fk()
      .notNull()
      .references(() => organization.pk),
    personId: fk()
      .notNull()
      .references(() => person.pk),
    applicationId: fk().references(() => application.pk),
    animalId: fk()
      .notNull()
      .references(() => animal.pk),
    source: adoptionSource().notNull(),

    // Snapshots — frozen at signature time.
    adopterName: text().notNull(),
    adopterDocument: text().notNull(),
    adopterPhone: text().notNull(),
    adopterAddress: jsonb().$type<AdopterAddress>().notNull(),

    extraClauses: text(),
    termPdfUrl: text().notNull(),
    termPdfHash: text().notNull(),
    signatureMetadata: jsonb().$type<SignatureMetadata>().notNull(),

    adoptedAt: timestamp({ withTimezone: true }).notNull(),
    cancelledAt: timestamp({ withTimezone: true }),
    cancellationReason: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('adoption_application_unique')
      .on(t.applicationId)
      .where(sql`${t.applicationId} is not null`),
    index('adoption_org_date_idx').on(t.organizationId, t.adoptedAt),
    index('adoption_person_date_idx').on(t.personId, t.adoptedAt),
    index('adoption_animal_date_idx').on(t.animalId, t.adoptedAt),
    index('adoption_org_source_idx').on(t.organizationId, t.source),
    index('adoption_active_idx')
      .on(t.adoptedAt)
      .where(sql`${t.cancelledAt} is null`),
  ],
);
