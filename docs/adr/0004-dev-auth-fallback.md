# ADR 0004 — Development authentication shortcut

**Status:** accepted (temporary) · **Date:** 2026-06

## Context
The entire admin panel depends on a `Ctx` resolved from the session. While building the MVP, requiring
the full login flow (phone + OTP + password) just to open any screen would slow UI iteration, and the
OTP flow depends on a WhatsApp provider.

## Decision
In `apps/web/lib/auth-context.ts`, when there is **no session** and `NODE_ENV === 'development'`, we
resolve the `Ctx` to the **seeded admin** (Angeli Felice). Real login (`/login`, better-auth) keeps
working; the shortcut only fills the gap in dev.

## Consequences
- (+) Panel is demoable right after `pnpm db:seed`.
- (+) Decouples UI development from the maturity of the auth flow.
- (−) It is a shortcut: it **never** activates in production (guarded by `NODE_ENV`). Remove it once
  the login flow is consolidated and there's multi-account dev support.
- Risk mitigated: the guard is the only condition; without it, admin routes redirect to `/login`.
