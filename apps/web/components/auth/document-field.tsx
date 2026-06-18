'use client';

import { Input } from '@/components/ui/input';
import { maskCnpj, maskCpf } from '@/lib/masks';

import { Field } from './field';

/**
 * CPF/CNPJ input whose mask follows the selected profile type (ong → CNPJ,
 * protetor → CPF). The label/hint are passed in by the page because they change
 * with the type too.
 */
export const DocumentField = ({
  value,
  onChange,
  type,
  id = 'document',
  label,
  hint,
  error,
  required,
}: {
  value: string;
  onChange: (value: string) => void;
  type: 'ong' | 'protetor';
  id?: string;
  label: React.ReactNode;
  hint?: React.ReactNode;
  error?: string;
  required?: boolean;
}) => {
  const mask = type === 'ong' ? maskCnpj : maskCpf;
  return (
    <Field label={label} htmlFor={id} hint={hint} error={error}>
      <Input
        id={id}
        inputMode="numeric"
        placeholder={type === 'ong' ? '00.000.000/0000-00' : '000.000.000-00'}
        value={value}
        onChange={(e) => onChange(mask(e.target.value))}
        required={required}
      />
    </Field>
  );
};
