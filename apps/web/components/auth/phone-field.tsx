'use client';

import { Input } from '@/components/ui/input';
import { maskPhoneBR } from '@/lib/masks';

import { Field } from './field';

/**
 * Controlled BR phone input with progressive masking. Holds the masked string;
 * callers normalize to E.164 via `phoneSchema` on submit.
 */
export const PhoneField = ({
  value,
  onChange,
  id = 'phone',
  label,
  hint,
  error,
  autoFocus,
  disabled,
  required = true,
}: {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  label: React.ReactNode;
  hint?: React.ReactNode;
  error?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  required?: boolean;
}) => (
  <Field label={label} htmlFor={id} hint={hint} error={error}>
    <Input
      id={id}
      type="tel"
      inputMode="tel"
      autoComplete="tel"
      placeholder="(48) 99999-0000"
      value={value}
      onChange={(e) => onChange(maskPhoneBR(e.target.value))}
      autoFocus={autoFocus}
      disabled={disabled}
      required={required}
    />
  </Field>
);
