import { eq } from 'drizzle-orm';
import { z } from 'zod';

import { organization } from '@acolhe-animal/db';
import type { Organization } from '@acolhe-animal/db';
import { NotFoundError, ValidationError } from '@acolhe-animal/shared';
import { getPayments } from '@acolhe-animal/integrations';

import type { Ctx } from '../context';
import { assertAdmin } from '../auth/permissions';
import { decrypt, encrypt } from './encryption';

// ─── Shared types ─────────────────────────────────────────────────────────────

export interface DocumentItem {
  id: string;
  type: string;
  /** Human-readable label derived from type. */
  label: string;
  /** When true, upload must happen via the Asaas onboarding URL — native upload is not accepted. */
  externalOnly: boolean;
  onboardingUrl?: string;
}

export interface ConfirmDataFields {
  name: string;
  document: string;
  documentType: 'cnpj' | 'cpf';
  email: string | null;
  phone: string;
  streetAddress: string | null;
  addressNumber: string | null;
  addressComplement: string | null;
  postalCode: string | null;
  companyType: string | null;
  responsibleBirthDate: string | null;
}

export type FinanceSetupScreen =
  | { screen: 'not_started'; pixKey: string | null }
  | { screen: 'confirm_data'; fields: ConfirmDataFields }
  | { screen: 'creating' }
  | { screen: 'awaiting_revenue' }
  | { screen: 'documents_pending'; documents: DocumentItem[] }
  | { screen: 'under_review' }
  | { screen: 'approved' }
  | { screen: 'managed'; pixKey: string }
  | { screen: 'rejected'; reason: string | null };

// ─── Label map ────────────────────────────────────────────────────────────────

const DOC_LABELS: Record<string, string> = {
  SELFIE: 'Selfie do responsável',
  IDENTIFICATION: 'Documento de identificação',
  SOCIAL_CONTRACT: 'Contrato social',
  BALANCE_SHEET: 'Balanço patrimonial',
};

const docLabel = (type: string) => DOC_LABELS[type] ?? type;

// ─── Read ─────────────────────────────────────────────────────────────────────

/** Derives the current UI screen from org state. Fetches doc list when needed. */
export const getFinanceSetupState = async (ctx: Ctx): Promise<FinanceSetupScreen> => {
  assertAdmin(ctx);
  const [org] = await ctx.db
    .select()
    .from(organization)
    .where(eq(organization.pk, ctx.organizationId))
    .limit(1);
  if (!org) throw new NotFoundError('Organização não encontrada.');

  const status = org.asaasOnboardingStatus;

  if (status === 'not_started') {
    return { screen: 'not_started', pixKey: org.asaasPixKeyCached };
  }
  if (status === 'creating') return { screen: 'creating' };
  if (status === 'awaiting_revenue') return { screen: 'awaiting_revenue' };
  if (status === 'under_review') return { screen: 'under_review' };
  if (status === 'rejected') return { screen: 'rejected', reason: null };

  if (status === 'documents_pending') {
    const apiKey = org.asaasApiKeyEncrypted ? decrypt(org.asaasApiKeyEncrypted) : null;
    if (!apiKey) return { screen: 'awaiting_revenue' };
    const raw = await getPayments().getRequiredDocuments(apiKey);
    const documents: DocumentItem[] = raw.map((d) => ({
      id: d.id,
      type: d.type,
      label: docLabel(d.type),
      externalOnly: !!d.onboardingUrl,
      onboardingUrl: d.onboardingUrl,
    }));
    return { screen: 'documents_pending', documents };
  }

  if (status === 'approved') {
    return org.asaasPixKeyCached
      ? { screen: 'managed', pixKey: org.asaasPixKeyCached }
      : { screen: 'approved' };
  }

  return { screen: 'not_started', pixKey: org.asaasPixKeyCached };
};

