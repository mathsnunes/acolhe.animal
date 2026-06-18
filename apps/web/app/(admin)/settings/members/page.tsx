import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { listMembers, listPendingInvites } from '@acolhe-animal/domain';
import { serverEnv } from '@acolhe-animal/shared/env';

import { requireCtx } from '@/lib/auth-context';

import { MembersManager } from './members-client';

export const dynamic = 'force-dynamic';

/** Org member management — admin only (volunteers are bounced to the home). */
const MembersPage = async () => {
  const ctx = await requireCtx();
  if (ctx.actor.type !== 'user' || ctx.actor.role !== 'admin') redirect('/inicio');

  const t = await getTranslations('members');
  const [members, invites] = await Promise.all([listMembers(ctx), listPendingInvites(ctx)]);

  return (
    <div className="grid gap-5">
      <MembersManager members={members} invites={invites} baseUrl={serverEnv().BETTER_AUTH_URL} />
    </div>
  );
};

export default MembersPage;
