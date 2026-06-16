import { and, asc, count, desc, eq, isNull } from 'drizzle-orm';
import { z } from 'zod';

import {
  ConflictError,
  createId,
  createToken,
  ForbiddenError,
  NotFoundError,
  phoneSchema,
} from '@acolhe-animal/shared';
import type { DbExecutor, OrganizationInvite } from '@acolhe-animal/db';
import { organizationInvite, organizationMember, user } from '@acolhe-animal/db';
import { getMessaging } from '@acolhe-animal/integrations';
import { inviteWhatsApp } from '@acolhe-animal/messaging';

import type { Ctx } from '../context';
import { assertAdmin, isUser } from '../auth/permissions';
import { getOrganizationByPk } from '../organizations/service';

/**
 * Member & invite management for an organization. Every function is tenant-scoped
 * via `Ctx` and admin-only (`assertAdmin`). The safeguards keep an org from ever
 * losing its last admin or a user from removing themselves.
 */

const roleSchema = z.enum(['admin', 'volunteer']);

export interface MemberRow {
  id: string;
  userId: string;
  name: string;
  phone: string;
  role: 'admin' | 'volunteer';
  joinedAt: Date;
  isSelf: boolean;
}

export interface PendingInviteRow {
  id: string;
  phone: string;
  name: string | null;
  role: 'admin' | 'volunteer';
  invitedAt: Date;
  expiresAt: Date;
  token: string;
}

/** The actor's user id, guaranteed present after `assertAdmin`. */
const actorUserId = (ctx: Ctx): string => {
  if (!isUser(ctx.actor)) throw new ForbiddenError('Ação disponível apenas para membros autenticados.');
  return ctx.actor.userId;
};

/** Count active admins in an org — the guard against orphaning the org. */
export const countActiveAdmins = async (db: DbExecutor, organizationId: number): Promise<number> => {
  const [row] = await db
    .select({ n: count() })
    .from(organizationMember)
    .where(
      and(
        eq(organizationMember.organizationId, organizationId),
        eq(organizationMember.role, 'admin'),
        isNull(organizationMember.removedAt),
      ),
    );
  return Number(row?.n ?? 0);
};

export const listMembers = async (ctx: Ctx): Promise<MemberRow[]> => {
  assertAdmin(ctx);
  const selfId = actorUserId(ctx);
  const rows = await ctx.db
    .select({
      id: organizationMember.id,
      userId: organizationMember.userId,
      name: user.name,
      phone: user.phoneNumber,
      role: organizationMember.role,
      joinedAt: organizationMember.joinedAt,
    })
    .from(organizationMember)
    .innerJoin(user, eq(organizationMember.userId, user.id))
    .where(and(eq(organizationMember.organizationId, ctx.organizationId), isNull(organizationMember.removedAt)))
    // Admins first (role asc: 'admin' < 'volunteer'), then by join order.
    .orderBy(asc(organizationMember.role), asc(organizationMember.joinedAt));
  return rows.map((r) => ({ ...r, isSelf: r.userId === selfId }));
};

export const listPendingInvites = async (ctx: Ctx): Promise<PendingInviteRow[]> => {
  assertAdmin(ctx);
  return ctx.db
    .select({
      id: organizationInvite.id,
      phone: organizationInvite.phoneNumber,
      name: organizationInvite.name,
      role: organizationInvite.role,
      invitedAt: organizationInvite.createdAt,
      expiresAt: organizationInvite.expiresAt,
      token: organizationInvite.token,
    })
    .from(organizationInvite)
    .where(and(eq(organizationInvite.organizationId, ctx.organizationId), eq(organizationInvite.status, 'pending')))
    .orderBy(desc(organizationInvite.createdAt));
};

const createInviteSchema = z.object({
  phone: phoneSchema,
  name: z
    .string()
    .trim()
    .optional()
    .or(z.literal('').transform(() => undefined)),
  role: roleSchema,
  /** Base URL of the app, provided by the web layer (the domain never reads env). */
  appBaseUrl: z.string().url(),
});

export type CreateMemberInviteInput = z.input<typeof createInviteSchema>;

