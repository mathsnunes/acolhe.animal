'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';

import { normalizePhoneBR } from '@acolhe-animal/shared';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { signIn } from '@/lib/auth-client';

export default function LoginPage() {
  const t = useTranslations('auth.login');
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const normalized = normalizePhoneBR(phone);
    if (!normalized) {
      toast.error(t('invalidPhone'));
      return;
    }
    setLoading(true);
    try {
      const res = await signIn.phoneNumber({ phoneNumber: normalized, password });
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
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <h1 className="display text-3xl text-ink">{t('title')}</h1>
        <p className="mt-1 text-sm text-ink-soft">{t('subtitle')}</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">{t('phone')}</Label>
        <Input
          id="phone"
          inputMode="tel"
          placeholder="(48) 99999-0000"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          autoComplete="tel"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">{t('password')}</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />
      </div>

      <Button type="submit" className="w-full" pending={loading}>
        {t('submit')}
      </Button>

      <p className="text-center text-xs text-ink-mute">{t('devHint')}</p>
    </form>
  );
}
