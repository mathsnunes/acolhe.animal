# Candidates listing page — design

**Date:** 2026-06-15
**Status:** Approved (pending spec review)
**Scope:** Complete the admin candidates listing page (`/candidatos`) to match the
`candidatos-v4.html` mockup, mirroring the server-paginated pattern recently built
for the animals listing.

## Context

Today `apps/web/app/(admin)/candidates/page.tsx` is a first draft: it loads every
application via `listApplications(ctx)` and renders a basic 4-column Kanban
(`components/candidates/kanban.tsx` + `candidate-card.tsx`). There are no tabs,
filters, view toggle, table view, mobile layout, alert chips, or pagination.

The mockup (`candidatos-v4.html`) defines three views — desktop Kanban, desktop
dense Table, and Mobile cards — plus status tabs, a filter row, a Kanban/Table
toggle, fit indicators, and alert chips.

### Data reality (confirmed during brainstorming)

- `application.applicationData` is a free-form `jsonb` (`z.record(z.string(), z.unknown())`),
  validated loosely and evolving per `formVersion`. There is **no typed form-answer
  schema**, so alerts that depend on specific answers ("falecimento", "crianças")
  are out of scope for this pass.
- There is **no fit/score field** anywhere in the domain or DB.
- `person` has `cityId` + address fields but **no neighborhood field**.
- Existing triage domain (`packages/domain/src/applications/service.ts`) already covers
  assign / status transitions / finalize adoption, and `countWaitingApplicationsByAnimal`.

## Decisions

| Topic | Decision |
|---|---|
| Fit indicator | **Omit** this pass. No fit column/badge. Future feature with explicit rules. |
| Alert chips | **Derivable now** (stale "parada Xd", multi-candidacy "candidata a {animal}") **+ history-based** ("já adotou", "devolveu antes"). No form-answer-derived chips. |
| View + pagination | **Table = server-paginated infinite scroll** (mirrors animals); **Kanban = full-load**. |
| Mobile | **In scope** this pass (full-width cards, scrollable tabs, infinite scroll). |
| Hero metric | Keep current ("Esperando" = `new` + `in-progress`). Not changing to "VIVAS". |
| Tabs vs Kanban | Single status filter applied to all views. In Kanban a specific tab leaves only that column populated; "Todas" shows all 4. |
| Neighborhood | Show city name only (no neighborhood field exists). |

## Architecture

Mirror the animals listing pattern end-to-end. Layers (per the golden rule, business
logic stays in `packages/domain`; the web layer only resolves `Ctx` → calls domain →
shapes output).

### 1. URL & filter mapping (pt-BR)

New `apps/web/lib/candidates-search-params.ts` (mirrors `animals-search-params.ts`):

| Filter | pt-BR param | Values |
|---|---|---|
| status (tab) | `situacao` | `novas` / `em-avaliacao` / `aprovadas` / `encerradas` (absent = Todas) |
| search | `busca` | free text (candidate / animal name) |
| animal | `animal` | animal public id |
| responsible | `responsavel` | user id, or `sem` = unassigned |
| view | `layout` | `quadro` (kanban, desktop default) / `tabela` |

`encerradas` maps to statuses `rejected` + `withdrew`. `draft` never listed.

New `apps/web/lib/candidates-query.ts` (mirrors `animals-query.ts`): `CandidatesFilterInput`,
casting/type-guard helpers, `CandidateListItem`, `CandidatesPage` shape, `CANDIDATES_PAGE_SIZE`.

### 2. Domain (`packages/domain/src/applications/service.ts`)

- Extend `listApplications` with `filters` (statusGroup, search, animalId,
  assignedToUserId | unassigned) + `offset` / `limit` + ordering (stale first, then
  most recent by `statusChangedAt`).