export const createMemberInvite = async (
  ctx: Ctx,
  input: CreateMemberInviteInput,
): Promise<{ invite: OrganizationInvite; acceptUrl: string }> => {
  assertAdmin(ctx);
  const invitedBy = actorUserId(ctx);
  const data = createInviteSchema.parse(input);

  // Already an active member with this phone?
  const [existingMember] = await ctx.db
    .select({ pk: organizationMember.pk })
    .from(organizationMember)
    .innerJoin(user, eq(organizationMember.userId, user.id))
    .where(
      and(
        eq(organizationMember.organizationId, ctx.organizationId),
        eq(user.phoneNumber, data.phone),
        isNull(organizationMember.removedAt),
      ),
    )
    .limit(1);
  if (existingMember) throw new ConflictError('Esta pessoa já é membro da organização.', { phone: 'Já é membro.' });

  // Pending invite already out for this phone?
  const [pending] = await ctx.db
    .select({ pk: organizationInvite.pk })
    .from(organizationInvite)
    .where(
      and(
        eq(organizationInvite.organizationId, ctx.organizationId),
        eq(organizationInvite.phoneNumber, data.phone),
        eq(organizationInvite.status, 'pending'),
      ),
    )
    .limit(1);
  if (pending) throw new ConflictError('Já existe um convite pendente para este telefone.', { phone: 'Convite já enviado.' });

  const org = await getOrganizationByPk(ctx.db, ctx.organizationId);
  if (!org) throw new NotFoundError('Organização não encontrada.');

  const token = createToken();
  const [invite] = await ctx.db
    .insert(organizationInvite)
    .values({
      id: createId('organizationInvite'),
      organizationId: ctx.organizationId,
      invitedByUserId: invitedBy,
      phoneNumber: data.phone,
      name: data.name ?? null,
      role: data.role,
      token,
    })
    .returning();
  if (!invite) throw new Error('Falha ao criar o convite.');

  const acceptUrl = `${data.appBaseUrl}/convite/${token}`;
  await getMessaging().sendText({
    to: data.phone,
    body: inviteWhatsApp({ organizationName: org.name, acceptUrl }).text,
  });

  return { invite, acceptUrl };
};

export const revokeInvite = async (ctx: Ctx, inviteId: string): Promise<void> => {
  assertAdmin(ctx);
  const [row] = await ctx.db
    .update(organizationInvite)
    .set({ status: 'revoked' })
    .where(
      and(
        eq(organizationInvite.id, inviteId),
        eq(organizationInvite.organizationId, ctx.organizationId),
        eq(organizationInvite.status, 'pending'),
      ),
    )
    .returning({ pk: organizationInvite.pk });
  if (!row) throw new NotFoundError('Convite não encontrado.');
};

/** Resolve an active member by public id within the current org. */
const getActiveMember = async (ctx: Ctx, memberId: string) => {
  const [member] = await ctx.db
    .select({ pk: organizationMember.pk, userId: organizationMember.userId, role: organizationMember.role })
    .from(organizationMember)
    .where(
      and(
        eq(organizationMember.id, memberId),
        eq(organizationMember.organizationId, ctx.organizationId),
        isNull(organizationMember.removedAt),
      ),
    )
    .limit(1);
  return member ?? null;
};

export const removeMember = async (ctx: Ctx, memberId: string): Promise<void> => {
  assertAdmin(ctx);
  const selfId = actorUserId(ctx);
  const member = await getActiveMember(ctx, memberId);
  if (!member) throw new NotFoundError('Membro não encontrado.');
  if (member.userId === selfId) throw new ForbiddenError('Você não pode remover a si mesmo.');
  if (member.role === 'admin' && (await countActiveAdmins(ctx.db, ctx.organizationId)) <= 1) {
    throw new ForbiddenError('A organização precisa de pelo menos um administrador.');
  }
  await ctx.db
    .update(organizationMember)
    .set({ removedAt: new Date(), removedByUserId: selfId })
    .where(eq(organizationMember.pk, member.pk));
};

export const changeMemberRole = async (ctx: Ctx, memberId: string, role: 'admin' | 'volunteer'): Promise<void> => {
  assertAdmin(ctx);
  const nextRole = roleSchema.parse(role);
  const member = await getActiveMember(ctx, memberId);
  if (!member) throw new NotFoundError('Membro não encontrado.');
  if (member.role === nextRole) return;
  if (member.role === 'admin' && nextRole === 'volunteer' && (await countActiveAdmins(ctx.db, ctx.organizationId)) <= 1) {
    throw new ForbiddenError('A organização precisa de pelo menos um administrador.');
  }
  await ctx.db.update(organizationMember).set({ role: nextRole }).where(eq(organizationMember.pk, member.pk));
};
