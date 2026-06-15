# ADR 0001 — Internal packages with direct TypeScript source

**Status:** accepted · **Date:** 2026-06

## Context
pnpm + Turborepo monorepo with `apps/web` + 5 packages. We had to decide whether each package would
have its own build (emit `dist/`) or expose its source.

## Decision
Packages expose the **TypeScript source** (`"exports": { ".": "./src/index.ts" }`), with no build
step. Next compiles them via `transpilePackages`; scripts (seed, migrations) run through `tsx`.
Shared dependency versions are centralized in the pnpm **catalog**.

## Consequences
- (+) Zero build ceremony between packages; instant HMR and end-to-end type-check.
- (+) Refactoring across package boundaries is trivial.
- (−) Consumers must transpile (handled by `transpilePackages`/`tsx`); publishing a package
  externally would need a build — not the case today.
- When the backend is extracted, each package is already a clear unit.
