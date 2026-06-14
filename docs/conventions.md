# Code conventions

## Language
- **Code, schema, comments, commits, technical docs → English.**
- **UI copy → Portuguese (pt-BR)**, externalized via next-intl (`apps/web/messages/pt/*`), warm tone: conversational without colloquial contractions ("para o", never "pro"). See `01-docs-referencia/design-system.md` › Voz e tom.
- Route folders + code are English; the **public URLs and query params are pt-BR**, mapped via `beforeFiles` rewrites in `apps/web/next.config.ts` and the query-string map in `apps/web/lib/animals-search-params.ts`.

## Internationalization (next-intl)
- No hardcoded UI strings in components. Keys live in `apps/web/messages/pt/<namespace>.json`, namespaced by feature (`common`, `nav`, `home`, `animals`, `candidates`, `adoptions`, `portal`, `form`, `settings`, `auth`, `emptyStates`, `landing`).
- Client components & non-async Server Components: `const t = useTranslations('animals')`.
- Async Server Components (those that `await`): `const t = await getTranslations('animals')` (`next-intl/server`).
- Markup inside a string: `t.rich('key', { em: (c) => <em>{c}</em> })`. Interpolation: `t('key', { name })`. Plurals: ICU syntax.
- Register new namespaces in `apps/web/i18n/request.ts`.

## TypeScript
- `strict` on, `noUncheckedIndexedAccess`. No `any` — use `unknown` and refine.
- DB types (Drizzle `InferSelectModel`) are the source of truth for DTOs.
- `import type { … }` for type-only imports (`verbatimModuleSyntax`).
- **Arrow functions, always.** Write functions as arrow expressions, not `function`
  declarations — including React components and Next pages/layouts
  (`const Page = () => …; export default Page;`). Server Action exports stay
  `export const fooAction = async (...) => …`. Class methods (e.g. integration
  adapters) stay methods. Enforced via ESLint (`func-style` +
  `eslint-plugin-prefer-arrow-functions`); `eslint --fix` converts.
- Lean on modern TS: `satisfies`, `as const`, discriminated unions, `infer`-based
  DB types — over hand-maintained shapes.

## Names and data
- Hybrid IDs: internal `pk` (`bigint` identity — real PK + FK target, never exposed) + public `id` (prefixed string via `createId(kind)`, app-generated). URLs/API use `id`; FKs/joins use `pk`. Helpers in `packages/db/src/schema/_id.ts`.
- DB is `snake_case` (mapped from camelCase by Drizzle), singular table names.
- Documents (CPF/CNPJ) and phones are stored digits-only / E.164; normalize at the boundary with the `@acolhe-animal/shared` helpers.
- Soft-delete (`archivedAt`/`removedAt`/`cancelledAt`) for historical entities; never hard-delete an adoption/donation.

## Domain
- Every public function takes `Ctx` as its first argument and filters by `ctx.organizationId`.
- Validate input with Zod **inside** the domain function (the domain owns its invariants), even if the web layer also validates.
- Throw `DomainError` (or a subclass) for expected failures. Unexpected errors bubble up.
- Emit `timeline` (narrative, visible) and `audit` (forensic, hidden) explicitly — no magic middleware.
- External side effects (WhatsApp, email) go **outside** the transaction and inside try/catch (a notification failure must not break the operation).

## Web (Next.js)
- Server Components by default; `'use client'` only where there's interaction/state.
- Mutation = a thin Server Action: `requireCtx()` → `action(() => domainFn(ctx, input))` → `revalidatePath(...)`.
- `action()` (`lib/action.ts`) turns a `DomainError` into an `ActionResult` — never leak internals to the user.
- Images via `next/image`. Colors via tokens (`bg-terra`, `text-ink`), never hardcoded hex.
- **Hint / secondary text** (the description under a section heading, a field hint, a toggle sub-label) uses the **`hint` utility** (`globals.css` › `@layer components`: 13px, `ink-mute`, `line-height 1.5`) — alongside `eyebrow` and `display`. Never hand-roll `text-sm text-ink-soft` for hints: it's both bigger (14px) and a darker tone, so hints drift out of the design system.
- **UI primitives come from `apps/web/components/ui/*` (shadcn/Radix).** Dropdowns use the `Select` family (`components/ui/select.tsx`: `Select` / `SelectTrigger` / `SelectValue` / `SelectContent` / `SelectItem`) — **never a raw `<select>`** (it ignores the design tokens and looks off). Same rule for dialogs, inputs, checkboxes, etc.: reach for the `ui/` component first. Radix `Select` is controlled via `value` + `onValueChange` and forbids empty-string item values — use a placeholder for the unset state (or a sentinel value).
- **Date fields** use `<Input type="date">` (the `ui/input` component) — the native browser picker chrome (calendar indicator, datetime-edit text) is themed in `globals.css` under `@layer base` so it matches the tokens. We keep the native picker (no custom DatePicker yet); never use a bare, unthemed `<input type="date">`. The same `@layer base` rules cover `datetime-local` / `time`.
- One responsibility per component. A page is a composition of small components.

## Shared validation
Reusable schemas in `@acolhe-animal/shared` (`phoneSchema`, `cpfSchema`, `cnpjSchema`, `slugSchema`, `moneySchema`…). The same definition validates the form and the Server Action.

## Migrations
`pnpm db:generate` generates the file from the schema; review before committing. `pnpm db:migrate` applies it. For quick dev iteration, `pnpm db:push`.

## Commits
Messages in English, imperative ("Add animal archive flow"). One coherent subject per commit.
