import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { Pencil, PawPrint } from 'lucide-react';

import { getAnimal, listEntityTimeline } from '@acolhe-animal/domain';
import { formatRelative, isDomainError } from '@acolhe-animal/shared';
import type { Animal, TimelineEvent } from '@acolhe-animal/db';

import { DetailBreadcrumb } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { StatusPill } from '@/components/animals/status-pill';
import { ArchiveButton } from '@/components/animals/archive-button';
import {
  clinicalTypeLabel,
  energyLabel,
  formatAge,
  neuteredLabel,
  sexLabel,
  sizeLabel,
  sociabilityLabel,
  speciesLabel,
} from '@/components/animals/labels';
import type { Translator } from '@/lib/i18n';
import { requireCtx } from '@/lib/auth-context';
import { archiveAnimalAction, unarchiveAnimalAction } from '../actions';

export const dynamic = 'force-dynamic';

/** Timeline event types known to this view; falls back to the raw type. */
const EVENT_LABEL_KEYS = [
  'animal.created',
  'animal.archived',
  'animal.unarchived',
] as const;

export default async function AnimalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await requireCtx();
  const t = await getTranslations('animals');
  const { id } = await params;

  let animal: Animal;
  try {
    animal = await getAnimal(ctx, id);
  } catch (err) {
    if (isDomainError(err)) notFound();
    throw err;
  }

  const timeline = await listEntityTimeline(ctx, 'animal', id);
  const archived = animal.archivedAt != null;

  type SociabilityItem = {
    label: string;
    value: NonNullable<Animal['goodWithChildren']>;
  };
  const sociability: SociabilityItem[] = (
    [
      { label: t('detail.sociability.children'), value: animal.goodWithChildren ?? 'unknown' },
      { label: t('detail.sociability.dogs'), value: animal.goodWithDogs ?? 'unknown' },
      { label: t('detail.sociability.cats'), value: animal.goodWithCats ?? 'unknown' },
      { label: t('detail.sociability.strangers'), value: animal.goodWithStrangers ?? 'unknown' },
    ] satisfies SociabilityItem[]
  ).filter((s) => s.value !== 'unknown');

  return (
    <div className="mx-auto max-w-[1120px] px-6 pb-20 pt-7 sm:px-7">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <DetailBreadcrumb href="/animais" label={t('detail.breadcrumb')} />
        <div className="flex flex-wrap gap-2">
          <ArchiveButton
            archived={archived}
            action={
              archived
                ? unarchiveAnimalAction.bind(null, id)
                : archiveAnimalAction.bind(null, id)
            }
          />
          <Button asChild>
            <Link href={`/animais/${id}/editar`}>
              <Pencil /> {t('detail.edit')}
            </Link>
          </Button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-9 lg:grid-cols-[minmax(0,460px)_1fr]">
        {/* Photo placeholder */}
        <div className="flex aspect-[4/3] items-center justify-center self-start overflow-hidden rounded-2xl border border-line bg-bg-2">
          <PawPrint className="size-20 text-ink-mute/50" aria-hidden />
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill status={animal.status} className="px-3.5 py-1.5 text-[12px]" />
            {archived && (
              <span className="rounded-full bg-bg-2 px-3 py-1 text-xs font-medium text-ink-mute">
                {t('detail.archivedAt', { date: formatRelative(animal.archivedAt!) })}
              </span>
            )}
          </div>

          <h1 className="display mt-4 text-[44px] leading-none text-ink sm:text-[56px]">
            {animal.name}
          </h1>
          {animal.shortStory && (
            <p className="mt-2 max-w-xl font-display text-xl italic text-terra">
              {animal.shortStory}
            </p>
          )}

          {/* Quick-stats strip — bordered top + bottom (prototype `.detail-info__quick`). */}
          <dl className="my-6 flex flex-wrap gap-x-8 gap-y-5 border-y border-line py-5">
            <QuickStat label={t('detail.factSpecies')} value={speciesLabel(t, animal.species)} />
            <QuickStat label={t('detail.factSex')} value={sexLabel(t, animal.sex)} />
            <QuickStat label={t('detail.factAge')} value={formatAge(t, animal) ?? t('detail.empty')} />
            <QuickStat
              label={t('detail.factSize')}
              value={animal.size ? sizeLabel(t, animal.size) : t('detail.empty')}
            />
            <QuickStat label={t('detail.factNeutered')} value={neuteredLabel(t, animal.neutered)} />
            <QuickStat
              label={t('detail.factEnergy')}
              value={animal.energyLevel ? energyLabel(t, animal.energyLevel) : t('detail.empty')}
            />
            <QuickStat
              label={t('detail.factIntake')}
              value={formatRelative(animal.intakeDate)}
            />
          </dl>

          {sociability.length > 0 && (
            <div className="mt-8">
              <p className="eyebrow mb-3">{t('detail.sociabilityTitle')}</p>
              <div className="flex flex-wrap gap-2">
                {sociability.map((s) => (
                  <span
                    key={s.label}
                    className="rounded-full bg-bg-2 px-3 py-1 text-xs font-medium text-ink-soft"
                  >
                    {s.label}: {sociabilityLabel(t, s.value)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {animal.specialConditions.length > 0 && (
            <div className="mt-8">
              <p className="eyebrow mb-3">{t('detail.specialConditionsTitle')}</p>
              <div className="flex flex-wrap gap-2">
                {animal.specialConditions.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-terra-bg px-3 py-1 text-xs font-medium text-terra"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {animal.clinicalCondition && (
            <div className="mt-8">
              <p className="eyebrow mb-3">{t('detail.clinicalConditionTitle')}</p>
              <div className="rounded-lg border border-line-soft bg-bg-2/40 p-4">
                <span className="rounded-full bg-gold/15 px-3 py-1 text-xs font-medium text-gold">
                  {clinicalTypeLabel(t, animal.clinicalCondition.type)}
                </span>
                <p className="mt-2 text-sm text-ink-soft">
                  {animal.clinicalCondition.description}
                </p>
                {animal.clinicalCondition.needsSpecialAdopter && (
                  <p className="mt-2 text-xs text-terra">
                    {t('detail.needsSpecialAdopter')}
                  </p>
                )}
              </div>
            </div>
          )}

          {animal.quirks && (
            <div className="mt-8">
              <p className="eyebrow mb-2">{t('detail.quirksTitle')}</p>
              <p className="text-sm leading-relaxed text-ink-soft">{animal.quirks}</p>
            </div>
          )}
        </div>
      </div>

      {/* Timeline */}
      <div className="divider my-10" />
      <p className="eyebrow mb-4">{t('detail.timelineTitle')}</p>
      <Timeline events={timeline} t={t} />
    </div>
  );
}

/** Quick-stat cell in the detail hero strip: uppercase mute label, Fraunces value. */
function QuickStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="mb-1 whitespace-nowrap text-[10.5px] font-medium uppercase tracking-[0.18em] text-ink-mute">
        — {label}
      </dt>
      <dd className="font-display text-lg leading-snug text-ink">{value}</dd>
    </div>
  );
}

function Timeline({ events, t }: { events: TimelineEvent[]; t: Translator }) {
  if (events.length === 0) {
    return <p className="text-sm text-ink-soft">{t('detail.timelineEmpty')}</p>;
  }
  const known = new Set<string>(EVENT_LABEL_KEYS);
  return (
    <ul className="space-y-3">
      {events.map((event) => (
        <li key={event.id} className="flex items-baseline gap-3 text-sm">
          <span className="size-1.5 shrink-0 translate-y-1.5 rounded-full bg-terra" />
          <span className="text-ink">
            {known.has(event.eventType)
              ? t(`detail.events.${event.eventType}`)
              : event.eventType}
          </span>
          <span className="ml-auto shrink-0 text-xs text-ink-mute">
            {formatRelative(event.occurredAt)}
          </span>
        </li>
      ))}
    </ul>
  );
}
