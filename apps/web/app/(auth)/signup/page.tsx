'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { normalizePhoneBR } from '@acolhe-animal/shared';

import { AuthHeading, titleEm } from '@/components/auth/auth-heading';
import { AuthModeTabs } from '@/components/auth/auth-mode-tabs';
import { AuthPane } from '@/components/auth/auth-pane';
import { CityCombobox } from '@/components/auth/city-combobox';
import { DocumentField } from '@/components/auth/document-field';
import { Field } from '@/components/auth/field';
import { PasswordField } from '@/components/auth/password-field';
import { PhoneField } from '@/components/auth/phone-field';
import { ProfileTypeToggle, type ProfileType } from '@/components/auth/profile-type-toggle';
import { OtpStep } from '@/components/auth/otp-step';
import { StepProgress } from '@/components/auth/step-progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { phoneNumber } from '@/lib/auth-client';

import { finalizeSignupAction } from './actions';

type Step = 'data' | 'otp' | 'org';

export default function SignupPage() {
  const t = useTranslations('auth.signup');
  const tOrg = useTranslations('auth.org');
  const tOtp = useTranslations('auth.otp');
  const tPwd = useTranslations('auth.password');
  const router = useRouter();

  const [step, setStep] = useState<Step>('data');
  const [busy, setBusy] = useState(false);

  // Step 1 — personal data
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [e164, setE164] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Step 2 — OTP
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');

  // Step 3 — organization
  const [profileType, setProfileType] = useState<ProfileType>('ong');
  const [orgName, setOrgName] = useState('');
  const [document, setDocument] = useState('');
  const [cityId, setCityId] = useState<string | null>(null);

  const steps = [t('steps.data'), t('steps.verification'), t('steps.org')];
  const stepIndex = step === 'data' ? 0 : step === 'otp' ? 1 : 2;

  const submitData = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = normalizePhoneBR(phone);
    if (!normalized) return toast.error(tOtp('invalid'));
    if (password.length < 8) return toast.error(t('data.password'));
    setBusy(true);
    try {
      const res = await phoneNumber.sendOtp({ phoneNumber: normalized });
      if (res.error) return toast.error(tOtp('invalid'));
      setE164(normalized);
      setOtp('');
      setOtpError('');
      setStep('otp');
    } finally {
      setBusy(false);
    }
  };

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setOtpError('');
    try {
      const res = await phoneNumber.verify({ phoneNumber: e164, code: otp });
      if (res.error) {
        setOtpError(tOtp('invalid'));
        return;
      }
      if (!orgName) setOrgName(name);
      setStep('org');
    } finally {
      setBusy(false);
    }
  };

  const resendOtp = async () => {
    const res = await phoneNumber.sendOtp({ phoneNumber: e164 });
    if (res.error) toast.error(tOtp('invalid'));
    else toast.success(tOtp('sent'));
  };

  const submitOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cityId) return toast.error(tOrg('city'));
    setBusy(true);
    try {
      const res = await finalizeSignupAction({
        password,
        ownerName: name,
        ownerEmail: email || undefined,
        profileType,
        orgName,
        document,
        cityId,
        phone: e164,
      });
      if (!res.ok) return toast.error(res.error.message);
      toast.success(t('created'));
      router.push('/inicio');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthPane slot={<AuthModeTabs current="signup" />}>
      <StepProgress steps={steps} current={stepIndex} />

      {step === 'data' ? (
        <>
          <AuthHeading eyebrow={t('data.eyebrow')} title={t.rich('data.title', { em: titleEm })} subtitle={t('data.subtitle')} />
          <form onSubmit={submitData} className="space-y-4">
            <Field label={t('data.name')} htmlFor="su-name">
              <Input id="su-name" autoComplete="name" placeholder={t('data.namePlaceholder')} value={name} onChange={(ev) => setName(ev.target.value)} required />
            </Field>
            <PhoneField id="su-phone" label={t('data.phone')} hint={t('data.phoneHint')} value={phone} onChange={setPhone} />
            <Field label={t('data.email')} htmlFor="su-email" hint={t('data.emailHint')}>
              <Input id="su-email" type="email" autoComplete="email" placeholder={t('data.emailPlaceholder')} value={email} onChange={(ev) => setEmail(ev.target.value)} />
            </Field>
            <PasswordField
              id="su-pass"
              label={t('data.password')}
              value={password}
              onChange={setPassword}
              placeholder={tPwd('placeholder')}
              autoComplete="new-password"
              showStrength
            />
            <Button type="submit" className="w-full" pending={busy}>
              {t('data.submit')} <span aria-hidden>→</span>
            </Button>
          </form>
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
          <form onSubmit={verifyOtp} className="space-y-5">
            <OtpStep value={otp} onChange={setOtp} onResend={resendOtp} error={otpError} />
            <Button type="submit" className="w-full" pending={busy} disabled={otp.length < 6}>
              {tOtp('verify')} <span aria-hidden>→</span>
            </Button>
            <button type="button" onClick={() => setStep('data')} className="mx-auto block text-[13px] font-medium text-terra hover:underline hover:underline-offset-2">
              ← {tOtp('changePhone')}
            </button>
          </form>
        </>
      ) : null}

      {step === 'org' ? (
        <>
          <AuthHeading eyebrow={t('org.eyebrow')} title={t.rich('org.title', { em: titleEm })} subtitle={t('org.subtitle')} />
          <form onSubmit={submitOrg} className="space-y-4">
            <Field label={tOrg('profileType')}>
              <ProfileTypeToggle value={profileType} onChange={setProfileType} />
            </Field>

            <Field label={profileType === 'ong' ? tOrg('nameOng') : tOrg('nameProtetor')} htmlFor="su-orgname">
              <Input id="su-orgname" placeholder={tOrg('namePlaceholder')} value={orgName} onChange={(ev) => setOrgName(ev.target.value)} required />
            </Field>

            <DocumentField
              value={document}
              onChange={setDocument}
              type={profileType}
              label={profileType === 'ong' ? tOrg('documentCnpj') : tOrg('documentCpf')}
              hint={profileType === 'ong' ? tOrg('documentHintOng') : tOrg('documentHintProtetor')}
              required={profileType === 'ong'}
            />

            <CityCombobox
              label={tOrg('city')}
              hint={tOrg('cityHint')}
              placeholder={tOrg('cityPlaceholder')}
              emptyLabel={tOrg('cityEmpty')}
              onChange={(c) => setCityId(c?.id ?? null)}
            />

            <p className="rounded-xl bg-terra-bg px-4 py-3.5 text-[12.5px] leading-relaxed text-ink-soft">
              {t.rich('org.privacy', { strong: (c) => <strong className="font-medium text-ink">{c}</strong> })}
            </p>

            <Button type="submit" className="w-full" pending={busy}>
              {t('org.submit')} <span aria-hidden>→</span>
            </Button>
          </form>
        </>
      ) : null}
    </AuthPane>
  );
}
