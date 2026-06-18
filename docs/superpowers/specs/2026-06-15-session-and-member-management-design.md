# Session & member management

**Status:** approved (design) — 2026-06-15
**Scope:** Building on the auth flows, add the session/membership surface: real
login gating, member management + invites, active-org switching, and logout.

## 1. Block non-logged-in users

- Remove the dev auto-login shortcut (`DEV_FALLBACK_USER_ID`) from
  `apps/web/lib/auth-context.ts`. `getCurrentCtx` / `requireUserId` resolve only a
  real session; `requireCtx()` already redirects to `/entrar`, so the whole
  `(admin)` surface is gated in dev too. No new middleware — the `(admin)/layout`
  guard is sufficient.
- Update the `CLAUDE.md` "Authentication" + "Run locally" notes (dev login is now
  required: **+55 48 99999-0000 / acolhe123**).

## 2. Active-org switching (cookie)

- `getCurrentCtx`: list the user's active memberships, then read the
  `acolhe_active_org` cookie (the org's **public id**) and pick the matching
  membership — **validating it belongs to the user** (never trust the cookie
  blindly); fall back to the first membership otherwise.
- `setActiveOrgAction(orgId)` (`apps/web/app/(admin)/actions.ts`): assert the org
  is among the caller's memberships, write the cookie, `revalidatePath('/', 'layout')`,
  redirect to `/inicio`.
- UI: the sidebar org indicator becomes a `DropdownMenu` when the user has >1
  membership (current one checked); a single membership stays static as today.
  `(admin)/layout` passes the membership list + active org id to `AdminShell`.

## 3. Member management (domain, `assertAdmin` + safeguards)

Route `/membros` → `(admin)/members` (rewrite `/membros` → `/members`; reserve
`membros`/`members` slugs). Admin-only nav item. The page lists active members and
pending invites.

New `packages/domain/src/members/` module, all tenant-scoped via `Ctx`:

- `listMembers(ctx)` → `{ id, userId, name, phone, role, joinedAt, isSelf }[]`
  (join `organizationMember` ⋈ `user`, org-scoped, `removedAt is null`).
- `listPendingInvites(ctx)` → `{ id, phone, name, role, invitedAt, expiresAt, token }[]`.
- `createMemberInvite(ctx, { phone, name?, role, appBaseUrl })` — `assertAdmin`;
  normalize via `phoneSchema`; reject if already an active member or a pending
  invite exists for that phone; insert `organizationInvite` (token via
  `createToken`, `invitedByUserId` = actor); send the WhatsApp invite (§4).
  Returns `{ invite, acceptUrl }`.
- `revokeInvite(ctx, inviteId)` — `assertAdmin`; set status `revoked` (org-scoped,
  must be `pending`).
- `removeMember(ctx, memberId)` — `assertAdmin`; **reject removing self**; **reject
  removing the last active admin**; set `removedAt` / `removedByUserId`.
- `changeMemberRole(ctx, memberId, role)` — `assertAdmin`; **reject demoting the
  last active admin**; update role.

Safeguard helper: `countActiveAdmins(db, organizationId)`.

## 4. Invite delivery (WhatsApp + copyable link)

- Reuse the existing `inviteWhatsApp({ organizationName, acceptUrl })` template.
- `createMemberInvite` builds `acceptUrl = ${appBaseUrl}/convite/${token}` and sends
  via `getMessaging()` (dev/mock prints to the `pnpm dev` console). `appBaseUrl`
  is passed in by the web layer (`serverEnv().BETTER_AUTH_URL`) so the domain never
  reads env.
- The page surfaces the `acceptUrl` with a copy button after an invite is created.
  The accept flow (`/convite/[token]`) already exists.

## 5. Logout

- The sidebar's user button becomes a `DropdownMenu` (name/role + **Sair**). "Sair"
  calls `authClient.signOut()` then routes to `/entrar`. The mobile "Mais" drawer
  gets the same action.

## Files

- **domain**: `members/{service,index}.ts`; export from `src/index.ts`.
- **web**: `(admin)/members/{page,actions}.tsx`; `(admin)/actions.ts`
  (`setActiveOrgAction`); `lib/auth-context.ts` (remove fallback + cookie);
  `components/nav/{admin-shell,nav-config}.tsx` (switcher, user menu, Membros item);
  `(admin)/layout.tsx` (pass membership list); `next.config.ts` rewrite; i18n
  `members.json` + `nav.json` additions; `CLAUDE.md` note.
- **shared**: reuse `phoneSchema`, `createToken`, `memberRole`; add `membros`/`members`
  to `RESERVED_SLUGS`.

## Out of scope (YAGNI)

Org ownership transfer, roles beyond admin/volunteer, invite resend (revoke + new
covers it), email invite notifications.

## Testing & verification

- `tsc` + `eslint` across touched packages.
- Domain checks for the safeguards (last-admin, self-removal) and invite conflicts.
- Manual: login gating (no session → `/entrar`), invite (console WhatsApp + copy
  link), accept, role change, remove, org switch, logout.
