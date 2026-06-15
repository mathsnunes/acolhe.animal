import { sql } from 'drizzle-orm';
import { bigint, index, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

import { uploadStatus } from './enums';
import { fk, surrogatePk } from './_id';
import { organization } from './organization';

/**
 * Upload ledger — tracks the lifecycle of every uploaded object and is the basis
 * for garbage collection. Domain-specific tables (`animal_photo`, `animal_video`)
 * remain the final, structured destination; this table only records staging →
 * commit and lets the sweep delete orphans. See `docs/uploads.md`.
 */
export const upload = pgTable(
  'upload',
  {
    pk: surrogatePk(),
    id: text().notNull().unique(),
    organizationId: fk()
      .notNull()
      .references(() => organization.pk),
    /** `pending` → `committed` / `failed`. */
    status: uploadStatus().notNull().default('pending'),
    /** The `UploadPolicy.key` this upload was requested under. */
    policy: text().notNull(),
    /** `tmp/{org}/{uploadId}/…`, rewritten to the final prefix on commit. */
    storageKey: text().notNull(),
    contentType: text().notNull(),
    sizeBytes: bigint({ mode: 'number' }).notNull(),
    originalFilename: text(),
    /** The entity it belongs to, e.g. `animal` + the draft's public id. */
    ownerType: text(),
    ownerId: text(),
    /** Public id of the actor that requested it (audit trail). */
    createdBy: text(),
    /** The sweep deletes `pending` rows past this. */
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    committedAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // Drives the sweep: only pending rows are ever candidates for deletion.
    index('upload_sweep_idx')
      .on(t.expiresAt)
      .where(sql`${t.status} = 'pending'`),
    index('upload_owner_idx').on(t.ownerType, t.ownerId),
  ],
);
