import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { db } from '@acolhe-animal/db';
import { getActiveInviteByToken, getUserByPhone } from '@acolhe-animal/domain';
import { formatPhoneBR } from '@acolhe-animal/shared';

import { AuthPane } from '@/components/auth/auth-pane';

import { InviteFlow } from './invite-flow';

/**
 * Invite landing: `acolhe.animal/convite/[token]`. Loads the (pending,
 * non-expired) invite, decides existing-account vs new-person by the invited
 * phone, and hands off to the adaptive client flow.
 */
export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const details = await getActiveInviteByToken(db, token);

  if (!details) {
    const t = await getTranslations('auth.invite');
    return (
      <AuthPane>
        <div className="eyebrow text-terra">{t('eyebrowNew')}</div>
        <h1 className="display mt-2 text-[2rem] font-light leading-tight tracking-[-0.025em] text-ink">{t('invalid')}</h1>
        <p className="hint mt-3">{t('invalidBody')}</p>
        <Link href="/entrar" className="mt-6 inline-block text-[13px] font-medium text-terra hover:underline hover:underline-offset-2">
          {t('backToLogin')} →
        </Link>
      </AuthPane>
    );
  }

  const existing = await getUserByPhone(db, details.invite.phoneNumber);

  return (
    <InviteFlow
      token={token}
      orgName={details.organization.name}
      phone={details.invite.phoneNumber}
      phoneDisplay={formatPhoneBR(details.invite.phoneNumber)}
      mode={existing ? 'existing' : 'new'}
    />
  );
}
