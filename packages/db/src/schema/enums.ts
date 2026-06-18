import { pgEnum } from 'drizzle-orm/pg-core';

/**
 * All Postgres enum types, in one place.
 *
 * Values match `modelagem-dados.md` exactly (including kebab-case values like
 * `under-review`). Enum types are reused across columns where the value set is
 * identical (e.g. `sociability` powers all four `goodWith*` columns; `memberRole`
 * powers both member and invite roles).
 */

// ── Organization ──────────────────────────────────────────────────────────
export const orgDocumentType = pgEnum('org_document_type', ['cpf', 'cnpj']);
export const organizationStatus = pgEnum('organization_status', [
  'onboarding',
  'active',
  'suspended',
  'inactive',
]);
/** Regulatory KYC status as reported by Asaas (via ACCOUNT_STATUS webhooks). */
export const asaasKycStatus = pgEnum('asaas_kyc_status', [
  'pending',
  'awaiting_documents',
  'under_review',
  'approved',
  'rejected',
]);
/** Local state machine driving the financial setup screen (05-setup-financeiro). */
export const asaasOnboardingStatus = pgEnum('asaas_onboarding_status', [
  'not_started',
  'creating',
  'awaiting_revenue',
  'documents_pending',
  'under_review',
  'approved',
  'rejected',
]);

// ── Membership / invites ────────────────────────────────────────────────────
export const memberRole = pgEnum('member_role', ['admin', 'volunteer']);
export const inviteStatus = pgEnum('invite_status', [
  'pending',
  'accepted',
  'revoked',
  'expired',
]);

// ── User ─────────────────────────────────────────────────────────────────────
export const userStatus = pgEnum('user_status', ['active', 'inactive']);

// ── Animal ─────────────────────────────────────────────────────────────────────
export const animalSpecies = pgEnum('animal_species', ['dog', 'cat']);
export const animalSex = pgEnum('animal_sex', ['male', 'female']);
export const animalSize = pgEnum('animal_size', ['small', 'medium', 'large']);
export const animalStatus = pgEnum('animal_status', [
  'draft',
  'available',
  'under-review',
  'reserved',
  'adopted',
  'unavailable',
]);
export const neuteredStatus = pgEnum('neutered_status', ['yes', 'no', 'scheduled']);
export const energyLevel = pgEnum('energy_level', ['calm', 'balanced', 'energetic']);
/** Shared by goodWithChildren / goodWithDogs / goodWithCats / goodWithStrangers. */
export const sociability = pgEnum('sociability', ['yes', 'no', 'with-care', 'unknown']);
export const videoProcessingStatus = pgEnum('video_processing_status', [
  'pending',
  'processing',
  'ready',
  'failed',
]);
export const instagramArtType = pgEnum('instagram_art_type', ['feed-square', 'story-vertical']);

// ── Applications / adoptions ─────────────────────────────────────────────────
export const applicationStatus = pgEnum('application_status', [
  'draft',
  'new',
  'in-progress',
  'approved',
  'adopted',
  'rejected',
  'withdrew',
  'cancelled',
]);
export const adoptionSource = pgEnum('adoption_source', ['digital', 'offline']);

// ── Donations (Pillar 2) ─────────────────────────────────────────────────────
export const supporterStatus = pgEnum('supporter_status', [
  'active',
  'paused',
  'cancelled',
  'failed',
]);
export const campaignStatus = pgEnum('campaign_status', [
  'draft',
  'active',
  'closed',
  'cancelled',
]);
export const campaignGoalBehavior = pgEnum('campaign_goal_behavior', ['auto_close', 'keep_open']);
export const recurringNeedStatus = pgEnum('recurring_need_status', [
  'active',
  'paused',
  'archived',
]);
export const paymentMethod = pgEnum('payment_method', ['pix', 'credit_card', 'manual']);
export const donationSource = pgEnum('donation_source', [
  'portal_pix',
  'direct_pix',
  'manual',
  'recurring',
]);
export const donationStatus = pgEnum('donation_status', [
  'pending',
  'confirmed',
  'refunded',
  'failed',
]);

// ── Cashflow / payouts ───────────────────────────────────────────────────────
export const cashflowType = pgEnum('cashflow_type', ['inflow', 'outflow']);
export const cashflowCategory = pgEnum('cashflow_category', [
  'monthly_support',
  'campaign',
  'recurring_need',
  'one_time_donation',
  'refund',
  'payout',
  'payout_fee',
  'payout_returned',
  'veterinary',
  'food',
  'maintenance',
  'bazaar',
  'other',
]);
export const cashflowPaymentMethod = pgEnum('cashflow_payment_method', [
  'pix',
  'cash',
  'transfer',
  'card',
  'other',
]);
export const payoutAccountType = pgEnum('payout_account_type', ['pix', 'bank_transfer']);
export const pixKeyType = pgEnum('pix_key_type', ['cpf', 'cnpj', 'email', 'phone', 'random']);
export const bankAccountType = pgEnum('bank_account_type', ['checking', 'savings']);
export const payoutStatus = pgEnum('payout_status', [
  'pending',
  'processing',
  'completed',
  'failed',
  'cancelled',
  'returned',
]);

// ── Uploads ──────────────────────────────────────────────────────────────────
/** Lifecycle of a file in the upload ledger (see `docs/uploads.md`). */
export const uploadStatus = pgEnum('upload_status', ['pending', 'committed', 'failed']);

// ── Cross-cutting ────────────────────────────────────────────────────────────
export const brRegion = pgEnum('br_region', [
  'north',
  'northeast',
  'central-west',
  'southeast',
  'south',
]);
export const auditActorType = pgEnum('audit_actor_type', [
  'user',
  'system',
  'webhook',
  'admin_platform',
]);
export const webhookProvider = pgEnum('webhook_provider', ['asaas']);
export const webhookStatus = pgEnum('webhook_status', [
  'received',
  'processing',
  'processed',
  'failed',
  'ignored',
]);

/** Asaas companyType values for subaccount creation. */
export const orgCompanyType = pgEnum('org_company_type', [
  'MEI',
  'LIMITED',
  'INDIVIDUAL',
  'ASSOCIATION',
]);
