'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';

import { maskOtp } from '@/lib/masks';
import { cn } from '@/lib/utils';

/**
 * Shared 6-digit OTP entry: a large centered input, a resend countdown, and an
 * optional `extra` slot under the resend line (used by recovery for the
 * "send by email" fallback). The countdown starts on mount and restarts on
 * resend; the real cooldown is enforced server-side.
 */
export const OtpStep = ({
  value,
  onChange,
  onResend,
  cooldownSeconds = 60,
  error,
  extra,
}: {
  value: string;
  onChange: (value: string) => void;
  onResend: () => Promise<void> | void;
  cooldownSeconds?: number;
  error?: string;
  extra?: React.ReactNode;
}) => {
  const t = useTranslations('auth.otp');
  const [remaining, setRemaining] = useState(cooldownSeconds);

  useEffect(() => {
    if (remaining <= 0) return;
    const id = setInterval(() => setRemaining((r) => (r <= 1 ? 0 : r - 1)), 1000);
    return () => clearInterval(id);
  }, [remaining]);

  const handleResend = useCallback(async () => {
    await onResend();
    onChange('');
    setRemaining(cooldownSeconds);
  }, [onResend, onChange, cooldownSeconds]);

  return (
    <div className="space-y-1.5">
      <label htmlFor="otp" className="text-[13px] font-medium text-ink">
        {t('label')}
      </label>
      <div className="flex justify-center">
        <input
          id="otp"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          placeholder="000000"
          value={value}
          onChange={(e) => onChange(maskOtp(e.target.value))}
          autoFocus
          className={cn(
            'w-full max-w-xs rounded-xl border bg-paper px-3.5 py-4 text-center font-mono text-[28px] font-medium tracking-[0.4em] text-ink outline-none transition-all',
            'placeholder:text-ink-mute focus:border-terra focus:ring-2 focus:ring-terra/15',
            error ? 'border-rose' : 'border-line',
          )}
        />
      </div>

      {error ? <p className="text-center text-[12px] text-rose">{error}</p> : null}

      <div className="pt-2 text-center text-[13px] text-ink-mute">
        {remaining > 0 ? (
          <span>{t('resendIn', { seconds: remaining })}</span>
        ) : (
          <button type="button" onClick={handleResend} className="font-medium text-terra hover:underline hover:underline-offset-2">
            {t('resend')}
          </button>
        )}
      </div>

      {extra ? <div className="text-center text-[13px] text-ink-mute">{extra}</div> : null}
    </div>
  );
};
