import { useTranslations } from 'next-intl';

import { formatRelative } from '@acolhe-animal/shared';
import type { TimelineEvent } from '@acolhe-animal/db';

import { cn } from '@/lib/utils';

/** Per-event metadata: the i18n text key and the dot accent (funnel temperature). */
const EVENT_META: Record<string, { textKey?: string; dot?: string }> = {
  'application.submitted': { textKey: 'applicationSubmitted', dot: 'border-terra bg-terra' },
  'application.assigned': { textKey: 'applicationAssigned' },
  'application.approved': { textKey: 'applicationApproved', dot: 'border-green-soft bg-green-soft' },
  'application.rejected': { textKey: 'applicationRejected', dot: 'border-ink-mute bg-ink-mute' },
  'adoption.completed': { textKey: 'adoptionCompleted', dot: 'border-green-soft bg-green-soft' },
  'adoption.cancelled': { dot: 'border-ink-mute bg-ink-mute' },
};

/** A quiet vertical history of what happened with this entity. */
export const EntityTimeline = ({ events }: { events: TimelineEvent[] }) => {
  const t = useTranslations('candidates');

  if (events.length === 0) {
    return <p className="text-sm text-ink-mute">{t('timeline.empty')}</p>;
  }

  const renderEvent = (event: TimelineEvent): string => {
    const payload = (event.payload ?? {}) as Record<string, unknown>;
    if (event.eventType === 'adoption.cancelled') {
      return typeof payload.reason === 'string'
        ? t('timeline.adoptionCancelledWithReason', { reason: payload.reason })
        : t('timeline.adoptionCancelled');
    }
    const key = EVENT_META[event.eventType]?.textKey;
    return key ? t(`timeline.${key}`) : event.eventType;
  };

  return (
    <ol className="relative ml-1.5 border-l border-line pl-6">
      {events.map((event) => {
        const dot = EVENT_META[event.eventType]?.dot ?? 'border-line bg-paper';
        return (
          <li key={event.id} className="relative pb-3.5 last:pb-0">
            <span
              className={cn(
                'absolute -left-[27px] top-1 size-2.5 rounded-full border-[1.5px]',
                dot,
              )}
              aria-hidden
            />
            <p className="text-[10.5px] uppercase tracking-wide text-ink-mute">
              {formatRelative(event.occurredAt)}
            </p>
            <p className="mt-0.5 text-[13px] leading-relaxed text-ink">{renderEvent(event)}</p>
          </li>
        );
      })}
    </ol>
  );
};
