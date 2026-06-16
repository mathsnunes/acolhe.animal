'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';

/**
 * Login ⇄ signup pill tabs shown at the top-right of the login and signup panes.
 * `current` drives the active pill and the contextual "não tem conta?" prompt.
 */
export const AuthModeTabs = ({ current }: { current: 'login' | 'signup' }) => {
  const t = useTranslations('auth.tabs');

  const pill = (active: boolean) =>
    cn(
      'rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors',
      active ? 'bg-ink text-paper' : 'text-ink-soft hover:bg-bg-2 hover:text-ink',
    );

  return (
    <nav className="flex items-center justify-end gap-1 text-[13px] text-ink-mute">
      <span className="mr-2 hidden sm:inline">{current === 'login' ? t('noAccount') : t('hasAccount')}</span>
      <Link href="/entrar" className={pill(current === 'login')}>
        {t('login')}
      </Link>
      <Link href="/criar-conta" className={pill(current === 'signup')}>
        {t('signup')}
      </Link>
    </nav>
  );
};
