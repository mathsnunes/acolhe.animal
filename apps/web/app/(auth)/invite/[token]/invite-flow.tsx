'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';

import { AuthHeading, titleEm } from '@/components/auth/auth-heading';
import { AuthPane } from '@/components/auth/auth-pane';
import { Field } from '@/components/auth/field';
import { OtpStep } from '@/components/auth/otp-step';
import { PasswordField } from '@/components/auth/password-field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { phoneNumber, signIn } from '@/lib/auth-client';

import { finalizeInviteAction, joinInviteAction } from './actions';

interface Props {
  token: string;
  orgName: string;
  phone: string;
  phoneDisplay: string;
  mode: 'existing' | 'new';
}

/**
 * Adaptive invite acceptance. `existing` → password (sign in) → join. `new` →
 * name + password → WhatsApp OTP → user created, password set, membership linked.
 */
export const InviteFlow = ({ token, orgName, phone, phoneDisplay, mode }: Props) => {
  const t = useTranslations('auth.invite');
  const tOtp = useTranslations('auth.otp');
  const tPwd = useTranslations('auth.password');
  const router = useRouter();

  const [busy, setBusy] = useState(false);
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [otpStep, setOtpStep] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');

  const invitedTo = t.rich('invitedTo', { org: orgName, em: titleEm });

  const submitExisting = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await signIn.phoneNumber({ phoneNumber: phone, password });
      if (res.error) return toast.error(tOtp('invalid'));
      const join = await joinInviteAction(token);
      if (!join.ok) return toast.error(join.error.message);
      toast.success(t('joined', { org: orgName }));
      router.push('/inicio');
    } finally {
      setBusy(false);
    }
  };

  const submitNewData = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) return;
    setBusy(true);
    try {
      const res = await phoneNumber.sendOtp({ phoneNumber: phone });
      if (res.error) return toast.error(tOtp('invalid'));
      setOtp('');
      setOtpError('');
      setOtpStep(true);
    } finally {
      setBusy(false);
    }
  };

  const verifyNew = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setOtpError('');
    try {
      const res = await phoneNumber.verify({ phoneNumber: phone, code: otp });
      if (res.error) {
        setOtpError(tOtp('invalid'));
        return;
      }
      const done = await finalizeInviteAction({ token, name, password });
      if (!done.ok) return toast.error(done.error.message);
      toast.success(t('joined', { org: orgName }));
      router.push('/inicio');
    } finally {
      setBusy(false);
    }
  };

  // ── Existing account ──
  if (mode === 'existing') {
    return (
      <AuthPane>
        <AuthHeading eyebrow={t('eyebrowExisting')} title={invitedTo} subtitle={t('existing.subtitle')} />
        <form onSubmit={submitExisting} className="space-y-4">
          <Field label={t('existing.phone')}>
            <Input value={phoneDisplay} disabled readOnly />
          </Field>
          <PasswordField label={t('existing.password')} value={password} onChange={setPassword} autoFocus />
          <Button type="submit" className="w-full" pending={busy}>
            {t('existing.submit')} <span aria-hidden>→</span>
          </Button>
        </form>
      </AuthPane>
    );
  }

  // ── New person ──
  return (
    <AuthPane>
      {!otpStep ? (
        <>
          <AuthHeading eyebrow={t('eyebrowNew')} title={invitedTo} subtitle={t('new.subtitle')} />
          <form onSubmit={submitNewData} className="space-y-4">
            <Field label={t('new.name')} htmlFor="inv-name">
              <Input id="inv-name" autoComplete="name" placeholder={t('new.namePlaceholder')} value={name} onChange={(ev) => setName(ev.target.value)} required />
            </Field>
            <PasswordField
              label={t('new.password')}
              hint={tPwd('minHint')}
              value={password}
              onChange={setPassword}
              placeholder={tPwd('placeholder')}
              autoComplete="new-password"
              showStrength
            />
            <Button type="submit" className="w-full" pending={busy}>
              {t('new.submit')} <span aria-hidden>→</span>
            </Button>
          </form>
        </>
      ) : (
        <>
          <AuthHeading
            eyebrow={tOtp('eyebrow')}
            title={tOtp.rich('title', { em: titleEm })}
            subtitle={
              <>
                {tOtp('sentTo')}{' '}
                <span className="rounded-full bg-bg-2 px-2.5 py-0.5 font-mono text-[13px] font-medium text-ink">{phoneDisplay}</span>
              </>
            }
          />
          <form onSubmit={verifyNew} className="space-y-5">
            <OtpStep
              value={otp}
              onChange={setOtp}
              onResend={async () => {
                await phoneNumber.sendOtp({ phoneNumber: phone });
              }}
              error={otpError}
            />
            <Button type="submit" className="w-full" pending={busy} disabled={otp.length < 6}>
              {tOtp('verify')} <span aria-hidden>→</span>
            </Button>
            <button type="button" onClick={() => setOtpStep(false)} className="mx-auto block text-[13px] font-medium text-terra hover:underline hover:underline-offset-2">
              ←
            </button>
          </form>
        </>
      )}
    </AuthPane>
  );
};
