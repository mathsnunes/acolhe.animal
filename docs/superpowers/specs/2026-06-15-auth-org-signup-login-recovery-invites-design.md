# Auth: organization signup, login, password recovery & invite acceptance

**Status:** approved (design) — 2026-06-15
**Scope:** Pillar 1 onboarding surface. Build the four authentication flows on top of the existing better-auth (`phoneNumber` + `emailAndPassword`) setup and the existing `organization` / `organizationMember` / `organizationInvite` tables.

## Product premises

- Protectors and NGOs live on WhatsApp — phone number is the primary identifier and the primary communication channel.
- Password recovery is **WhatsApp-first** with an **email fallback** (escape link after the resend cooldown; email is only usable when the account has one).
- Favor strong passwords: minimum 8 characters (hard rule) plus a **non-blocking strength meter** that nudges toward stronger passwords.

## Flows in scope

1. **Login** — phone + password (already exists; restyled to the new two-pane editorial layout, plus "forgot password" link and "remember me").
2. **Signup (new organization)** — a 3-step wizard: personal data → WhatsApp OTP → organization profile. Creating an account creates a new org and makes the user its admin.
3. **Password recovery** — a 3-step wizard: phone → OTP → new password. Default channel WhatsApp; email fallback offered after the cooldown.
4. **Invite acceptance** — `acolhe.animal/convite/[token]` opens an adaptive flow keyed by the invited phone: existing account → password (login) → join; new person → name + password → WhatsApp OTP → user created and joined. No org-creation step.

## Routing (pt-BR URLs, English route folders)

A shared `(auth)` layout reproduces the mock: a dark editorial pane (left) + the form pane (right). Each flow is a real route; multi-step flows are client-side wizards inside a single route (ephemeral state, clean URL).

| URL (rewrite) | Route folder | Content |
|---|---|---|
| `/entrar` | `(auth)/login` | login (exists; restyled) |
| `/criar-conta` | `(auth)/signup` | wizard: data → OTP → org |
| `/recuperar-senha` | `(auth)/recover` | wizard: phone → OTP → new password |
| `/convite/[token]` | `(auth)/invite/[token]` | adaptive accept (login or signup+OTP) |

`next.config.ts` `beforeFiles` rewrites map the pt-BR URLs above (`/entrar` already mapped). `RESERVED_SLUGS` gains: `criar-conta`, `signup`, `recuperar-senha`, `recover`, `convite` (`invite` already reserved).

## better-auth wiring (apps/web/lib)

Grounded in better-auth **1.6.17** (verified against installed types).

- `auth.ts`:
  - `phoneNumber` plugin already has `sendOTP` (WhatsApp). **Add `sendPasswordResetOTP`** → same WhatsApp template, used by `/phone-number/request-password-reset`.
  - **Add `emailOTP` plugin** with `sendVerificationOTP({ email, otp, type })`: on `type === 'forget-password'` send via `getEmail().send()` using the existing `otpEmail` template. (Other types unused for now.)
- `auth-client.ts`: add `emailOTPClient()` to the client plugin list (keep `phoneNumberClient()`). Inferred client methods used: `phoneNumber.sendOtp`, `phoneNumber.verify`, `signIn.phoneNumber`.
- Server API methods used from actions (`auth.api.*`):
  - `requestPasswordResetPhoneNumber({ body: { phoneNumber } })`
  - `resetPasswordPhoneNumber({ body: { otp, phoneNumber, newPassword } })`
  - `requestPasswordResetEmailOTP({ body: { email } })`
  - `resetPasswordEmailOTP({ body: { email, otp, password } })`
  - `setPassword({ headers, body: { newPassword } })` — valid for the just-verified signup user (OTP signup creates no password credential).
- `auth-context.ts`: add `requireUserId()` — resolves the session user id (or dev fallback) without requiring a membership; used by `finalizeSignup` and invite actions, which run *before* the user has a resolvable active org.

## Domain layer (the golden rule)

Tenant-bootstrap operations (create org / accept invite) are the special case that does **not** fit the standard tenant-scoped `Ctx` (which assumes an existing org). They take the raw `db` + an explicit `userId` and run from thin server actions after better-auth resolves the user — mirroring the existing `organizations/service.ts` precedent ("these take the raw `db` because they're used to build the Ctx").

New modules under `packages/domain/src/`:

- `users/service.ts`
  - `getUserByPhone(db, phone): { id, email } | null`
  - `setUserProfile(db, userId, { name, email? })` — direct Drizzle update of `user.name` / `user.email` (phone already verified; this is account creation, not a sensitive change). `emailVerified` left false.
- `organizations/register.ts`
  - `registerOrganization(db, input): Organization` — validates with existing schemas (`slugSchema`, `documentSchema`, `phoneSchema`), then in one transaction: `setUserProfile`, insert `organization` (status `active`, `documentType` from profile type: ong→cnpj, protetor→cpf, `phone` = owner phone, `email` = owner email, `cityId`), insert admin `organizationMember`. Throws `ConflictError` on slug/document/phone collision.
  - Input: `{ ownerUserId, ownerName, ownerEmail?, profileType: 'ong'|'protetor', orgName, slug, document, cityId, phone }`.
- `organizations/slug.ts`
  - `checkSlugAvailability(db, slug): { available: boolean; reason?: 'invalid'|'reserved'|'taken' }` — `slugSchema.safeParse` (distinguishes invalid vs reserved by message) + uniqueness lookup. Powers live slug feedback.
