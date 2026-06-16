'use client';

import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import { passwordStrength, type PasswordLevel } from '@acolhe-animal/shared';

import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

import { Field } from './field';

const LEVEL_COLOR: Record<PasswordLevel, string> = {
  weak: 'bg-rose',
  fair: 'bg-gold',
  good: 'bg-green-soft',
  strong: 'bg-green',
};

const StrengthMeter = ({ password }: { password: string }) => {
  const t = useTranslations('auth.password.strength');
  const { score, level } = useMemo(() => passwordStrength(password), [password]);

  return (
    <div className="mt-2 flex items-center gap-2">
      <div className="flex flex-1 gap-1">
        {[1, 2, 3, 4].map((segment) => (
          <span
            key={segment}
            className={cn('h-1 flex-1 rounded-full transition-colors', segment <= score ? LEVEL_COLOR[level] : 'bg-line')}
          />
        ))}
      </div>
      <span className="w-12 text-right text-[11px] text-ink-mute">{t(level)}</span>
    </div>
  );
};

/**
 * Password input with a show/hide toggle and an optional non-blocking strength
 * meter (shown while setting a new password). The minimum-8 rule is enforced by
 * the form's `passwordSchema`; the meter only nudges toward something stronger.
 */
export const PasswordField = ({
  value,
  onChange,
  id = 'password',
  label,
  hint,
  error,
  placeholder,
  autoComplete = 'current-password',
  showStrength = false,
  autoFocus,
  required = true,
}: {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  label: React.ReactNode;
  hint?: React.ReactNode;
  error?: string;
  placeholder?: string;
  autoComplete?: string;
  showStrength?: boolean;
  autoFocus?: boolean;
  required?: boolean;
}) => {
  const t = useTranslations('auth.password');
  const [visible, setVisible] = useState(false);

  return (
    <Field label={label} htmlFor={id} hint={hint} error={error}>
      <div className="relative">
        <Input
          id={id}
          type={visible ? 'text' : 'password'}
          className="pr-16"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          required={required}
          minLength={8}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-[12px] font-medium text-ink-mute transition-colors hover:bg-bg-2 hover:text-ink"
        >
          {visible ? t('hide') : t('show')}
        </button>
      </div>
      {showStrength && value ? <StrengthMeter password={value} /> : null}
    </Field>
  );
};
