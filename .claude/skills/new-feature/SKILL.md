---
name: new-feature
description: Scaffold a new vertical feature in Acolhe.animal following the layered architecture (db schema → domain module → server actions → admin page). Use when adding a new entity/feature to the product (e.g. "add a vaccines feature", "create the donations module", "new admin section for X") so the layering, multi-tenancy, i18n and conventions stay consistent.
---

# Scaffold a new feature (Acolhe.animal)

Follow the layers top-down. Read [`/CLAUDE.md`](../../../CLAUDE.md), [`docs/architecture.md`](../../../docs/architecture.md) and [`docs/conventions.md`](../../../docs/conventions.md) first. Code in English; UI copy in pt-BR via next-intl.

## 1. Data (`packages/db/src/schema/`)
- Add the table in the right file (or a new one) using the `casing: 'snake_case'` style: camelCase keys, `timestamp({ withTimezone: true })`, prefixed text PK.
- Add an `organizationId` FK (multi-tenancy) unless it's a global catalog.
- Add enums to `enums.ts`; jsonb shapes to `types.ts`.
- Add indexes (org-scoped query paths, partial uniques) and relations in `relations.ts`.
- Export from `schema/index.ts`; add inferred types to `src/types.ts`.
- Register the ID prefix in `packages/shared/src/ids.ts` (`ID_PREFIX`).
- Run `pnpm db:generate` then `pnpm db:migrate`.

## 2. Domain (`packages/domain/src/<feature>/`)
- `schemas.ts`: Zod input schemas (reuse `@acolhe-animal/shared` field schemas).
- `service.ts`: functions `(ctx: Ctx, input) => …`. Rules:
  - Filter every query by `ctx.organizationId`.
  - Validate input with the Zod schema inside the function.
  - Authorize via `assertCanManageAnimals(ctx)` / `assertAdmin(ctx)` (`auth/permissions.ts`).
  - Throw `DomainError`/`NotFoundError`/`ForbiddenError` from `@acolhe-animal/shared`.
  - Emit `emitTimelineEvent` (narrative) and/or `emitAuditLog` (sensitive) explicitly.
  - Wrap multi-step writes in `withTransaction(ctx, …)`; do external side effects (WhatsApp/email) AFTER commit, in try/catch.
- `index.ts` barrel; export from `packages/domain/src/index.ts`.

## 3. Server Actions (`apps/web/app/(admin)/<route>/actions.ts`)
```ts
'use server';
import { revalidatePath } from 'next/cache';
import { action } from '@/lib/action';
import { requireCtx } from '@/lib/auth-context';
import { createThing } from '@acolhe-animal/domain';

export async function createThingAction(input: unknown) {
  const ctx = await requireCtx();
  const res = await action(() => createThing(ctx, input));
  if (res.ok) revalidatePath('/<route>');
  return res; // ActionResult<T>
}
```
Every export in a `'use server'` file MUST be an async function.

## 4. UI (`apps/web/app/(admin)/<route>/` + `components/<feature>/`)
- RSC page reads via `requireCtx()` + domain list/get; mark interactive parts `'use client'`.
- Use `@/components/ui/*` primitives, `@/components/page-header`, `cn` from `@/lib/utils`, tokens (`bg-terra`, `text-ink`…). Primary button = pill.
- Forms: react-hook-form + `@hookform/resolvers/zod` with the shared schema; submit via the Server Action; toast (sonner) + field errors from `ActionResult.error.fields`.
- **i18n**: no hardcoded copy. Add a `messages/pt/<feature>.json` namespace, register it in `apps/web/i18n/request.ts`, and read via `useTranslations('<feature>')` (client / non-async server) or `await getTranslations('<feature>')` (async server).
- Add the route to `apps/web/components/nav/nav-config.ts` if it's a top-level section (with a `labelKey` added to `messages/pt/nav.json`), and to `RESERVED_SLUGS` in `packages/shared/src/schemas/common.ts` so an org slug can't collide.

## 5. Verify
`pnpm --filter @acolhe-animal/<pkg> exec tsc --noEmit` per touched package, then `pnpm --filter @acolhe-animal/web build`. Seed/run to smoke-test.
