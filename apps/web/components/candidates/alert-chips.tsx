import { useTranslations } from 'next-intl';
import { Check, TriangleAlert, Undo2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import type { CandidateAlert } from '@/lib/candidates-query';
import { cn } from '@/lib/utils';

type Tone = 'rose' | 'green' | 'mute';

const TONE_CLASS: Record<Tone, string> = {
  rose: 'bg-rose/15 text-rose',
  green: 'bg-green/10 text-green-soft',
  mute: 'bg-bg-2 text-ink-mute',
};

/** Resolve an alert to its label, tone and icon. Labels live under `candidates.alerts.*`. */
const useAlertView = () => {
  const t = useTranslations('candidates');
  return (alert: CandidateAlert): { label: string; tone: Tone; icon: LucideIcon } => {
    switch (alert.kind) {
      case 'stale':
        return { label: t('alerts.paradaXd', { days: alert.days }), tone: 'rose', icon: TriangleAlert };
      case 'multiple':
        return {
          label: t('alerts.candidataA', { animal: alert.animalName }),
          tone: 'rose',
          icon: TriangleAlert,
        };
      case 'adopted-before':
        return { label: t('alerts.jaAdotou'), tone: 'green', icon: Check };
      case 'returned-before':
        return { label: t('alerts.devolveuAntes'), tone: 'mute', icon: Undo2 };
    }
  };
};

/**
 * Compact attention chips for a candidacy (stale, multiple candidacies, adoption
 * history). Renders nothing when there are no alerts so callers can drop it inline
 * without guarding.
 */
export const AlertChips = ({
  alerts,
  className,
}: {
  alerts: CandidateAlert[];
  className?: string;
}) => {
  const alertView = useAlertView();
  if (alerts.length === 0) return null;
  return (
    <div className={cn('flex flex-wrap gap-1', className)}>
      {alerts.map((alert, i) => {
        const { label, tone, icon: Icon } = alertView(alert);
        return (
          <span
            key={`${alert.kind}-${i}`}
            className={cn(
              'inline-flex items-center gap-1 rounded-full py-0.5 pl-1.5 pr-2 text-[10.5px] font-medium leading-snug',
              TONE_CLASS[tone],
            )}
          >
            <Icon className="size-2.5 shrink-0" strokeWidth={1.8} aria-hidden />
            {label}
          </span>
        );
      })}
    </div>
  );
};
