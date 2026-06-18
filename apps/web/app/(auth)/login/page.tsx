'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';

import { normalizePhoneBR } from '@acolhe-animal/shared';

import { AuthHeading, titleEm } from '@/components/auth/auth-heading';
import { AuthModeTabs } from '@/components/auth/auth-mode-tabs';
import { AuthPane } from '@/components/auth/auth-pane';
import { PasswordField } from '@/components/auth/password-field';
import { PhoneField } from '@/components/auth/phone-field';
import { Button } from '@/components/ui/button';
import { signIn } from '@/lib/auth-client';

export default function LoginPage() {
  const t = useTranslations('auth.login');
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = normalizePhoneBR(phone);
    if (!normalized) {
      toast.error(t('invalidPhone'));
      return;
    }
    setLoading(true);
    try {
      const res = await signIn.phoneNumber({ phoneNumber: normalized, password, rememberMe: remember });
      if (res.error) {
        toast.error(t('invalidCredentials'));
      } else {
        router.push('/inicio');
      }
    } catch {
      toast.error(t('genericError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthPane slot={<AuthModeTabs current="login" />}>
      <AuthHeading
        eyebrow={t('eyebrow')}
        title={t.rich('title', { em: titleEm })}
        subtitle={t('subtitle')}
      />

      <form onSubmit={onSubmit} className="space-y-4">
        <PhoneField label={t('phone')} value={phone} onChange={setPhone} autoFocus />
        <PasswordField label={t('password')} value={password} onChange={setPassword} />

        <div className="flex items-center justify-between pt-0.5">
          <label className="flex cursor-pointer items-center gap-2 text-[13px] text-ink-soft">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="size-4 cursor-pointer accent-terra"
            />
            {t('remember')}
          </label>
          <Link href="/recuperar-senha" className="text-[13px] font-medium text-terra hover:underline hover:underline-offset-2">
            {t('forgot')}
          </Link>
        </div>

        <Button type="submit" className="w-full" pending={loading}>
          {t('submit')} <span aria-hidden>→</span>
        </Button>

        <p className="text-center text-xs text-ink-mute">{t('devHint')}</p>
      </form>
    </AuthPane>
  );
}
