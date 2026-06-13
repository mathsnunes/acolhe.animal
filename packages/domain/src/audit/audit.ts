import { createId } from '@acolhe-animal/shared';
import { auditLog, type JsonRecord } from '@acolhe-animal/db';

import type { Ctx } from '../context';

/**
 * Forensic trail of sensitive actions (never shown in the UI). Has before/after
 * diffs. See `modelagem-dados.md` › AuditLog. "Is this history the org wants to
 * see, or evidence someone may need to prove?" — the latter goes here.
 */
export type AuditAction =
  | 'organization.pix_key.changed'
  | 'organization.asaas_credentials.changed'
  | 'user.banned'
  | 'user.unbanned'
  | 'member.added'
  | 'member.removed'
  | 'member.role_changed'
  | 'donation.cancelled'
  | 'cashflow_entry.deleted'
  | 'cashflow_entry.amount_changed'
  | 'payout_account.created'
  | 'payout_account.deactivated'
  | 'payout_account.pix_key.changed'
  | 'payout_account.bank_account.changed'
  | 'payout_account.set_as_default';

export async function emitAuditLog(
  ctx: Ctx,
  input: {
    action: AuditAction;
    entityType?: string;
    entityId?: string;
    previousValue?: JsonRecord;
    newValue?: JsonRecord;
    reason?: string;
    requestMetadata?: JsonRecord;
  },
): Promise<void> {
  const actorType =
    ctx.actor.type === 'user' ? 'user' : ctx.actor.type === 'system' ? 'system' : 'webhook';
  const actorUserId = ctx.actor.type === 'user' ? ctx.actor.userId : null;
  const actorContext = ctx.actor.type === 'system' ? { source: ctx.actor.source } : null;

  await ctx.db.insert(auditLog).values({
    id: createId('auditLog'),
    organizationId: ctx.organizationId,
    actorType,
    actorUserId,
    actorContext,
    action: input.action,
    entityType: input.entityType ?? null,
    entityId: input.entityId ?? null,
    previousValue: input.previousValue ?? null,
    newValue: input.newValue ?? null,
    reason: input.reason ?? null,
    requestMetadata: input.requestMetadata ?? null,
  });
}
