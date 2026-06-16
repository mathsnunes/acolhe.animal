'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { maskPhoneBR } from '@/lib/masks';
import { cn } from '@/lib/utils';

/** Warm, large-touch form primitives shared by the adoption-form steps. */

export const Field = ({
  label,
  required,
  hint,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
}) => <div className="flex flex-col gap-2">
      <span className="flex items-center gap-1.5 text-sm font-medium text-ink">
        {label}
        {required && <span className="text-[10px] leading-none text-terra">●</span>}
      </span>
      {children}
      {error ? (
        <span className="text-xs text-rose">{error}</span>
      ) : (
        hint && <span className="text-xs leading-relaxed text-ink-mute">{hint}</span>
      )}
    </div>;

/** A subtle "por que perguntamos" explainer block. */
export const FieldExplanation = ({ title, children }: { title: string; children: ReactNode }) => <div className="mt-1 rounded-r-md border-l-[3px] border-terra bg-terra-bg px-4 py-3 text-xs leading-relaxed text-ink-soft">
      <strong className="mb-0.5 block font-medium text-ink">{title}</strong>
      {children}
    </div>;

export type Option = { value: string; label: string; sub?: string };

/** Single-select grid of radio cards (large touch targets, single column on phones). */
export const RadioCards = ({
  name,
  options,
  value,
  onChange,
  columns = 2,
}: {
  name: string;
  options: Option[];
  value: string | undefined;
  onChange: (value: string) => void;
  columns?: 1 | 2;
}) => <div className={cn('grid gap-2.5', columns === 2 ? 'sm:grid-cols-2' : 'grid-cols-1')}>
      {options.map((opt) => {
        const selected = value === opt.value;
        return (
          <label
            key={opt.value}
            className={cn(
              'flex cursor-pointer items-center gap-3 rounded-lg border bg-bg px-4 py-3.5 transition',
              selected
                ? 'border-terra bg-terra-bg'
                : 'border-line hover:border-ink-mute hover:bg-paper',
            )}
          >
            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={selected}
              onChange={() => onChange(opt.value)}
              className="sr-only"
            />
            <span
              className={cn(
                'size-[18px] shrink-0 rounded-full border transition',
                selected ? 'border-[5px] border-terra' : 'border-[1.5px] border-line',
              )}
            />
            <span className="min-w-0">
              <span className="block text-sm text-ink">{opt.label}</span>
              {opt.sub && <span className="mt-0.5 block text-xs text-ink-mute">{opt.sub}</span>}
            </span>
          </label>
        );
      })}
    </div>;

/** Multi-select list of check items. */
export const CheckList = ({
  options,
  values,
  onChange,
}: {
  options: Option[];
  values: string[];
  onChange: (values: string[]) => void;
}) => {
  const toggle = (value: string) => {
    onChange(
      values.includes(value) ? values.filter((v) => v !== value) : [...values, value],
    );
  };

  return (
    <div className="flex flex-col gap-2">
      {options.map((opt) => {
        const selected = values.includes(opt.value);
        return (
          <label
            key={opt.value}
            className={cn(
              'flex cursor-pointer items-center gap-3 rounded-lg border bg-bg px-4 py-3 transition',
              selected
                ? 'border-terra bg-terra-bg'
                : 'border-line hover:border-ink-mute hover:bg-paper',
            )}
          >
            <input
              type="checkbox"
              checked={selected}
              onChange={() => toggle(opt.value)}
              className="sr-only"
            />
            <span
              className={cn(
                'flex size-[18px] shrink-0 items-center justify-center rounded border transition',
                selected ? 'border-terra bg-terra' : 'border-[1.5px] border-line',
              )}
            >
              {selected && (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  className="size-2.5 text-paper"
                  aria-hidden="true"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </span>
            <span className="flex-1 text-sm text-ink">{opt.label}</span>
          </label>
        );
      })}
    </div>
  );
};

/** Phone input with a fixed BR prefix, matching the prototype. */
export const PhoneInput = ({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}) => {
  const t = useTranslations('form');
  return (
    <div
      className={cn(
        'flex items-stretch overflow-hidden rounded-md border bg-bg transition focus-within:border-terra focus-within:ring-2 focus-within:ring-ring/30',
        error ? 'border-rose' : 'border-line',
      )}
    >
      <span className="flex items-center gap-1.5 border-r border-line bg-bg-2 px-4 font-mono text-sm text-ink-soft">
        🇧🇷 +55
      </span>
      <input
        type="tel"
        inputMode="tel"
        value={value}
        onChange={(e) => onChange(maskPhoneBR(e.target.value))}
        placeholder={t('phone.placeholder')}
        className="flex-1 bg-transparent px-4 py-3 text-base text-ink outline-none placeholder:text-ink-mute"
      />
    </div>
  );
};

/** Section heading inside a step (mono eyebrow with a terra rule). */
export const SectionTitle = ({ children }: { children: ReactNode }) => <div className="mb-5 flex items-center gap-2.5 font-mono text-[11px] uppercase tracking-[0.2em] text-ink-mute">
      <span className="h-px w-3.5 bg-terra" />
      {children}
    </div>;
