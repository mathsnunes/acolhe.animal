'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { createTestDonationCharge, simulateTestPayment } from '@acolhe-animal/domain';
import type { ActionResult } from '@acolhe-animal/shared';

import { requireCtx } from '@/lib/auth-context';
import { action } from '@/lib/action';

const schema = z.object({ amount: z.number().positive() });

export interface TestChargeResult {
  qrCodePayload: string;
  qrCodeImageBase64: string;
  paymentId: string;
}

// TODO: remove — sandbox simulation only
export const createTestDonationAction = async (
  input: { amount: number },
): Promise<ActionResult<TestChargeResult>> =>
  action(async () => {
    const ctx = await requireCtx();
    const { amount } = schema.parse(input);
    const result = await createTestDonationCharge(ctx, amount);
    revalidatePath('/doacoes');
    return result;
  });

// TODO: remove — sandbox simulation only
export const simulateTestPaymentAction = async (
  asaasPaymentId: string,
): Promise<ActionResult<void>> =>
  action(async () => {
    const ctx = await requireCtx();
    await simulateTestPayment(ctx, asaasPaymentId);
    revalidatePath('/doacoes');
  });
