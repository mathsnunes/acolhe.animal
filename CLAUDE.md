# CLAUDE.md — Acolhe.animal repository guide

Context for anyone (or any AI) working in this codebase. Read it once; come back when you wonder "where does X live?".

## The product

**Acolhe.animal** is *infrastructure*, not a marketplace: the tool that organizes the day-to-day work of animal-adoption NGOs and individual rescuers under the hood. Two pillars:

- **Pillar 1 — Adoption management** (implemented): animals, applications (funnel + public form), adoptions (digital term).
- **Pillar 2 — Donation portal** (schema ready, domain/UI later): donations via Asaas/Pix, campaigns, monthly support, cashflow.

Phone is the primary identifier (OTP over WhatsApp). Serves both NGOs (CNPJ) and individual rescuers (CPF).

Product/data-model/design reference lives in `01-docs-referencia/` (in Portuguese, outside the code). When a product decision is ambiguous, that's the source of truth.

## Monorepo (pnpm + Turborepo)

```
apps/web/            Next.js 15 (App Router) — frontend + backend together for now
packages/
  shared/            types, Zod schemas, IDs, utils — ISOMORPHIC (client+server), no heavy runtime deps
  db/                Drizzle schema, client, migrations, seeds — SERVER-ONLY
  domain/            PURE business logic (no Next/HTTP/session) — the brain
  integrations/      external-provider adapters behind interfaces (Asaas, R2, WhatsApp, email)
  messaging/         versioned WhatsApp/email templates (pure functions)
```

Packages expose **TypeScript source directly** (`exports: "./src/index.ts"`, no build step). Next compiles them via `transpilePackages`; scripts run through `tsx`. Shared dependency versions are centralized in the **catalog** in `pnpm-workspace.yaml`.

## The golden rule (architecture)

> Business logic lives in `packages/domain`. Server Actions and Route Handlers in `apps/web` only **take input → call the domain → return output**.

That's what lets us extract the backend later with little work. Concretely:

- Every domain function takes a **`Ctx`** (`{ db, organizationId, actor }`) as its first argument, carrying the tenant and the actor (user/public/system).
- **Multi-tenancy** is enforced by filtering on `ctx.organizationId` in every query — never trusting an id from the client.
- The web layer is the **only** place that reads a session (`apps/web/lib/auth-context.ts`), builds the `Ctx`, and calls the domain.
- The domain does **not** import Next, does not read `process.env`, does not speak HTTP. External effects (storage, WhatsApp) go through the `@acolhe-animal/integrations` interfaces.

Flow of a mutation:

```
Client → Server Action (apps/web/.../actions.ts)
           ├─ requireCtx()                         (resolve session → Ctx)
           ├─ action(() => domainFn(ctx, input))   (map DomainError → ActionResult)
           └─ revalidatePath(...)
                 → domainFn validates (Zod) + applies the rule + emits timeline/audit
                       → @acolhe-animal/db (Drizzle)  /  @acolhe-animal/integrations
```

## Layers and dependencies (who may import whom)

```
shared  ← db ← domain ← apps/web
shared  ← integrations ← domain
shared  ← messaging ← domain
```

`shared` is a leaf. `domain` orchestrates db + integrations + messaging. `apps/web` orchestrates everything + UI. Never the other way around.

## Conventions in brief