/** Used by confirm-data screen: returns the fields the user needs to review/fill. */
export const getConfirmDataFields = async (ctx: Ctx): Promise<ConfirmDataFields> => {
  assertAdmin(ctx);
  const [org] = await ctx.db
    .select()
    .from(organization)
    .where(eq(organization.pk, ctx.organizationId))
    .limit(1);
  if (!org) throw new NotFoundError('Organização não encontrada.');
  return {
    name: org.name,
    document: org.document,
    documentType: org.documentType,
    email: org.email,
    phone: org.phone,
    streetAddress: org.streetAddress,
    addressNumber: org.addressNumber,
    addressComplement: org.addressComplement,
    postalCode: org.postalCode,
    companyType: org.companyType ?? null,
    responsibleBirthDate: org.responsibleBirthDate,
  };
};

// ─── confirmAndCreateSubaccount ───────────────────────────────────────────────

const confirmSchema = z.object({
  companyType: z.enum(['MEI', 'LIMITED', 'INDIVIDUAL', 'ASSOCIATION'], {
    required_error: 'Selecione o tipo da organização.',
  }),
  responsibleBirthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida — use formato AAAA-MM-DD.'),
});

export type ConfirmAndCreateInput = z.input<typeof confirmSchema>;

export const confirmAndCreateSubaccount = async (
  ctx: Ctx,
  input: unknown,
): Promise<void> => {
  assertAdmin(ctx);
  const data = confirmSchema.parse(input);

  const [org] = await ctx.db
    .select()
    .from(organization)
    .where(eq(organization.pk, ctx.organizationId))
    .limit(1);
  if (!org) throw new NotFoundError('Organização não encontrada.');
  if (org.asaasOnboardingStatus !== 'not_started') {
    throw new ValidationError('Subconta já iniciada. Atualize a página.');
  }

  // Persist the two missing fields before calling Asaas
  await ctx.db
    .update(organization)
    .set({ companyType: data.companyType, responsibleBirthDate: data.responsibleBirthDate })
    .where(eq(organization.pk, ctx.organizationId));

  const result = await getPayments().createSubaccount({
    name: org.name,
    cpfCnpj: org.document,
    email: org.email ?? `${org.document}@acolhe.placeholder`,
    phone: org.phone.replace(/\D/g, ''),
    birthDate: data.responsibleBirthDate,
    companyType: data.companyType,
    address: org.streetAddress
      ? {
          street: org.streetAddress,
          number: org.addressNumber ?? 'S/N',
          province: 'Centro',
          postalCode: (org.postalCode ?? '').replace(/\D/g, ''),
        }
      : undefined,
  });

  const encryptedKey = encrypt(result.apiKey);
  let pixKey: string | null = null;
  try {
    pixKey = await getPayments().getPixKey(result.apiKey);
  } catch {
    // Pix key may not be available immediately — will be refreshed after approval
  }

  await ctx.db
    .update(organization)
    .set({
      asaasAccountId: result.accountId,
      asaasApiKeyEncrypted: encryptedKey,
      asaasWalletId: result.walletId,
      asaasPixKeyCached: pixKey,
      asaasOnboardingStatus: 'awaiting_revenue',
      asaasKycStatus: 'pending',
    })
    .where(eq(organization.pk, ctx.organizationId));
};

// ─── fetchRequiredDocuments ───────────────────────────────────────────────────

export const fetchRequiredDocuments = async (ctx: Ctx): Promise<DocumentItem[]> => {
  assertAdmin(ctx);
  const [org] = await ctx.db
    .select({ apiKey: organization.asaasApiKeyEncrypted })
    .from(organization)
    .where(eq(organization.pk, ctx.organizationId))
    .limit(1);
  if (!org?.apiKey) throw new NotFoundError('Conta Asaas não encontrada.');
  const apiKey = decrypt(org.apiKey);
  const raw = await getPayments().getRequiredDocuments(apiKey);
  return raw.map((d) => ({
    id: d.id,
    type: d.type,
    label: docLabel(d.type),
    externalOnly: !!d.onboardingUrl,
    onboardingUrl: d.onboardingUrl,
  }));
};

// ─── uploadDocument ───────────────────────────────────────────────────────────

