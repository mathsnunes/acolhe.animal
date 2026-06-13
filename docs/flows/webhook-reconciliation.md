# Flow — automatic donation reconciliation (Pillar 2)

The core selling point: a Pix that lands in the NGO's subaccount becomes a `Donation`
automatically, without the NGO ever opening a bank statement. Schema is ready (`donation`,
`webhook_event`); the domain/UI are future Pillar 2 work. See
`01-docs-referencia/modelagem-dados.md` (WebhookEvent, Donation, Asaas).

```mermaid
sequenceDiagram
  participant Donor
  participant Asaas
  participant API as /api/webhooks/asaas (Route Handler)
  participant WE as webhook_event
  participant Job as worker (Inngest)
  participant Dom as domain/donations
  participant DB as Postgres

  Donor->>Asaas: Pix to the NGO subaccount key
  Asaas->>API: POST PAYMENT_RECEIVED (HMAC signed)
  API->>API: verify signature
  API->>WE: INSERT ... ON CONFLICT(id) DO NOTHING  (idempotency)
  API-->>Asaas: 200 immediately
  Job->>WE: pick status='received' → 'processing'
  Job->>Dom: process event (system Ctx)
  Dom->>DB: create/update Donation (+ Donor via CPF/phone matching)
  Dom->>DB: create CashflowEntry (inflow)
  Job->>WE: mark 'processed' (or increment attempts/lastError)
```

Key points:
- **Idempotency by construction**: the PK of `webhook_event` is the Asaas external id; a re-delivery
  does not duplicate.
- **Immediate 200 response**; heavy processing is async (worker), with retry and state in
  `webhook_event`.
- **Donor matching** by CPF, else phone, else create new (no name matching — too many false positives).
- **Fee split** is configured when the Pix charge is created (not stored on the Donation);
  `Donation.amount` is the gross value.
- A donation made to a personal Pix key (outside the subaccount) generates **no** webhook → it isn't
  reconciled (that's why CPF/MEI matters).
