# Adoption / candidacy flow — design

**Date:** 2026-06-15
**Status:** Approved (pending spec review)
**Scope:** Make the application (candidatura) → adoption funnel an explicit, correct
state machine: add the terminal `adopted` state set on formalization, add a
`cancelled` state for reverted adoptions, group both under "Encerradas", and tidy
the allowed transitions. Domain + a thin slice of the candidates UI.

## Context (current implementation)

Application status enum (`packages/db/src/schema/enums.ts`):
`draft · new · in-progress · approved · rejected · withdrew`.

Transitions today:
- `new` → `in-progress` (start review) | `rejected`
- `in-progress` → `approved` | `rejected` | `withdrew`
- `approved` → `in-progress` (back to review; frees the animal if no other approved app)
- `rejected` / `withdrew` → `in-progress` (reopen)
- **Formalize** (`finalizeDigitalAdoption`, `packages/domain/src/adoptions/service.ts`):
  allowed only when `approved`; creates the immutable `adoption`, sets the **animal**
  to `adopted` — **but leaves the application `approved`.**
- **Cancel adoption** (`cancelAdoption`): sets `adoption.cancelledAt` + frees the
  animal — **but leaves the application untouched.**

The triage UI lives in `apps/web/components/candidates/status-control.tsx` (`stepsFor`)
and the listing grouping in `packages/domain/.../applications/service.ts`
(`GROUP_STATUSES`, `statusToGroup`, `ALL_LISTED_STATUSES`) +
`apps/web/components/candidates/status-meta.ts` (`KANBAN_COLUMNS`, `STATUS_META`).

### Problems this fixes

1. **No terminal "adopted" state.** A formalized candidacy stays in "Aprovadas"
   forever; the desired flow is that it becomes *encerrada*.
2. **Re-formalization crashes.** Because status stays `approved`, the "formalizar"
   button keeps showing; a second attempt hits the `adoption_application_unique`
   index and throws a raw DB error instead of a friendly `ConflictError`.
3. **Cancelling an adoption leaves the candidacy inconsistent.** The animal returns
   to `available` but the application is still `approved`.

## Decisions (confirmed)

| Topic | Decision |
|---|---|
| Terminal "adopted" | Add an explicit `adopted` status, set on formalization. |
| Adoption cancelled (devolução) | Application → new `cancelled` status (encerrada); animal freed; reopenable manually. |
| Exits from `approved` | Allow back-to-review **and** reject/withdraw directly (plus formalize). |
| Where `adopted` shows | In "Encerradas" with a green success chip, distinct from rejected/withdrew/cancelled. |
| Reopen | `rejected` / `withdrew` / `cancelled` → reopen to `in-progress`. `adopted` is terminal (no reopen, no re-formalize). |

## State machine (target)

```
draft → new → in-progress → approved → adopted        (adopted: terminal)
              │   ▲   ▲          │
   recusar/   │   │   └─ voltar ─┤
   desistir   │   │              ├─ recusar / desistir → rejected / withdrew
              ▼   │              └─ formalizar ───────▶ adopted
        rejected /│ withdrew ──reabrir──▶ in-progress
                  │
        cancelled ─reabrir──────────────▶ in-progress   (set by cancelAdoption)
```

- **Active (the "live" funnel):** `new`, `in-progress`, `approved`.
- **Closed ("Encerradas"):** `adopted`, `cancelled`, `rejected`, `withdrew`.
- **Reopenable:** `rejected`, `withdrew`, `cancelled` → `in-progress`.
- **Truly terminal:** `adopted` (the only irreversible point; undoing it is a
  *cancel adoption*, which produces `cancelled`).

## Changes

### 1. Enum + migration — `packages/db/src/schema/enums.ts`
Add `adopted` and `cancelled` to `applicationStatus`. Generate the Drizzle
migration (`ALTER TYPE ... ADD VALUE`).

### 2. Domain — `packages/domain/src/adoptions/service.ts`
- `finalizeDigitalAdoption`: inside the existing transaction, after inserting the
  adoption and marking the animal `adopted`, set the application
  `status = 'adopted'`, `statusChangedAt = now`. (The `status === 'approved'` guard
  stays, so a second call throws `ConflictError` — problem #2.)
- `cancelAdoption`: when `adoption.applicationId` is set (digital adoptions), set
  that application `status = 'cancelled'`, `statusChangedAt = now`, in the same
  transaction that frees the animal. Offline adoptions (no application) unchanged.

### 3. Domain — `packages/domain/src/applications/service.ts`
- `GROUP_STATUSES.closed` and `ALL_LISTED_STATUSES`: include `adopted` and `cancelled`.
- `statusToGroup`: map `adopted` and `cancelled` → `'closed'`.
- `setApplicationStatus` already accepts `rejected`/`withdrew` and frees the animal
  when reverting from `approved`; no signature change. It does **not** accept
  `adopted`/`cancelled` (those are set only by the adoption service).

### 4. Triage UI — `apps/web/components/candidates/status-control.tsx`
Update `stepsFor`:
- `approved` → `backToReview` (in-progress) **+ reject + withdrew**.
- `adopted` → `[]` (no actions; terminal).
- `cancelled` (and `rejected`/`withdrew`) → `reopen` (in-progress).
- Guard the `default` branch so `adopted` is never treated as reopenable.

### 5. Status metadata + grouping — `apps/web/components/candidates/status-meta.ts`
- `STATUS_META`: add `adopted` (green success: `bg-green/10 text-green-soft`,
  `bg-green-soft` dot) and `cancelled` (neutral: `bg-bg-2 text-ink-mute`).
- `KANBAN_COLUMNS.closed.statuses`: `['rejected', 'withdrew', 'adopted', 'cancelled']`.
- `statusLabelKey` covers the new kebab-free keys (`adopted`, `cancelled` need no
  transform).

### 6. Listing query — `apps/web/lib/candidates-query.ts`
No change needed (it delegates grouping to the domain's `ApplicationStatusGroup`).
Confirm the `closed` bucket flows through.

### 7. Card / row rendering — `candidate-card.tsx`, `candidate-row.tsx`
- `isClosed` includes `adopted` and `cancelled`.
- `adopted` → green "adotada" pill; `cancelled` → neutral "devolvida" pill;
  `rejected`/`withdrew` as today. The "formalizar adoção" cue stays gated on
  `approved` only.

### 8. i18n — `apps/web/messages/pt/candidates.json`
Add `status.adopted` ("Adotada") and `status.cancelled` ("Devolvida"). The detail
page's status banner / timeline reuse `status.*`.

## Out of scope
- Offline adoptions (no application in the funnel).
- The animal reservation logic (already consistent: approved→reserved,
  adopted→adopted, revert/cancel→available).
- Re-architecting the timeline; `finalize` keeps emitting `adoption.completed`.
- Listing-page layout (done in the separate candidates-listing work).

## Testing / validation
- Targeted typecheck + lint on `@acolhe-animal/domain` and `apps/web`.
- `pnpm db:generate` produces a clean migration adding the two enum values.
- Manual verification on the dev server: formalize an approved candidacy → it lands
  in "Encerradas" with the green chip, the formalize button is gone, and the funnel
  no longer offers re-formalization; reject/withdraw straight from "Aprovada";
  reopen a rejected/withdrew/cancelled candidacy; cancel an adoption → candidacy
  shows "Devolvida".
