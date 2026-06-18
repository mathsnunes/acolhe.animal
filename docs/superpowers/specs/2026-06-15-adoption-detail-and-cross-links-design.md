# Consolidate adoption into the animal page + de-emphasize candidacies

Date: 2026-06-15
Status: implemented

## Goal

Drop the dedicated adoption **detail** page and make the animal's page the single
home for an animal's whole lifecycle. Once an animal is adopted, its adoption
record (adopter, term, origin, return action) lives inline on the animal page.
Candidacies still open on an already-adopted animal stay visible but quiet — kept
as a record and for an eventual return, without the in-process prominence.

Tone: sober. No celebratory banners; everything reads as a record with quiet,
terracotta text links.

## Scope (decided with the user)

- Remove only the **detail** page (`/adocoes/[id]`). The adoptions **index**
  (`/adocoes` — "Lares encontrados" roll + register offline adoption) stays, but
  its rows now deep-link to the animal page instead of the deleted detail page.
- Open candidacies on an adopted animal → a discreet note + a low-key "recusar
  restantes" batch action (not auto-rejected on finalize; the record is kept).

## Changes

### Animal detail page (`apps/web/app/(admin)/animals/[id]/page.tsx`)
- **Reserved shortcut** (shown when `status === 'reserved'`): a warm card naming the
  approved candidate with a **Formalizar adoção** button — the `FinalizeAdoptionDialog`
  rendered inline, so the staff don't have to detour through the candidate page. On
  success it lands on this same animal page (now showing the adoption card). Backed by
  the new domain `getApprovedApplicationForAnimal(ctx, animalId)`; the dialog gained a
  `triggerClassName` prop so it isn't forced full-width here.
- New **Adoption card** (shown when `status === 'adopted'` and an active adoption
  exists): source badge, adopter (name, CPF, WhatsApp phone, address), adoption
  date, **Abrir termo assinado** (term PDF), **Registrar devolução**
  (`ReturnAdoptionDialog`), and the origin candidacy link (digital adoptions).
- Candidacies: the prominent "N candidatos esperando" band renders only while the
  animal is **not** adopted. Once adopted, open candidacies render the discreet
  `OpenCandidaciesNote` instead.
- Loads a second translator (`adoptions` namespace) to reuse the adoption vocabulary.

### Animal → candidacies cleanup
- `OpenCandidaciesNote` (`apps/web/components/animals/open-candidacies-note.tsx`):
  quiet line ("N outra(s) candidatura(s) em aberto · ver") + a "recusar restantes"
  confirm dialog calling `rejectOtherCandidatesAction`.

### Candidate detail page
- After finalizing, redirect to the animal page (`FinalizeAdoptionDialog` now takes
  `animalId`). When `status === 'adopted'`, the "Adoção formalizada" card links to
  the animal page (where the adoption now lives).

### Adoptions index (`/adocoes`)
- Rows link to `/animais/{animalId}`. Also fixes a **pre-existing 500**: the
  Server-Component list item passed an `onClick` handler to a DOM element
  ("Event handlers cannot be passed to Client Component props") — removed; the
  term link is a sibling of the row link, so no `stopPropagation` was needed.

### Domain
- `getAdoptionByAnimal(ctx, animalId)` expanded → `{ adoption, originApplicationId }`
  (full record + origin candidacy public id; null for offline).
- `getAdoptionByApplication` removed (no longer used).
- `rejectWaitingApplicationsForAnimal(ctx, animalId)` added — rejects all
  `new`/`in-progress` candidacies for an animal, emits timeline events, notifies
  each candidate, returns the count.

### Actions
- `rejectOtherCandidatesAction(animalId)` wraps the domain call + revalidates.
- The return flow reuses `cancelAdoptionAction` (`router.refresh()` on the animal
  page restores the available state).

### Removed
- `apps/web/app/(admin)/adoptions/[id]/page.tsx` (the dedicated detail page).

## Edge cases
- Offline adoption: no origin link on the card (no candidacy).
- Return: `cancelAdoption` frees the animal (→ `available`); the adoption card
  disappears and the candidacies band returns naturally.

## Verification
- `tsc --noEmit` clean in `packages/domain` and `apps/web`; all i18n JSON valid.
- Authenticated render against the running dev server (seeded Frida adoption):
  - `/animais/{id}` (adopted) → adoption card (adopter, term, return, origin) +
    discreet candidacies note + "recusar restantes"; the big band is suppressed.
  - `/adocoes` → 200 (was 500); rows link to the animal page.
  - `/candidatos/{id}` (adopted) → "Adoção formalizada" links to the animal page.
  - `/adocoes/{id}` → 404 (page removed).
