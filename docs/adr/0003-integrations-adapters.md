# ADR 0003 — External providers behind interfaces (mock/live)

**Status:** accepted · **Date:** 2026-06

## Context
The product depends on Asaas (payments/BaaS), Cloudflare R2 (files), Evolution API (WhatsApp) and
Resend (email). Coupling the domain to those SDKs would block tests and lock the product to a vendor.

## Decision
Each provider has an **interface** in `packages/integrations`, with a **mock** adapter (default,
offline) and a **live** one (stub to implement). Selection is driven by `INTEGRATIONS_MODE`
(mock | live). The domain depends only on the interfaces and the factory getters (`getStorage()`,
`getPayments()`…).

## Consequences
- (+) `pnpm dev` runs fully offline; OTP/WhatsApp print to the console, uploads go to `.local-storage/`.
- (+) Swapping Asaas for Iugu/Pagar.me = a new adapter, without touching the domain.
- (+) Fields like `asaasAccountId` carry the provider name only for clarity; switching is a rename migration.
- (−) The `live` adapters still need to be implemented before go-live (explicit debt).
