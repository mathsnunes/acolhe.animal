import { useTranslations } from 'next-intl';
import { Check, Undo2, UserPlus } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

export interface CandidateSignals {
  isFirstCandidacy: boolean;
  adoptedBefore: boolean;
  returnedBefore: boolean;
}

type Tone = 'mute' | 'green' | 'terra';

/**
 * Derived "alertas e sinais" for the candidate detail — the signals we can infer
 * from history (first contact, adopted/returned before). Manual flags and
 * form-derived signals are out of scope. Renders nothing-to-flag gracefully.
 */
export const CandidateAlertsCard = ({ signals }: { signals: CandidateSignals }) => {
  const t = useTranslations('candidates');

  const rows: { key: string; tone: Tone; icon: LucideIcon }[] = [];
  if (signals.isFirstCandidacy) rows.push({ key: 'firstCandidacy', tone: 'mute', icon: UserPlus });
  if (signals.adoptedBefore) rows.push({ key: 'adoptedBefore', tone: 'green', icon: Check });
  if (signals.returnedBefore) rows.push({ key: 'returnedBefore', tone: 'terra', icon: Undo2 });

  const toneClass: Record<Tone, string> = {
    mute: 'text-ink-soft',
    green: 'text-green-soft',
    terra: 'text-terra',
  };

  return (
    <div className="section-card p-[18px]">
      <p className="eyebrow eyebrow-mute mb-3">{t('detail.alertsEyebrow')}</p>
      {rows.length === 0 ? (
        <p className="text-[12.5px] text-ink-mute">{t('detail.alertsEmpty')}</p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {rows.map(({ key, tone, icon: Icon }) => (
            <div key={key} className={cn('flex items-start gap-2.5 text-[12.5px] leading-snug', toneClass[tone])}>
              <Icon className="mt-0.5 size-3.5 shrink-0" strokeWidth={1.7} aria-hidden />
              <span>
                {t(`detail.alerts.${key}.title`)}
                <br />
                <span className="text-[11px] text-ink-mute">{t(`detail.alerts.${key}.meta`)}</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
