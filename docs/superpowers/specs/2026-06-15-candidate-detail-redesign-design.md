# Candidate detail page redesign — design

**Date:** 2026-06-15
**Status:** Approved (pending spec review)
**Scope:** Rebuild the admin candidate detail page (`/candidatos/[id]`) to match the
`candidato-detalhe-v2.html` mockup — section-card layout, status banner with the
triage actions, curated themed answer sections, a richer right column (conversa /
animal / alerts / estado), an actor-aware history, and a mobile reflow — reusing
the existing controls and data. Desktop + mobile.

## Context (current state)

`apps/web/app/(admin)/candidates/[id]/page.tsx` already wires the building blocks:
`getApplication` + `getPersonByPk` + `getAnimalByPk` + `listEntityTimeline` +
`listOrgMembers`, rendering `ApplicationFacts` (generic key→value list of the
free-form `applicationData`), `InternalNotes`, `EntityTimeline`, the WhatsApp
contact card, the animal card (name only), `StatusControl`, `AssignControl`, and
`FinalizeAdoptionDialog` (when `approved`). Layout: a status banner + a
`1fr / 360px` grid.

### Data reality (confirmed during exploration)

- The public 6-step form collects **18 stable, known keys** (`name`, `phone`,
  `email`, `city`, `address`, `housing`, `ownership`, `household`, `agreement`,
  `hasPets`, `currentPets`, `hadPets`, `petHistory`, `hoursAway`, `travel`,
  `sleep`, `vet`, `motivation`, `questions`) stored free-form in `applicationData`
  (`formVersion` = `dog-v1` / `cat-v1`, same keys).
- Labels live in the **`form` i18n namespace** (`apps/web/messages/pt/form.json`);
  choice-value labels in `apps/web/components/portal/adoption-form-options.ts`
  (`valueLabels(t)`). There is no typed form schema, but these are enough to render
  curated sections via a code-based key→section→label map.
- No per-animal custom questions exist (the mockup's "Compatibilidade com a Frida"
  is not derivable).
- No person birthdate/age; no animal weight.
- Timeline events already carry `actorUserId` + `actorContext` (`source:
  'public_form'` for the candidate).

## Decisions (confirmed)

| Topic | Decision |
|---|---|
| Left-column answers | **Curated themed sections** built from the 18 known keys + `form` i18n labels. Unknown keys fall back to a generic "Outras respostas" group. |
| History actor | **Show "por {nome}"** — resolve `actorUserId` → member name; `public_form` → candidate name. |
| Out of scope | Fit card, per-animal Compatibilidade, person age / animal weight, "Registrar conversa", "Marcar alerta manual". |
| Alerts card | **Derivable only**: "primeira candidatura na ONG", "já adotou" / "devolveu antes". |

## Architecture

Reuse existing controls (`StatusControl`, `AssignControl`, `InternalNotes`,
`EntityTimeline`, `FinalizeAdoptionDialog`, `whatsappHref`) and listing-layer data
helpers (`getAnimalCovers`, `countWaitingApplicationsByAnimal`, `getPersonAdoptions`).
The page stays a server component resolving `Ctx` → domain → props.

### 1. Page header + status banner — `[id]/page.tsx`
- **Header** (in content, not the global topbar): a terra eyebrow with a back arrow
  "← CANDIDATOS" linking `/candidatos`, then the candidate's name in Fraunces.
- **Status banner**: full-width, status-tinted (`STATUS_META`), left = the status
  summary (`detail.bannerStatus` + responsible + `bannerForAnimal`), right = the
  triage actions = the existing `StatusControl` (single source of truth for
  transitions; keeps confirmations + the terminal/adopted logic). `FinalizeAdoptionDialog`
  is not in the banner — it stays in its own side card when `approved` (§3).

