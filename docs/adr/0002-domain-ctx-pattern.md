# ADR 0002 — "Ctx-first" domain in pure functions

**Status:** accepted · **Date:** 2026-06

## Context
Business logic must be decoupled from the transport (Next) to allow a future backend extraction, and
be easy for both developers and AI to read and maintain.

## Decision
Pure domain functions, grouped by feature, taking a **`Ctx`** (`{ db, organizationId, actor }`) as
the first argument. No classes/repositories/DI container. Zod validation inside the function itself.
Expected errors via `DomainError`. Transactions via `withTransaction(ctx, fn)`.

## Alternatives considered
- Repos + services + DI (NestJS-like): too much ceremony for the stage.
- Logic directly in Server Actions: couples business to Next, blocks extraction and tests.

## Consequences
- (+) Multi-tenancy and authorization live in a predictable place (the `Ctx` + asserts).
- (+) Testable by passing a `Ctx` with a test db; no framework mocking.
- (+) Clean cut point to become an HTTP service later.
- (−) Passing `ctx` explicitly is verbose — accepted in exchange for clarity.
