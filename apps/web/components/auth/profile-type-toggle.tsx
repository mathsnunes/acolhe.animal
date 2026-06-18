'use client';

import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';

export type ProfileType = 'ong' | 'protetor';

/**
 * ONG formal (CNPJ) vs Protetor individual (CPF) selectable cards. Drives the
 * document mask and the name/document labels in the org signup step.
 */
export const ProfileTypeToggle = ({ value, onChange }: { value: ProfileType; onChange: (value: ProfileType) => void }) => {
  const t = useTranslations('auth.org');

  const option = (type: ProfileType, title: string, desc: string) => {
    const selected = value === type;
    return (
      <button
        type="button"
        onClick={() => onChange(type)}
        aria-pressed={selected}
        className={cn(
          'rounded-xl border px-4 py-3.5 text-left transition-all',
          selected
            ? 'border-terra bg-terra-bg ring-2 ring-terra/10'
            : 'border-line bg-paper hover:-translate-y-px hover:border-ink-mute/60',
        )}
      >
        <div className="text-sm font-medium text-ink">{title}</div>
        <div className="mt-0.5 text-[11.5px] leading-tight text-ink-mute">{desc}</div>
      </button>
    );
  };

  return (
    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
      {option('ong', t('ong.title'), t('ong.desc'))}
      {option('protetor', t('protetor.title'), t('protetor.desc'))}
    </div>
  );
};
