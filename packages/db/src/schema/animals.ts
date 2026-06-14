import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

import {
  animalSex,
  animalSize,
  animalSpecies,
  animalStatus,
  energyLevel,
  instagramArtType,
  neuteredStatus,
  sociability,
  videoProcessingStatus,
} from './enums';
import { fk, surrogatePk } from './_id';
import { organization } from './organization';
import type { ClinicalCondition, Vaccination } from './types';

/** The animal's living record — core of adoption management. See `modelagem-dados.md` › Animal. */
export const animal = pgTable(
  'animal',
  {
    pk: surrogatePk(),
    id: text().notNull().unique(),
    organizationId: fk()
      .notNull()
      .references(() => organization.pk),
    name: text().notNull(),
    species: animalSpecies().notNull(),
    sex: animalSex().notNull(),

    // Age: either a birth date, or months-at-intake + a reference date (CHECK below).
    estimatedBirthDate: timestamp({ mode: 'date', withTimezone: false }),
    ageMonthsAtIntake: integer(),
    ageReferenceDate: timestamp({ mode: 'date', withTimezone: false }),

    size: animalSize(),
    predominantColor: text(),
    weightKg: numeric({ precision: 4, scale: 2 }),
    status: animalStatus().notNull().default('available'),

    /** Temporary, structured health state (does NOT block adoption). */
    clinicalCondition: jsonb().$type<ClinicalCondition>(),
    neutered: neuteredStatus().notNull(),
    vaccinations: jsonb().$type<Vaccination[]>().notNull().default(sql`'[]'::jsonb`),
    /** Permanent free tags (FIV+, three legs, epilepsy). */
    specialConditions: text()
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),

    energyLevel: energyLevel(),
    goodWithChildren: sociability(),
    goodWithDogs: sociability(),
    goodWithCats: sociability(),
    goodWithStrangers: sociability(),
    quirks: text(),

    intakeDate: timestamp({ mode: 'date', withTimezone: false }).notNull(),
    rescueDate: timestamp({ mode: 'date', withTimezone: false }),
    rescueLocation: text(),
    shortStory: text(),

    visibleOnPortal: boolean().notNull().default(true),
    listedForAdoption: boolean().notNull().default(true),
    archivedAt: timestamp({ withTimezone: true }),

    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    check(
      'animal_age_present',
      sql`${t.estimatedBirthDate} is not null or (${t.ageMonthsAtIntake} is not null and ${t.ageReferenceDate} is not null)`,
    ),
    index('animal_org_status_active_idx')
      .on(t.organizationId, t.status)
      .where(sql`${t.archivedAt} is null`),
    index('animal_org_archived_idx').on(t.organizationId, t.archivedAt),
    index('animal_org_listed_idx')
      .on(t.organizationId, t.listedForAdoption)
      .where(sql`${t.archivedAt} is null`),
  ],
);

/** Animal photos — separate table for reorder, soft delete, per-photo metadata. */
export const animalPhoto = pgTable(
  'animal_photo',
  {
    pk: surrogatePk(),
    id: text().notNull().unique(),
    animalId: fk()
      .notNull()
      .references(() => animal.pk, { onDelete: 'cascade' }),
    originalUrl: text().notNull(),
    thumbUrl: text().notNull(),
    mediumUrl: text().notNull(),
    altText: text(),
    displayOrder: integer().notNull().default(0),
    isPrimary: boolean().notNull().default(false),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('animal_photo_order_idx').on(t.animalId, t.displayOrder)],
);

/** Animal videos — async transcoding pipeline, different metadata from photos. */
export const animalVideo = pgTable(
  'animal_video',
  {
    pk: surrogatePk(),
    id: text().notNull().unique(),
    animalId: fk()
      .notNull()
      .references(() => animal.pk, { onDelete: 'cascade' }),
    originalUrl: text().notNull(),
    processedUrl: text(),
    posterUrl: text(),
    durationSeconds: integer(),
    format: text(),
    processingStatus: videoProcessingStatus().notNull().default('pending'),
    caption: text(),
    displayOrder: integer().notNull().default(0),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('animal_video_order_idx').on(t.animalId, t.displayOrder),
    index('animal_video_queue_idx')
      .on(t.processingStatus)
      .where(sql`${t.processingStatus} in ('pending', 'processing')`),
  ],
);

/** Generated Instagram art — at most one per (animal, type); regenerate = upsert. */
export const animalInstagramArt = pgTable(
  'animal_instagram_art',
  {
    pk: surrogatePk(),
    id: text().notNull().unique(),
    animalId: fk()
      .notNull()
      .references(() => animal.pk, { onDelete: 'cascade' }),
    type: instagramArtType().notNull(),
    imageUrl: text().notNull(),
    caption: text(),
    generatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('animal_instagram_art_unique').on(t.animalId, t.type),
    index('animal_instagram_art_animal_idx').on(t.animalId),
  ],
);
