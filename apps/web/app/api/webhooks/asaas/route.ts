import { revalidateTag } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

import { db } from '@acolhe-animal/db';
import { advanceKycStatus } from '@acolhe-animal/domain';

export const dynamic = 'force-dynamic';

/**
 * Receives Asaas webhook events. Validates the access token, then routes by
 * event type. Currently handles ACCOUNT_STATUS (KYC state transitions).
 * All other event types are accepted with 200 and ignored.
 */
export const POST = async (req: NextRequest): Promise<NextResponse> => {
  const token = req.headers.get('asaas-access-token');
  const expectedToken = process.env.ASAAS_WEBHOOK_TOKEN;

  if (!expectedToken) {
    console.error('[webhook/asaas] ASAAS_WEBHOOK_TOKEN not configured');
    return NextResponse.json({ error: 'not configured' }, { status: 500 });
  }

  if (!token || token !== expectedToken) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  const event = body as Record<string, unknown>;
  const eventType = event.event as string | undefined;

  if (eventType === 'ACCOUNT_STATUS') {
    const account = event.account as Record<string, unknown> | undefined;
    const accountId = account?.id as string | undefined;
    const status = account?.status as string | undefined;

    if (accountId && status) {
      try {
        await advanceKycStatus(db, accountId, status);
        revalidateTag('org-finance');
      } catch (err) {
        console.error('[webhook/asaas] advanceKycStatus failed:', err);
      }
    }
  }

  return NextResponse.json({ received: true });
};
