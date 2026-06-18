'use server';

import { revalidatePath, revalidateTag } from 'next/cache';

import {
  checkAndSyncAccountStatus,
  confirmAndCreateSubaccount,
  fetchRequiredDocuments,
  uploadDocument,
  type ConfirmAndCreateInput,
} from '@acolhe-animal/domain';

import { action } from '@/lib/action';
import { requireCtx } from '@/lib/auth-context';

const revalidateFinance = () => {
  revalidatePath('/config/financeiro');
  revalidateTag('org-finance');
};

/** Submit confirm-data form and trigger subaccount creation. */
export const confirmAndCreateAction = async (input: ConfirmAndCreateInput) =>
  action(async () => {
    const ctx = await requireCtx();
    await confirmAndCreateSubaccount(ctx, input);
    revalidateFinance();
  });

/** Poll Asaas for the current account status and advance state if it changed. */
export const checkStatusAction = async () =>
  action(async () => {
    const ctx = await requireCtx();
    const state = await checkAndSyncAccountStatus(ctx);
    revalidateFinance();
    return state;
  });

/** Upload a document natively (for docs without onboardingUrl). */
export const uploadDocumentAction = async (formData: FormData) =>
  action(async () => {
    const ctx = await requireCtx();
    const file = formData.get('file') as File | null;
    const docId = formData.get('docId') as string | null;
    if (!file || !docId) throw new Error('Arquivo ou documento não informado.');
    const buffer = Buffer.from(await file.arrayBuffer());
    await uploadDocument(ctx, docId, buffer, file.type, file.name);
    revalidateFinance();
  });

/** Refresh the document list (after returning from an external Asaas onboarding URL). */
export const refreshDocumentsAction = async () =>
  action(async () => {
    const ctx = await requireCtx();
    return fetchRequiredDocuments(ctx);
  });