- **Language**: code, schema, comments, commits and technical docs are in **English**. End-user UI copy is **Portuguese (pt-BR)**, externalized via **next-intl** (`apps/web/messages/pt/*`, namespaced by feature) — see "Internationalization" below.
- **URLs are pt-BR**, mapped to English route folders via `beforeFiles` rewrites in `apps/web/next.config.ts` (`/animais` → `app/(admin)/animals`, `/candidatos` → `candidates`, `/inicio` → `home`, public `/[slug]/adotar/[animalId]`). **Query params are pt-BR too** (keys + values, e.g. `?especie=cachorro&tamanho=pequeno&layout=lista`), translated centrally in `apps/web/lib/animals-search-params.ts`. Route folders + code stay English. Reserved route names (pt + en) are blocked as org slugs in `packages/shared/src/schemas/common.ts`.
- **Arrow functions**: write functions as arrow expressions, not `function` declarations (components, pages and helpers included). Enforced by ESLint (`func-style` + `eslint-plugin-prefer-arrow-functions`); `eslint --fix` converts. See `docs/conventions.md`.
- **IDs (hybrid)**: every entity has an internal `pk` (`bigint generated always as identity`) — the real primary key and the target of every foreign key, **never exposed to clients** — plus a public `id`, a prefixed string from `createId(kind)` (`@acolhe-animal/shared`), generated in the app. URLs/API and `entityId` references speak the public `id`; FKs/joins use `pk`. `ctx.organizationId` carries the org's `pk`. Helpers in `packages/db/src/schema/_id.ts`; the surrogate stays hidden so the public surface is opaque and non-enumerable.
- **DB**: `snake_case` columns (Drizzle maps from camelCase via `casing: 'snake_case'`), singular table names. Soft-delete for historical entities.
- **Validation**: Zod on every external input; reusable schemas in `@acolhe-animal/shared` (E.164 phone, CPF/CNPJ, slug…). Error messages in pt-BR.
- **Styling**: design tokens in `apps/web/app/globals.css` (Tailwind v4 `@theme`). Colors via utilities (`bg-terra`, `text-ink`, `border-line`) — never hardcoded hex. Primary button is a pill (`rounded-full`). Editorial utilities live in `@layer components`: `eyebrow`/`eyebrow-mute` (kickers), `display` (Fraunces headings), and **`hint`** for secondary/descriptive text under a label or section heading (13px, `ink-mute`). **Use `hint` for every form/section hint** — don't hand-roll `text-sm text-ink-soft` (that renders bigger and in the wrong, darker tone).
- **UI components**: always build on the shadcn/Radix primitives in `apps/web/components/ui/`. Dropdowns use the **`Select` family** (`components/ui/select.tsx`: `Select`/`SelectTrigger`/`SelectValue`/`SelectContent`/`SelectItem`) — **never a raw `<select>`** (it ignores the design tokens). Same for dialogs, inputs, checkboxes, etc. Radix `Select` is controlled via `value`+`onValueChange` and rejects empty-string item values — use a placeholder for the unset state. **Date fields** use `<Input type="date">` (the `ui/input` component); the native picker chrome (calendar icon, edit text) is themed in `globals.css` (`@layer base`) so it stays on-brand — don't drop in an unstyled raw `<input type="date">`.
- **Errors**: the domain throws `DomainError` (from `@acolhe-animal/shared`); the web layer maps it to `ActionResult` via `lib/action.ts`.

## Internationalization

UI copy is **not** hardcoded in components. It lives in `apps/web/messages/pt/<namespace>.json` and is read through next-intl:

- Client components & non-async Server Components: `const t = useTranslations('animals')`.
- Async Server Components (those that `await`): `const t = await getTranslations('animals')` (from `next-intl/server`).
- Markup inside a string: `t.rich('key', { em: (c) => <em>{c}</em> })`. Interpolation: `t('key', { name })`.

Single locale (`pt-BR`) without URL routing, configured in `apps/web/i18n/request.ts`. Adding a language later = a new `messages/<locale>` folder; no component changes.

Note: domain-layer error messages and WhatsApp/email templates are still authored in pt-BR (server-side strings, not part of the web UI dictionary). Moving those to a code-based i18n is a future step.

## Integrations (mock by default)

`INTEGRATIONS_MODE=mock` (default) stubs Asaas, R2, WhatsApp and email — runs fully offline. The `live` adapters are stubs to implement. In dev, **OTP and WhatsApp messages print to the `pnpm dev` console**. Uploaded images go to `.local-storage/` and are served by `/local-storage/*`.

## Authentication

better-auth (phone + password + OTP), config in `apps/web/lib/auth.ts`. **Dev shortcut**: when there's no session in `development`, `lib/auth-context.ts` auto-logs-in the seeded admin (Angeli Felice) so the panel is demoable without completing login. This **never** applies in production. Real login at `/login`.

## Run locally

```bash
pnpm install
pnpm db:up          # Postgres in Docker
pnpm db:migrate     # or: pnpm db:push in dev
pnpm db:seed        # cities + Angeli Felice org + sample animals
pnpm dev            # http://localhost:3000
```

Dev login: phone **+55 48 99999-0000**, password **acolhe123** (or just open `/home` in dev).

## Where things live

| I need… | Go to… |
|---|---|
| a new business rule | `packages/domain/src/<feature>/` |
| a new field/table | `packages/db/src/schema/` → `pnpm db:generate` |
| a shared validation schema | `packages/shared/src/schemas/` |
| a new external provider | `packages/integrations/src/<provider>/` (interface + mock + live) |
| a primitive UI component | `apps/web/components/ui/` (shadcn) |
| navigation | `apps/web/components/nav/` |
| UI copy | `apps/web/messages/pt/<namespace>.json` |
| an admin page | `apps/web/app/(admin)/<route>/` |
| the public portal / form | `apps/web/app/[slug]/` |

Detailed docs in [`docs/`](docs/).