- `invitations/service.ts`
  - `getActiveInviteByToken(db, token): { invite; organization } | null` — pending + not expired, joined to org for display.
  - `acceptInvite(db, { token, userId, name? }): void` — re-validate; if `name` set and user has none, `setUserProfile`; insert membership with the invite's role (no-op if an active membership already exists); mark invite `accepted` (`acceptedAt`, `acceptedByUserId`).
- `cities/service.ts`
  - `searchCities(db, query, limit = 10): { id; name; stateCode }[]` — normalized prefix/contains search on `normalizedName`, prioritizing prefix matches, ordered by name.

All exported via each module's `index.ts` and `packages/domain/src/index.ts`.

## Web layer — actions & API

- `app/(auth)/signup/actions.ts`
  - `checkSlugAction(slug)` → `checkSlugAvailability`.
  - `finalizeSignupAction(input)` → `requireUserId()`, `auth.api.setPassword(...)`, `registerOrganization(db, { ownerUserId, ... })`. Wrapped in `action()`.
- `app/(auth)/recover/actions.ts`
  - `startPhoneRecoveryAction(phone)` → `requestPasswordResetPhoneNumber`; swallow `PHONE_NUMBER_NOT_EXIST` and always return ok (no account enumeration).
  - `startEmailRecoveryAction(phone)` → `getUserByPhone`; if email, `requestPasswordResetEmailOTP`; return `{ ok, emailHint }` (masked, e.g. `j***@gmail.com`) or `{ ok: false, reason: 'no-email' }`.
  - `completeRecoveryAction({ phone, otp, newPassword, channel })` → phone: `resetPasswordPhoneNumber`; email: look up email by phone then `resetPasswordEmailOTP`. Keeps the email private from the client (client only ever holds the phone).
- `app/(auth)/invite/[token]/actions.ts`
  - `acceptInviteExistingAction({ token, phone, password })` → `signIn.phoneNumber` (server) then `acceptInvite`. (Login may also happen client-side; the join is server-side.)
  - `acceptInviteNewAction({ token, name, password })` → after client OTP verify creates the session: `requireUserId()`, `setPassword`, `acceptInvite({ name })`.
- `app/api/cities/route.ts` — `GET /api/cities?q=` → `searchCities`, returns `{ id, name, stateCode }[]`. Debounced (300 ms) client fetch.

## Shared layer

- `packages/shared/src/auth/password-strength.ts` — pure `passwordStrength(pw): { score: 0|1|2|3|4; level: 'weak'|'fair'|'good'|'strong' }` from length + character-class variety (no external dependency). Exported from the package index.
- `packages/shared/src/schemas/common.ts` — add `passwordSchema` (`z.string().min(8)`), reused by signup/recovery/invite. Add the new reserved slugs.

## Components (`apps/web/components/auth/`) — single-purpose, on shadcn primitives

- `auth-editorial-pane.tsx` — static left pane (brand + hero + feature list), copy from i18n.
- `auth-mode-tabs.tsx` — entrar / criar conta pill tabs (login + signup pages).
- `otp-step.tsx` — 6-digit input + 60 s countdown + resend; phone display pill. Reused by signup, recover, invite.
- `password-field.tsx` — `ui/input` + show/hide toggle + strength meter (`passwordStrength`). Reused everywhere a password is set.
- `phone-field.tsx` — `ui/input` + BR phone mask.
- `document-field.tsx` — `ui/input` + CPF/CNPJ mask driven by profile type.
- `city-combobox.tsx` — autocomplete over `/api/cities` (Input + floating list, keyboard nav; no new primitive/dependency).
- `profile-type-toggle.tsx` — ONG formal (CNPJ) vs Protetor individual (CPF) selectable cards.
- `lib/masks.ts` — `maskPhoneBR`, `maskCpf`, `maskCnpj`, `maskOtp` (pure formatters).

"Remember me" on login is a minimal styled native checkbox (terra accent), matching the mock — no Radix-checkbox dependency added.

## Refactors (use the new components elsewhere)

- `(auth)/login/page.tsx` adopts `PhoneField` + `PasswordField` + `AuthModeTabs` + the new layout.
- Scan the admin surface (org settings, people forms) for existing phone / document / city inputs and migrate the clear matches to `PhoneField` / `DocumentField` / `CityCombobox`. Stay focused — only swap where the component is a drop-in improvement.

## i18n

Extend `apps/web/messages/pt/auth.json` with namespaces: `editorial`, `tabs`, `login` (additions), `signup`, `otp`, `recover`, `invite`, `org`, `password` (strength labels). All copy pt-BR, nothing hardcoded.

## Out of scope (YAGNI)

Social login (Google styled in the mock but absent from its markup), full IBGE city import, separating the org phone from the personal phone, an in-UI active-org switcher (membership resolution already picks the first active org), email verification of the signup email.

## Testing & verification

- `pnpm typecheck` across the workspace.
- Domain unit checks where cheap (slug availability, register collisions, invite expiry) following existing domain test patterns.
- Manual verification via the preview server: login, the signup happy path (OTP prints to the `pnpm dev` console in mock mode), recovery (WhatsApp + email fallback), and invite acceptance (new + existing). Screenshot the restyled screens.

## Known limitations

- Signup email is stored unverified; email recovery works but the address isn't proven. Acceptable for MVP; email verification is a later step.
- City search runs against the dev seed subset until the full IBGE import lands.
