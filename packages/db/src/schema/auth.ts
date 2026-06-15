import { boolean, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

import { userStatus } from './enums';

/**
 * better-auth managed tables.
 *
 * These mirror better-auth's expected shape (core + phoneNumber plugin + admin
 * plugin) plus our `additionalFields` (`status`, `lastSeenAt`). Property keys are
 * camelCase to match better-auth's field names; the `casing: 'snake_case'` config
 * maps them to snake_case columns. Keep in sync with `apps/web/lib/auth.ts` —
 * after changing the auth config, re-run `pnpm db:generate`.
 *
 * Identity (here) is separate from credentials (the `account` table holds the
 * password hash) — see `modelagem-dados.md` › User.
 */

export const user = pgTable('user', {
  id: text().primaryKey(),
  name: text().notNull(),
  // Email is optional in this product — phone is the primary identifier.
  // Standard UNIQUE treats NULLs as distinct, so multiple null emails are fine.
  email: text().unique(),
  emailVerified: boolean().notNull().default(false),
  image: text(),

  // phoneNumber plugin
  phoneNumber: text().unique().notNull(),
  phoneNumberVerified: boolean().notNull().default(false),

  // admin plugin (platform-level ban, distinct from our `status`)
  banned: boolean().default(false),
  banReason: text(),
  banExpires: timestamp({ withTimezone: true }),

  // our additionalFields
  status: userStatus().notNull().default('active'),
  lastSeenAt: timestamp({ withTimezone: true }),

  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const session = pgTable('session', {
  id: text().primaryKey(),
  expiresAt: timestamp({ withTimezone: true }).notNull(),
  token: text().notNull().unique(),
  ipAddress: text(),
  userAgent: text(),
  userId: text()
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export const account = pgTable('account', {
  id: text().primaryKey(),
  accountId: text().notNull(),
  providerId: text().notNull(),
  userId: text()
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text(),
  refreshToken: text(),
  idToken: text(),
  accessTokenExpiresAt: timestamp({ withTimezone: true }),
  refreshTokenExpiresAt: timestamp({ withTimezone: true }),
  scope: text(),
  /** bcrypt hash for the `credential` provider (phone + password). */
  password: text(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export const verification = pgTable('verification', {
  id: text().primaryKey(),
  identifier: text().notNull(),
  value: text().notNull(),
  expiresAt: timestamp({ withTimezone: true }).notNull(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});
