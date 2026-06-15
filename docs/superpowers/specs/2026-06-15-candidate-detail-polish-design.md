# Candidate detail — layout polish + design-system extraction

**Date:** 2026-06-15
**Status:** Approved (pending spec review)
**Scope:** Fix three sections of the candidate detail page that diverged from the
`candidato-detalhe-v2.html` mockup, and extract the genuinely reusable patterns
into shared components / a CSS utility, documented in the design system.

## Context

The detail redesign shipped, but three blocks don't match the mockup:
1. **"Quem é"** renders a generic title + four separate rows (phone/email/city/address).
2. **"Notas internas"** is an always-on `Textarea` + save button.
3. **"Estado"** shows an always-on `Select` for the responsible member.

The mockup uses, in all three, a **read display with an on-demand edit affordance**,
plus a curated "Quem é" with the candidate's name as the heading and two composite
rows. The codebase also already has `components/ui/avatar.tsx` (Radix) that the
candidate views ignore — they re-implement initials avatars inline.

Design-system home (in-repo): CSS utilities in `apps/web/app/globals.css`
`@layer components` (alongside `eyebrow`/`display`/`hint`); component/usage
conventions in `docs/conventions.md`. (`01-docs-referencia/design-system.md` is the
out-of-code product reference and is not edited here.)

## Decisions (confirmed)

| Topic | Decision |
|---|---|
| Estado "mudar" | Banner is the **only** status changer. The Estado card shows status as read-only (pill + "há X neste estado") and the responsible member with a "trocar" affordance. |
| Genericize | Extract & document **all three**: initials Avatar, a `.section-card` surface utility, and an `InlineEdit` read↔edit toggle. The label+value row stays local (YAGNI). |
| Age in "Quem é" | Omitted — no birthdate field (consistent with prior scope). |

## Layout fixes

### 1. "Quem é" — bespoke identity card
A dedicated card (no longer driven by the generic section map):
- **Title:** the candidate's name with the surname in terra italic via the existing
  `.display em` treatment (`{first} <em>{rest}</em>`). No age.
- **Contato** row: `formatPhoneBR(person.phone)` · `applicationData.email ?? person.email`.
- **Onde mora** row: `applicationData.city` · `applicationData.address` (joined, empties dropped).

The generic `ApplicationSections` drops its `who` group and renders only **Por que**,
**Casa e rotina**, **Experiência**, and the **Outras respostas** fallback.

### 2. "Notas internas" — read + editar
`InternalNotes` becomes a read view (the note prose with `whitespace-pre-wrap`, or an
inviting empty prompt) plus an "editar" trigger that swaps to the existing
textarea + save. Saving (and a successful action) returns to the read view.

### 3. "Estado" — read state + trocar
- Status: pill + "há {when} neste estado" (read-only).
- Responsible: an initials Avatar + member name (+ "(você)" when it's the current
  user) + a "trocar" trigger that reveals the existing assignment `Select`; choosing
  a member returns to the read view. When unassigned, a "definir responsável" trigger.

## Design-system extraction

### A. `InitialsAvatar` — `components/ui/initials-avatar.tsx`
A small presentational avatar: `{ name, size?, tone? }` → a circle with `initials(name)`.
`tone`: `terra` (default, `bg-terra-bg text-terra`) / `green` (`bg-green text-paper`,
for member avatars). Sizes map to the existing `xs`/`sm`/`md` (20/26/34px). Used in the
Estado card now; the inline avatars in `candidate-row`/`candidate-card`/`admin-shell`
are **not** refactored here (out of scope) — noted as a follow-up.

### B. `.section-card` — `globals.css @layer components`
The repeated paper surface (`rounded-xl border border-line-soft bg-paper shadow-card`)
becomes a `.section-card` utility (surface only; padding stays at the call site).
Applied in `ApplicationSections`, the notes/history cards, and the animal/alerts/estado
side cards. Defined in the same `@layer components` block as `eyebrow`/`display`.

### C. `InlineEdit` — `components/ui/inline-edit.tsx`
A headless read↔edit toggle (render-prop) so callers control placement of both views
and the trigger:
```tsx
<InlineEdit>{({ editing, edit, done }) => editing ? <EditUI onDone={done}/> : <ReadUI onEdit={edit}/>}</InlineEdit>
```
Plus an `EditTrigger` for the consistent small terra link ("editar" / "trocar").
Consumed by `InternalNotes` and `AssignControl`.

### Documentation
- `globals.css`: `.section-card` defined + a one-line comment.
- `docs/conventions.md`: a short "Reusable UI patterns" note covering `InitialsAvatar`
  (use it instead of inlining `initials()`), `.section-card` (the standard card
  surface), and `InlineEdit`/`EditTrigger` (the edit-on-demand pattern).

## Out of scope
- Refactoring existing inline avatars (row/card/shell) to `InitialsAvatar`.
- Person age / any new form field. Status actions stay solely in the banner.

## Testing / validation
- Targeted typecheck + lint (`@acolhe-animal/domain` unaffected; `apps/web`).
- Read-only verification on the single running dev server (no second dev server on
  the shared `.next`): "Quem é" shows the name heading + Contato/Onde mora; notes
  toggle read↔edit and persist; the Estado card shows the responsible member with
  "trocar" revealing the Select; `.section-card` surfaces render unchanged visually.