### 2. Left column — curated answer sections
New `components/candidates/application-sections.tsx`:
- A config map `APPLICATION_SECTIONS`: ordered groups → ordered keys, each key with
  its `form`-namespace label key and a value renderer (choice → `valueLabels`;
  boolean → sim/não; array → joined labels; `motivation` → Fraunces quote style;
  free text otherwise). Groups: **Quem é** (phone, email, city, address),
  **Por que** (motivation, questions), **Casa e rotina** (housing, ownership,
  household, agreement, hoursAway, travel, sleep, vet), **Experiência** (hasPets,
  currentPets, hadPets, petHistory).
- `ApplicationSections` renders one `section-card` per non-empty group (skips
  empty/absent keys). Any `applicationData` key not in the map renders, humanized,
  under a final "Outras respostas" card so nothing is lost.
- It reads labels via `useTranslations('form')` + `valueLabels`. Replaces
  `ApplicationFacts` on the detail page (component kept for any other caller).

Followed by **Notas internas** (`InternalNotes`) and **Histórico** (`EntityTimeline`).

### 3. Right column (mockup order)
- **Conversa** — dark ink card, WhatsApp link (existing). "Registrar conversa"
  omitted (deferred).
- **Animal** (`components/candidates/animal-side-card.tsx`) — cover thumb, name,
  meta (`speciesNounLabel · formatAge · sizeLabel · "Na ONG desde {intake}"`),
  candidate count ("{n} candidatas"), "Ver ficha →" link. Cover from
  `getAnimalCovers(ctx, [animal.pk])`; count from `countWaitingApplicationsByAnimal`.
- **Alertas** (`components/candidates/candidate-alerts-card.tsx`) — derivable rows:
  primeira candidatura na ONG (person has no other applications/adoptions), já
  adotou / devolveu antes (from `getPersonAdoptions`, excluding this candidacy).
- **Estado** — status pill + "há {when} neste estado" + `AssignControl`.
- **Formalizar** (when `approved`) — `FinalizeAdoptionDialog`.

### 4. History with actor — `entity-timeline.tsx`
`EntityTimeline` gains an optional `actorName(event) => string | null` resolver (or
a `userId→name` map + candidate name). It renders the resolved actor alongside each
event (`public_form` → candidate first name; user events → member name; system →
none). The page builds the map from the already-fetched `members` + `person`.

### 5. Mobile reflow
The grid becomes a flex/`order` layout: below `lg`, the right-column cards
(Conversa → Animal → Alertas → Estado) render **before** the answer/notes/history
sections. A mobile-only sticky bottom action bar (`components/candidates/status-banner.tsx`
or inline) re-renders `StatusControl`'s primary actions for thumb reach. Desktop
keeps the `1fr / 360px` two-column grid.

### 6. Domain
Add a small helper `isFirstCandidacy(ctx, personPk, applicationId)` (or
`getPersonStats`) → whether the person has any other application or adoption, for
the "primeira candidatura na ONG" alert. Everything else reuses existing helpers.

### 7. i18n — `apps/web/messages/pt/candidates.json`
Add `detail.*` keys: header back-label, banner responsible text, animal-card meta
(`naOngDesde`, `candidatesCount`), alerts (`firstCandidacy`, reuse `alerts.jaAdotou`
/ `alerts.devolveuAntes`), section group titles/eyebrows. Section field labels come
from the `form` namespace. Timeline actor phrasing as needed.

## Out of scope
- Fit / scoring, per-animal compatibility questions.
- Person age, animal weight.
- "Registrar conversa" and "Marcar alerta manual" (new features, deferred).
- Changing the public form, the domain triage transitions, or the global admin topbar.

## Testing / validation
- Targeted typecheck + lint on `@acolhe-animal/domain` and `apps/web`.
- Manual verification on a cleanly-rebuilt dev server (no concurrent dev servers on
  the shared `.next`): the detail page renders the curated sections from seeded
  answers, the status banner triages, the animal card shows cover + count, alerts
  reflect history, the timeline shows actors, and the mobile reflow + sticky bar
  work. Drive via a single clean server or read-only checks — never a second dev
  server on the shared `.next`.
