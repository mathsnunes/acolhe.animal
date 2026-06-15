# Acolhe.animal

> Adoption-management and donation-portal infrastructure for animal-rescue NGOs and individual rescuers.

Acolhe.animal is not a marketplace — it's the tool that organizes the NGO's work under the hood
(the way Stripe is for payments). Two pillars: **adoption management** and a **donation portal**.

## Stack

TypeScript · Next.js 15 (App Router) · React 19 · Tailwind 4 · shadcn/ui · Drizzle ORM +
PostgreSQL · better-auth (phone + OTP) · next-intl · Asaas (BaaS) · Cloudflare R2 · Inngest ·
Resend · Evolution API. pnpm + Turborepo monorepo.

## Monorepo layout

```
apps/
  web/                 Next.js — frontend + backend (Route Handlers, Server Actions)
packages/
  shared/              types, Zod schemas, ID generation, utils (isomorphic, no heavy runtime deps)
  db/                  Drizzle schema, migrations, client, seeds
  domain/              pure business logic (no Next) — the source of truth for the rules
  integrations/        external-provider adapters (Asaas, R2, Evolution, Resend) behind interfaces
  messaging/           versioned WhatsApp and email templates
```

**Golden rule:** business logic lives in `packages/domain`. Server Actions and Route Handlers in
`apps/web` only take input → call the domain → return output. That's what lets us split the
backend out later with little effort.

## Local setup (first time)

Prerequisites: Node 20+, pnpm 9+, Docker (for local Postgres).

```bash
pnpm install                 # install workspace dependencies
cp .env.example .env         # adjust if needed (defaults work with mocks)
pnpm db:up                   # start local Postgres in Docker
pnpm db:migrate              # apply migrations
pnpm db:seed                 # seed cities (IBGE) + sample data (Angeli Felice org)
pnpm dev                     # serve the app at http://localhost:3000
```

With `INTEGRATIONS_MODE=mock` (default), no external accounts are needed — Asaas, R2, WhatsApp
and email are stubbed. See [`docs/`](docs/) for the architecture documentation.

## Scripts

| Command | What it does |
|---|---|
| `pnpm dev` | run the app (Turbo) |
| `pnpm build` | production build of every package |
| `pnpm typecheck` | type-check the whole workspace |
| `pnpm db:generate` | generate a migration from the Drizzle schema |
| `pnpm db:migrate` | apply migrations |
| `pnpm db:studio` | open Drizzle Studio |
| `pnpm db:seed` | run the seeds |
| `pnpm db:up` / `pnpm db:down` | start/stop local Postgres |

## Documentation

- [`docs/architecture.md`](docs/architecture.md) — layers, boundaries and the why
- [`docs/conventions.md`](docs/conventions.md) — code conventions
- [`docs/flows/`](docs/flows/) — flowcharts (adoption funnel, donation reconciliation, auth/OTP)
- [`docs/adr/`](docs/adr/) — Architecture Decision Records
- `01-docs-referencia/` (outside the code) — product vision, data model and design system reference (pt-BR)

---

All code, comments and technical documentation are written in English. End-user UI copy is
Portuguese (pt-BR), externalized via next-intl. See `docs/conventions.md`.
