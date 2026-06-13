import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { formatRelative } from '@acolhe-animal/shared';
import { listAnimals, listApplications, listOrgTimeline } from '@acolhe-animal/domain';
import type { TimelineEvent } from '@acolhe-animal/db';

import { requireCtx } from '@/lib/auth-context';

export const dynamic = 'force-dynamic';

function str(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined;
}

export default async function InicioPage() {
  const ctx = await requireCtx();
  const [timeline, animals, applications] = await Promise.all([
    listOrgTimeline(ctx, 20),
    listAnimals(ctx),
    listApplications(ctx),
  ]);

  const available = animals.filter((a) => a.status === 'available').length;
  const waiting = applications.filter((a) => a.status === 'new' || a.status === 'in-progress').length;

  return <HomeView timeline={timeline} total={animals.length} available={available} waiting={waiting} />;
}

function HomeView({
  timeline,
  total,
  available,
  waiting,
}: {
  timeline: TimelineEvent[];
  total: number;
  available: number;
  waiting: number;
}) {
  const t = useTranslations('home');

  const eventText = (e: TimelineEvent): string => {
    const p = (e.payload ?? {}) as Record<string, unknown>;
    switch (e.eventType) {
      case 'animal.created':
        return str(p.name)
          ? t('events.animalCreated', { name: str(p.name)! })
          : t('events.animalCreatedFallback');
      case 'animal.archived':
        return t('events.animalArchived');
      case 'application.submitted':
        return t('events.applicationSubmitted');
      case 'application.approved':
        return t('events.applicationApproved');
      case 'application.rejected':
        return t('events.applicationRejected');
      case 'adoption.completed':
        return str(p.animalName) && str(p.adopterName)
          ? t('events.adoptionCompleted', {
              animalName: str(p.animalName)!,
              adopterName: str(p.adopterName)!,
            })
          : t('events.adoptionCompletedFallback');
      case 'adoption.cancelled':
        return t('events.adoptionCancelled');
      default:
        return e.eventType;
    }
  };

  return (
    <div className="px-6 py-8 sm:px-10">
      <p className="eyebrow mb-2">— {t('eyebrow')}</p>
      <h1 className="display text-4xl text-ink sm:text-5xl">
        {t.rich('greeting', { em: (chunks) => <em>{chunks}</em> })}
      </h1>

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Stat value={total} label={t('stats.activeAnimals')} href="/animais" />
        <Stat value={available} label={t('stats.available')} href="/animais" />
        <Stat value={waiting} label={t('stats.waitingCandidates')} href="/candidatos" />
      </div>

      <div className="divider my-8" />

      <p className="eyebrow mb-4">— {t('feed.title')}</p>
      {timeline.length === 0 ? (
        <p className="text-sm text-ink-soft">{t('feed.empty')}</p>
      ) : (
        <ul className="space-y-3">
          {timeline.map((e) => (
            <li key={e.id} className="flex items-baseline gap-3 text-sm">
              <span className="size-1.5 shrink-0 translate-y-1.5 rounded-full bg-terra" />
              <span className="text-ink">{eventText(e)}</span>
              <span className="ml-auto shrink-0 text-xs text-ink-mute">
                {formatRelative(e.occurredAt)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Stat({ value, label, href }: { value: number; label: string; href: string }) {
  return (
    <Link
      href={href}
      className="rounded-lg border border-line bg-paper p-5 shadow-card transition hover:-translate-y-0.5"
    >
      <div className="display text-4xl text-terra">{value}</div>
      <div className="eyebrow mt-1">— {label}</div>
    </Link>
  );
}
