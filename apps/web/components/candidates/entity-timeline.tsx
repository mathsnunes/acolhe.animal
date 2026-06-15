import { useTranslations } from 'next-intl';

import { formatRelative } from '@acolhe-animal/shared';
import type { TimelineEvent } from '@acolhe-animal/db';

import { cn } from '@/lib/utils';

/** Per-event metadata: the i18n text key and the dot accent (funnel temperature). */
const EVENT_META: Record<string, { textKey?: string; dot?: string }> = {
  'application.submitted': { textKey: 'applicationSubmitted', dot: 'border-terra bg-terra' },
  'application.assigned': { textKey: 'applicationAssigned' },
  'application.review_started': { dot: 'border-gold bg-gold' },
  'application.approved': { textKey: 'applicationApproved', dot: 'border-green-soft bg-green-soft' },
  'application.rejected': { textKey: 'applicationRejected', dot: 'border-ink-mute bg-ink-mute' },
  'application.withdrew': { textKey: 'withdrew', dot: 'border-ink-mute bg-ink-mute' },
  'application.adopted': { textKey: 'applicationAdopted', dot: 'border-green-soft bg-green-soft' },
  'application.cancelled': { dot: 'border-ink-mute bg-ink-mute' },
  'adoption.completed': { textKey: 'adoptionCompleted', dot: 'border-green-soft bg-green-soft' },
  'adoption.cancelled': { dot: 'border-ink-mute bg-ink-mute' },
};

/** A quiet vertical history of what happened with this entity. */
export const EntityTimeline = ({
  events,
  actorName,
}: {
  events: TimelineEvent[];
  /** Resolve who triggered an event (member name / candidate / system) for display. */
  actorName?: (event: TimelineEvent) => string | null;
}) => {
  const t = useTranslations('candidates');

  if (events.length === 0) {
    return <p className="text-sm text-ink-mute">{t('timeline.empty')}</p>;
  }

  const renderEvent = (event: TimelineEvent): string => {
    const payload = (event.payload ?? {}) as Record<string, unknown>;
    // Moving to "em avaliação" is phrased by where it came from.
    if (event.eventType === 'application.review_started') {
      if (payload.from === 'new') return t('timeline.reviewStarted');
      if (payload.from === 'approved') return t('timeline.returnedToReview');
      return t('timeline.reopened');
    }
    if (event.eventType === 'application.cancelled' || event.eventType === 'adoption.cancelled') {
      return typeof payload.reason === 'string'
        ? t('timeline.adoptionCancelledWithReason', { reason: payload.reason })
        : t('timeline.adoptionCancelled');
    }
    const key = EVENT_META[event.eventType]?.textKey;
    return key ? t(`timeline.${key}`) : event.eventType;
  };

  return (
    <ol className="flex flex-col">
      {events.map((event, i) => {
        const dot = EVENT_META[event.eventType]?.dot ?? 'border-line bg-paper';
        const isLast = i === events.length - 1;
        return (
          <li key={event.id} className="flex gap-3">
            {/* Rail: the node, then a connector that fills down to the next node
                (omitted on the last item, so the line never overshoots the ends). */}
            <div className="flex flex-col items-center">
              <span className={cn('mt-px size-2.5 shrink-0 rounded-full border-[1.5px]', dot)} aria-hidden />
              {!isLast && <span className="w-px flex-1 bg-line" aria-hidden />}
            </div>
            <div className="flex-1 pb-5 last:pb-0">
              <p className="text-[10.5px] uppercase tracking-[0.05em] text-ink-mute">
                {formatRelative(event.occurredAt)}
                {actorName?.(event) ? <span className="normal-case"> · {actorName(event)}</span> : null}
              </p>
              <p className="mt-1 text-[13px] leading-relaxed text-ink">{renderEvent(event)}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
};
