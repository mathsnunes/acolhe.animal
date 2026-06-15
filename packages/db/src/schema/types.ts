/**
 * TypeScript shapes for `jsonb` columns. These are the runtime contracts the
 * application validates with Zod before writing — Drizzle only carries the type
 * for read-time inference (`$type<...>()`).
 */

/** `organization.portalConfig` — public portal rendering config. */
export type PortalConfig = {
  primaryColor?: string;
  secondaryColor?: string;
  sections?: {
    animals?: boolean;
    campaigns?: boolean;
    stories?: boolean;
    neededItems?: boolean;
  };
  sectionOrder?: Array<'animals' | 'campaigns' | 'stories' | 'neededItems'>;
};

/** `animal.clinicalCondition` — temporary, structured health state. */
export type ClinicalCondition = {
  type: 'post-surgery-recovery' | 'chronic-treatment' | 'behavioral-rehabilitation' | 'other';
  description: string;
  needsSpecialAdopter: boolean;
  expectedResolution: string | null;
};

/** `animal.vaccinations` — array of applied vaccines. */
export type Vaccination = { name: string; date: string };

/** `adoption.adopterAddress` — frozen snapshot at signature time. */
export type AdopterAddress = {
  street: string;
  number: string;
  complement?: string;
  city: string;
  state: string;
  postalCode: string;
};

/** `adoption.signatureMetadata` — varies by source. */
export type SignatureMetadata =
  | { signedAt: string; ip: string; userAgent: string }
  | { signedAt: string; registeredByUserId: string };

/** `payout.destinationSnapshot` — frozen payout destination. */
export type PayoutDestinationSnapshot =
  | {
      type: 'pix';
      pixKeyType: 'cpf' | 'cnpj' | 'email' | 'phone' | 'random';
      pixKey: string;
      holderName: string;
      holderDocument: string;
    }
  | {
      type: 'bank_transfer';
      bankCode: string;
      bankAgency: string;
      bankAccount: string;
      bankAccountType: 'checking' | 'savings';
      holderName: string;
      holderDocument: string;
    };

/** Non-user actor context for timeline/audit events. */
export type ActorContext = {
  source: string;
  externalEventId?: string;
  jobId?: string;
  [key: string]: unknown;
};

/** Generic JSON bag for timeline/audit payloads (validated per event type). */
export type JsonRecord = Record<string, unknown>;
