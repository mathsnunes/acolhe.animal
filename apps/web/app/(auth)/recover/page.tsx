'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';

import { normalizePhoneBR } from '@acolhe-animal/shared';

import { AuthHeading, titleEm } from '@/components/auth/auth-heading';
import { AuthPane } from '@/components/auth/auth-pane';
import { OtpStep } from '@/components/auth/otp-step';
import { PasswordField } from '@/components/auth/password-field';
import { PhoneField } from '@/components/auth/phone-field';
import { Button } from '@/components/ui/button';

import { completeRecoveryAction, startEmailRecoveryAction, startPhoneRecoveryAction } from './actions';

type Step = 'phone' | 'otp' | 'newpass';

export default function RecoverPage() {
  const t = useTranslations('auth.recover');
  const tOtp = useTranslations('auth.otp');
  const tPwd = useTranslations('auth.password');
  const router = useRouter();

  const [step, setStep] = useState<Step>('phone');
  const [busy, setBusy] = useState(false);
  const [phone, setPhone] = useState('');
  const [e164, setE164] = useState('');
  const [channel, setChannel] = useState<'whatsapp' | 'email'>('whatsapp');
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [password, setPassword] = useState('');

  const submitPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = normalizePhoneBR(phone);
    if (!normalized) return toast.error(tOtp('invalid'));
    setBusy(true);
    try {
      await startPhoneRecoveryAction(normalized);
      setE164(normalized);
      setChannel('whatsapp');
      setOtp('');
      setStep('otp');
    } finally {
      setBusy(false);
    }
  };

  const sendByEmail = async () => {
    const res = await startEmailRecoveryAction(e164);
    if (res.ok) {
      setChannel('email');
      setOtp('');
      toast.success(tOtp('sentByEmail', { email: res.emailHint }));
    } else {
      toast.error(tOtp('noEmail'));
    }
  };

  const submitOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 6) return;
    setOtpError('');
    setStep('newpass');
  };

  const submitNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await completeRecoveryAction({ phone: e164, otp, newPassword: password, channel });
      if (!res.ok) {
        setOtpError(res.error.message);
        setStep('otp');
        return;
      }
      toast.success(t('done'));
      router.push('/entrar');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthPane>
      {step === 'phone' ? (
        <>
          <AuthHeading
            eyebrow={t('phone.eyebrow')}
            title={t.rich('phone.title', { em: titleEm })}
            subtitle={t('phone.subtitle')}
          />
          <form onSubmit={submitPhone} className="space-y-5">
            <PhoneField label={t('phone.label')} value={phone} onChange={setPhone} autoFocus />
            <Button type="submit" className="w-full" pending={busy}>
              {t('phone.submit')} <span aria-hidden>→</span>
            </Button>
          </form>
          <p className="mt-7 text-center text-[13px] text-ink-soft">
            {t('phone.remembered')}{' '}
            <Link href="/entrar" className="font-medium text-terra hover:underline hover:underline-offset-2">
              {t('phone.backToLogin')}
            </Link>
          </p>
        </>
      ) : null}

      {step === 'otp' ? (
        <>
          <AuthHeading
            eyebrow={tOtp('eyebrow')}
            title={tOtp.rich('title', { em: titleEm })}
            subtitle={
              <>
                {tOtp('sentTo')}{' '}
                <span className="rounded-full bg-bg-2 px-2.5 py-0.5 font-mono text-[13px] font-medium text-ink">{phone}</span>
              </>
            }
          />
          <form onSubmit={submitOtp} className="space-y-5">
            <OtpStep
              value={otp}
              onChange={setOtp}
              onResend={async () => {
                await startPhoneRecoveryAction(e164);
              }}
              error={otpError}
              extra={
                <span>
                  {tOtp('byEmailQuestion')}{' '}
                  <button type="button" onClick={sendByEmail} className="font-medium text-terra hover:underline hover:underline-offset-2">
                    {tOtp('byEmail')}
                  </button>
                </span>
              }
            />
            <Button type="submit" className="w-full" pending={busy} disabled={otp.length < 6}>
              {tOtp('verify')} <span aria-hidden>→</span>
            </Button>
            <button type="button" onClick={() => setStep('phone')} className="mx-auto block text-[13px] font-medium text-terra hover:underline hover:underline-offset-2">
              ← {tOtp('changePhone')}
            </button>
          </form>
        </>
      ) : null}

      {step === 'newpass' ? (
        <>
          <AuthHeading
            eyebrow={t('newPassword.eyebrow')}
            title={t.rich('newPassword.title', { em: titleEm })}
            subtitle={t('newPassword.subtitle')}
          />
          <form onSubmit={submitNewPassword} className="space-y-5">
            <PasswordField
              label={t('newPassword.label')}
              hint={tPwd('minHint')}
              value={password}
              onChange={setPassword}
              placeholder={tPwd('placeholder')}
              autoComplete="new-password"
              showStrength
              autoFocus
            />
            <Button type="submit" className="w-full" pending={busy} disabled={password.length < 8}>
              {t('newPassword.submit')} <span aria-hidden>→</span>
            </Button>
          </form>
        </>
      ) : null}
    </AuthPane>
  );
}