export const uploadDocument = async (
  ctx: Ctx,
  docId: string,
  fileBuffer: Buffer,
  mimeType: string,
  filename: string,
): Promise<void> => {
  assertAdmin(ctx);
  const [org] = await ctx.db
    .select({
      apiKey: organization.asaasApiKeyEncrypted,
      status: organization.asaasOnboardingStatus,
    })
    .from(organization)
    .where(eq(organization.pk, ctx.organizationId))
    .limit(1);
  if (!org?.apiKey) throw new NotFoundError('Conta Asaas não encontrada.');
  if (org.status !== 'documents_pending') {
    throw new ValidationError('Envio de documentos não está disponível no estado atual.');
  }
  const apiKey = decrypt(org.apiKey);
  await getPayments().uploadDocument({
    accountApiKey: apiKey,
    documentId: docId,
    fileBuffer,
    mimeType,
    filename,
  });
};

// ─── checkAndSyncAccountStatus ────────────────────────────────────────────────

export const checkAndSyncAccountStatus = async (ctx: Ctx): Promise<FinanceSetupScreen> => {
  assertAdmin(ctx);
  const [org] = await ctx.db
    .select()
    .from(organization)
    .where(eq(organization.pk, ctx.organizationId))
    .limit(1);
  if (!org?.asaasApiKeyEncrypted) throw new NotFoundError('Conta Asaas não encontrada.');
  const apiKey = decrypt(org.asaasApiKeyEncrypted);
  const status = await getPayments().getAccountStatus(apiKey);

  type MappedStatus = {
    kyc: Organization['asaasKycStatus'];
    onboarding: Organization['asaasOnboardingStatus'];
  };

  const statusMap: Record<string, MappedStatus> = {
    AWAITING_DOCUMENTS: { kyc: 'awaiting_documents', onboarding: 'documents_pending' },
    UNDER_REVIEW: { kyc: 'under_review', onboarding: 'under_review' },
    APPROVED: { kyc: 'approved', onboarding: 'approved' },
    ACTIVE: { kyc: 'approved', onboarding: 'approved' },
    REJECTED: { kyc: 'rejected', onboarding: 'rejected' },
  };
  const mapped = statusMap[status.status];
  if (mapped) {
    const updates: Partial<Organization> = {
      asaasKycStatus: mapped.kyc,
      asaasOnboardingStatus: mapped.onboarding,
    };
    if (mapped.onboarding === 'approved' && !org.asaasPixKeyCached) {
      try {
        updates.asaasPixKeyCached = await getPayments().getPixKey(apiKey);
      } catch {
        // Pix key may not yet be available — will retry on next poll
      }
    }
    await ctx.db.update(organization).set(updates).where(eq(organization.pk, ctx.organizationId));
  }
  return getFinanceSetupState(ctx);
};

// ─── advanceKycStatus (called by webhook handler) ─────────────────────────────

const WEBHOOK_STATUS_MAP = {
  AWAITING_DOCUMENTS: { kyc: 'awaiting_documents' as const, onboarding: 'documents_pending' as const },
  UNDER_REVIEW: { kyc: 'under_review' as const, onboarding: 'under_review' as const },
  APPROVED: { kyc: 'approved' as const, onboarding: 'approved' as const },
  ACTIVE: { kyc: 'approved' as const, onboarding: 'approved' as const },
  REJECTED: { kyc: 'rejected' as const, onboarding: 'rejected' as const },
} as const;

export const advanceKycStatus = async (
  db: Ctx['db'],
  asaasAccountId: string,
  eventStatus: string,
): Promise<void> => {
  const mapped = WEBHOOK_STATUS_MAP[eventStatus as keyof typeof WEBHOOK_STATUS_MAP];
  if (!mapped) return; // unknown status — ignore

  const [org] = await db
    .select({
      pk: organization.pk,
      apiKey: organization.asaasApiKeyEncrypted,
      pixKey: organization.asaasPixKeyCached,
    })
    .from(organization)
    .where(eq(organization.asaasAccountId, asaasAccountId))
    .limit(1);
  if (!org) return; // account not found — log externally

  const updates: Partial<Organization> = {
    asaasKycStatus: mapped.kyc,
    asaasOnboardingStatus: mapped.onboarding,
  };

  if (mapped.onboarding === 'approved' && !org.pixKey && org.apiKey) {
    try {
      updates.asaasPixKeyCached = await getPayments().getPixKey(decrypt(org.apiKey));
    } catch {
      // Pix key not yet available
    }
  }

  await db.update(organization).set(updates).where(eq(organization.pk, org.pk));
};
