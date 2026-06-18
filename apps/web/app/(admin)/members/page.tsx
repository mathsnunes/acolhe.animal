import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { listMembers, listPendingInvites } from '@acolhe-animal/domain';
import { serverEnv } from '@acolhe-animal/shared/env';

import { requireCtx } from '@/lib/auth-context';

import { MembersManager } from './members-client';

export const dynamic = 'force-dynamic';

/** Org member management — admin only (volunteers are bounced to the home). */
export default async function MembersPage() {
  const ctx = await requireCtx();
  if (ctx.actor.type !== 'user' || ctx.actor.role !== 'admin') redirect('/inicio');

  const t = await getTranslations('members');
  const [members, invites] = await Promise.all([listMembers(ctx), listPendingInvites(ctx)]);

  return (
    <div className="mx-auto max-w-3xl px-6 py-8 sm:px-10">
      <p className="eyebrow mb-2">— {t('eyebrow')}</p>
      <h1 className="display text-4xl text-ink">{t('title')}</h1>
      <p className="mt-2 text-ink-soft">{t('subtitle')}</p>

      <MembersManager members={members} invites={invites} baseUrl={serverEnv().BETTER_AUTH_URL} />
    </div>
  );
}