- Add `countApplicationsByStatus(ctx, filters)` → counts per status group for the tabs
  (ignores the status filter itself, like animals' `countAnimalsByStatus`).
- Extend `ApplicationWithRelations`: `animal` gains `size`; person gains `cityName`.
- Batched alert helpers (one query for the whole page, no N+1):
  - `getMultipleCandidacies(ctx, personPks)` → other active candidacies (animal name) per person.
  - `getPersonAdoptionHistory(ctx, personPks)` → `{ adoptedBefore, returnedBefore }` per person.

All queries filter by `ctx.organizationId` (multi-tenancy).

### 3. Load layer (`app/(admin)/candidates/load-candidates.ts`)

`loadCandidatesPage(ctx, filters, offset, limit)`:
1. Query the page of applications (domain).
2. In parallel resolve: animal covers (`getAnimalCovers`), responsible user
   name/initials, batched alert helpers.
3. Compute `stale` = status ∈ {`new`,`in-progress`} AND `statusChangedAt` older than 3 days.
4. Map to `CandidateListItem`. Return `{ items, nextOffset, hasMore }`.

Used by the server page (offset 0) and the load-more action.

### 4. Server action (`app/(admin)/candidates/actions.ts`)

Add `loadCandidatesPageAction({ filters, offset, limit })` — pure read (no `action()`
wrapper), `requireCtx()` then `loadCandidatesPage`. Mirrors `loadAnimalsPageAction`.

### 5. Page (`app/(admin)/candidates/page.tsx`)

Decode params → build filters → `Promise.all([loadCandidatesPage(…, 0, SIZE),
countApplicationsByStatus(…)])` → render `<PageHeaderHero>` + `<CandidatesFilters>` +
`<CandidatesListing key={filterKey} initial={firstPage} view={…} filters={…} pageSize={SIZE} />`.
`key` remounts the listing on any filter change (animals pattern).

### 6. Components (`apps/web/components/candidates/`)

- **`candidates-filters.tsx`** — status tabs (with counts), search input, Animal and
  Responsible dropdowns (`Select` family from `components/ui/select.tsx`), Kanban/Table
  toggle. Applies filters via URL navigation (like animals).
- **`candidates-listing.tsx`** (client) — chooses render by `view` + breakpoint:
  - **Kanban** (desktop, `quadro`): full-load, 4 columns (reuse `status-meta.ts`),
    cards = updated `candidate-card`.
  - **Table** (desktop, `tabela`): infinite scroll via `IntersectionObserver`
    (mirror `animals-listing`), columns Candidata · Animal · Alertas · Submetida ·
    Status · Responsável (no Fit). Terra left indicator when stale. Row skeleton.
  - **Mobile**: always full-width cards (reuse the Kanban card), infinite scroll.
- **`alert-chips.tsx`** — chip set (stale "parada Xd", "candidata a {animal}",
  "já adotou", "devolveu antes") with mockup colors (terra / rose / green / mute).
- Update **`candidate-card.tsx`** for the new layout (location, alert chips,
  responsible / unassigned, terra border when stale).

### 7. i18n (`apps/web/messages/pt/candidates.json`)

Add namespaces: `tabs` (todas / novas / emAvaliacao / aprovadas / encerradas),
`filters` (busca, animal, responsavel, semResponsavel, todos), `view` (quadro / tabela),
`table` (column headers), `alerts` (paradaXd, candidataA, jaAdotou, devolveuAntes).

## Styling

Use existing design tokens (`bg-terra`, `text-ink`, `border-line`, `hint`, etc.).
Build dropdowns on the `Select` family, never raw `<select>`. Stale indicator = terra
left border on cards/rows. Status pills reuse `status-meta.ts` colors.

## Out of scope

- Fit indicator / scoring.
- Form-answer-derived alerts (falecimento, crianças, etc.).
- Changing triage/detail-page behavior or domain transition logic.
- Neighborhood display.

## Testing / validation

- Targeted typecheck + lint on touched packages.
- Manual verification via the dev server preview: tabs filter, search, Animal/Responsible
  dropdowns, Kanban↔Table toggle, infinite scroll on Table + Mobile, alert chips and
  stale indicator rendering against seeded data.
