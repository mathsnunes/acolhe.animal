'use server';

import { revalidatePath } from 'next/cache';

import { changeMemberRole, createMemberInvite, removeMember, revokeInvite } from '@acolhe-animal/domain';
import { serverEnv } from '@acolhe-animal/shared/env';

import { action } from '@/lib/action';
import { requireCtx } from '@/lib/auth-context';

export const inviteMemberAction = async (input: { phone: string; name?: string; role: 'admin' | 'volunteer' }) =>
  action(async () => {
    const ctx = await requireCtx();
    const { acceptUrl } = await createMemberInvite(ctx, { ...input, appBaseUrl: serverEnv().BETTER_AUTH_URL });
    revalidatePath('/membros');
    return { acceptUrl };
  });

export const revokeInviteAction = async (inviteId: string) =>
  action(async () => {
    const ctx = await requireCtx();
    await revokeInvite(ctx, inviteId);
    revalidatePath('/membros');
    return { ok: true };
  });

export const removeMemberAction = async (memberId: string) =>
  action(async () => {
    const ctx = await requireCtx();
    await removeMember(ctx, memberId);
    revalidatePath('/membros');
    return { ok: true };
  });

export const changeRoleAction = async (memberId: string, role: 'admin' | 'volunteer') =>
  action(async () => {
    const ctx = await requireCtx();
    await changeMemberRole(ctx, memberId, role);
    revalidatePath('/membros');
    return { ok: true };
  });
