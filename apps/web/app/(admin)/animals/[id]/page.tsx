import type { ReactNode } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { AlertTriangle, ArrowRight, Pencil } from 'lucide-react';

import {
  countWaitingApplicationsByAnimal,
  getAnimal,
  listAnimalPhotos,
  listAnimalVideos,
  listEntityTimeline,
} from '@acolhe-animal/domain';
import { formatDateBR, formatRelative, isDomainError } from '@acolhe-animal/shared';
import type { Animal, TimelineEvent } from '@acolhe-animal/db';

import { DetailBreadcrumb } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { StatusPill } from '@/components/animals/status-pill';
import { AnimalActionsMenu } from '@/components/animals/animal-actions-menu';
import { AnimalGallery } from '@/components/animals/animal-gallery';
import {
  clinicalTypeLabel,
  energyLabel,
  formatAge,
  neuteredLabel,
  sizeLabel,
  sociabilityLabel,
  speciesNounLabel,
} from '@/components/animals/labels';
import type { Translator } from '@/lib/i18n';
import { requireCtx } from '@/lib/auth-context';
import { archiveAnimalAction, unarchiveAnimalAction } from '../actions';

export const dynamic = 'force-dynamic';

/** Timeline event types known to this view → their `detail.events.*` message key
 *  (next-intl forbids "." in keys, so eventType ids are mapped to camelCase). */
const EVENT_LABEL_KEY: Record<string, string> = {
  'animal.created': 'animalCreated',
  'animal.archived': 'animalArchived',
  'animal.unarchived': 'animalUnarchived',
};

/** Dot color per sociability value (mirrors the prototype's `.dot-*`). */
const SOCIABILITY_DOT: Record<NonNullable<Animal['goodWithChildren']>, string> = {
  yes: 'bg-green',
  'with-care': 'bg-gold',
  no: 'bg-rose',
  unknown: 'bg-ink-mute',
};

/** "abr · 2024" — short month + year for the intake quick-stat. */
const monthYear = (date: Date | string): string => {
  const d = new Date(date);
  const month = new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(d).replace('.', '');
  return `${month} · ${d.getFullYear()}`;
};

/** Vaccine dates are stored as `YYYY-MM-DD`; anchor to local midnight to avoid a tz
 *  shift, and fall back to the raw value when it isn't a parseable date. */
const formatVaccineDate = (date: string): string => {
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(`${date}T00:00:00`) : new Date(date);
  return Number.isNaN(parsed.getTime()) ? date : formatDateBR(parsed);
};

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

  const [timeline, photos, videos, waitingCounts] = await Promise.all([
    listEntityTimeline(ctx, 'animal', id),
    listAnimalPhotos(ctx, id),
    listAnimalVideos(ctx, id),
    countWaitingApplicationsByAnimal(ctx),
  ]);

  const archived = animal.archivedAt != null;
  const candidates = waitingCounts[id] ?? 0;

  // One narrative field today: short phrases live as the hero tagline, written-out
  // multi-paragraph stories render as the "história" section below. (Splitting into
  // a dedicated `story` column is a follow-up.)
  const story = animal.shortStory?.trim() ?? '';
  const longStory = story.length > 140 || story.includes('\n');
  const storyParagraphs = story
    .split(/\n{2,}|\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const weight = animal.weightKg ? `${Number(animal.weightKg)}kg` : null;
  const porte =
    [animal.size ? sizeLabel(t, animal.size) : null, weight].filter(Boolean).join(' · ') ||
    t('detail.empty');

  const behaviorItems = [
    { label: t('detail.sociability.children'), value: animal.goodWithChildren ?? 'unknown' },
    { label: t('detail.sociability.dogs'), value: animal.goodWithDogs ?? 'unknown' },
    { label: t('detail.sociability.cats'), value: animal.goodWithCats ?? 'unknown' },
    { label: t('detail.sociability.strangers'), value: animal.goodWithStrangers ?? 'unknown' },
  ] satisfies { label: string; value: NonNullable<Animal['goodWithChildren']> }[];

  const hasBehavior =
    animal.energyLevel != null ||
    (animal.quirks?.trim().length ?? 0) > 0 ||
    behaviorItems.some((b) => b.value !== 'unknown');

  return (
    <div className="mx-auto max-w-[1120px] px-6 pb-20 pt-7 sm:px-7">
      <DetailBreadcrumb href="/animais" label={t('detail.breadcrumb')} />

      {/* Hero — gallery + identity */}
      <div className="mt-4 grid grid-cols-1 gap-9 lg:grid-cols-[minmax(0,460px)_1fr]">
        <AnimalGallery photos={photos} videos={videos} name={animal.name} />

        <div>
          <div className="flex flex-wrap items-center gap-2">
            {animal.status === 'available' && !archived ? (
              <span className="inline-flex items-center gap-2 rounded-full bg-green/10 px-3.5 py-1.5 text-xs font-medium text-green">
                <span className="size-1.5 rounded-full bg-green" aria-hidden />
                {t('detail.availableForAdoption')}
              </span>
            ) : (
              <StatusPill status={animal.status} className="px-3.5 py-1.5 text-[12px]" />
            )}
            {archived && (
              <span className="rounded-full bg-bg-2 px-3 py-1 text-xs font-medium text-ink-mute">
                {t('detail.archivedAt', { date: formatRelative(animal.archivedAt!) })}
              </span>
            )}
          </div>

          <h1 className="display mt-4 text-[44px] leading-none text-ink sm:text-[56px]">
            {animal.name}
          </h1>
          {story && !longStory && (
            <p className="mt-2 max-w-xl font-display text-xl italic text-terra">{story}</p>
          )}

          {/* Quick-stats strip — bordered top + bottom (prototype `.detail-info__quick`). */}
          <dl className="my-6 flex flex-wrap gap-x-8 gap-y-5 border-y border-line py-5">
            <QuickStat
              label={t('detail.factSpecies')}
              value={speciesNounLabel(t, animal.species, animal.sex)}
            />
            <QuickStat label={t('detail.factAge')} value={formatAge(t, animal) ?? t('detail.empty')} />
            <QuickStat label={t('detail.factSize')} value={porte} />
            <QuickStat label={t('detail.factIntake')} value={monthYear(animal.intakeDate)} />
          </dl>

          <div className="mt-4 flex flex-wrap gap-2.5">
            <Button asChild>
              <Link href={`/animais/${id}/editar`}>
                <Pencil /> {t('detail.editFicha')}
              </Link>
            </Button>
            <AnimalActionsMenu
              archived={archived}
              action={
                archived
                  ? unarchiveAnimalAction.bind(null, id)
                  : archiveAnimalAction.bind(null, id)
              }
            />
          </div>
        </div>
      </div>

      {/* Candidates summary — only when there are waiting applications. */}
      {candidates > 0 && (
        <div className="mt-9 flex flex-wrap items-center justify-between gap-5 rounded-2xl border border-line bg-paper px-6 py-5">
          <div className="flex items-center gap-4">
            <span className="font-display text-[40px] font-light leading-none text-terra">
              {candidates}
            </span>
            <p className="text-[13.5px] text-ink">
              {t('detail.candidatesWaiting', { count: candidates })}
            </p>
          </div>
          <Button asChild>
            <Link href="/candidatos">
              {t('detail.viewCandidates')} <ArrowRight />
            </Link>
          </Button>
        </div>
      )}

      {/* Clinical banner — temporary health state that the adopter must know. */}
      {animal.clinicalCondition && (
        <div className="mt-6 flex items-start gap-3.5 rounded-xl bg-terra-bg px-5 py-4">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-terra" aria-hidden />
          <div>
            <p className="text-[13px] font-semibold text-terra">
              {clinicalTypeLabel(t, animal.clinicalCondition.type)}
            </p>
            <p className="mt-1 text-[13px] leading-relaxed text-ink">
              {animal.clinicalCondition.description}
              {animal.clinicalCondition.expectedResolution && (
                <span className="text-ink-soft">
                  {' '}
                  {t('detail.clinicalExpectedResolution', {
                    value: animal.clinicalCondition.expectedResolution,
                  })}
                </span>
              )}
            </p>
            {animal.clinicalCondition.needsSpecialAdopter && (
              <p className="mt-1.5 text-xs text-terra">{t('detail.needsSpecialAdopter')}</p>
            )}
          </div>
        </div>
      )}

      {/* Health + vaccines */}
      <div className="mt-9 grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <CardTitle>{t('detail.healthTitle')}</CardTitle>
          <dl className="grid grid-cols-[130px_1fr] gap-x-4 gap-y-2.5 text-[13px]">
            <dt className="text-ink-mute">{t('detail.factNeutered')}</dt>
            <dd className="font-medium text-ink">
              {animal.neutered ? neuteredLabel(t, animal.neutered) : t('detail.empty')}
            </dd>
            <dt className="text-ink-mute">{t('detail.healthSpecialConditions')}</dt>
            <dd className="font-medium text-ink">
              {animal.specialConditions.length > 0
                ? animal.specialConditions.join(', ')
                : t('detail.healthNoSpecialConditions')}
            </dd>
          </dl>
        </Card>

        <Card>
          <CardTitle>{t('detail.vaccinesTitle')}</CardTitle>
          {animal.vaccinations.length > 0 ? (
            <div className="mt-2.5 flex flex-col gap-2.5">
              {animal.vaccinations.map((v, i) => (
                <div
                  key={`${v.name}-${i}`}
                  className="flex items-center justify-between gap-3 rounded-[10px] bg-bg px-3.5 py-2.5 text-[13px]"
                >
                  <span className="font-medium text-ink">{v.name}</span>
                  <span className="shrink-0 text-[11.5px] text-ink-mute">
                    {formatVaccineDate(v.date)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="hint">{t('detail.vaccinesEmpty')}</p>
          )}
        </Card>
      </div>

      {/* Behavior */}
      {hasBehavior && (
        <section className="mt-9">
          <div className="mb-4 flex items-baseline justify-between gap-3">
            <h2 className="font-display text-[22px] leading-tight tracking-[-0.02em] text-ink">
              {t('detail.behaviorTitle')}
            </h2>
            <span className="eyebrow eyebrow-mute">{t('detail.behaviorEyebrow')}</span>
          </div>

          <Card>
            <dl className="grid grid-cols-[160px_1fr] gap-x-4 gap-y-2.5 text-[13px]">
              {animal.energyLevel && (
                <>
                  <dt className="text-ink-mute">{t('detail.behaviorEnergy')}</dt>
                  <dd className="font-medium text-ink">{energyLabel(t, animal.energyLevel)}</dd>
                </>
              )}
              {animal.quirks?.trim() && (
                <>
                  <dt className="text-ink-mute">{t('detail.behaviorQuirks')}</dt>
                  <dd className="font-medium text-ink">{animal.quirks}</dd>
                </>
              )}
            </dl>

            <div className="divider-soft my-[18px]" />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {behaviorItems.map((item) => (
                <div key={item.label} className="rounded-[10px] bg-bg px-3.5 py-3 text-[12.5px]">
                  <div className="mb-1 text-ink-mute">{item.label}</div>
                  <div className="flex items-center gap-1.5 font-medium text-ink">
                    <span
                      className={`size-2 rounded-full ${SOCIABILITY_DOT[item.value]}`}
                      aria-hidden
                    />
                    {sociabilityLabel(t, item.value)}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </section>
      )}

      {/* Story — the long-form narrative shown on the portal. */}
      {longStory && storyParagraphs.length > 0 && (
        <section className="mt-9">
          <div className="mb-4 flex items-baseline justify-between gap-3">
            <h2 className="font-display text-[22px] leading-tight tracking-[-0.02em] text-ink">
              {t('detail.storyTitle', { name: animal.name })}
            </h2>
            <span className="eyebrow eyebrow-mute">{t('detail.storyEyebrow')}</span>
          </div>
          <Card>
            <div className="space-y-3.5 text-sm leading-[1.7] text-ink-soft">
              {storyParagraphs.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </Card>
        </section>
      )}

      {/* Timeline */}
      <div className="divider my-10" />
      <p className="eyebrow mb-4">{t('detail.timelineTitle')}</p>
      <Timeline events={timeline} t={t} />
    </div>
  );
}

/** The white, hairline-bordered content card used across the detail sections. */
const Card = ({ children }: { children: ReactNode }) => (
  <div className="rounded-[14px] border border-line bg-paper p-6">{children}</div>
);

const CardTitle = ({ children }: { children: ReactNode }) => (
  <h3 className="mb-3.5 font-display text-[22px] tracking-[-0.02em] text-ink">{children}</h3>
);

/** Quick-stat cell in the detail hero strip: uppercase mute label, Fraunces value. */
const QuickStat = ({ label, value }: { label: string; value: string }) => (
  <div className="min-w-0">
    <dt className="mb-1 whitespace-nowrap text-[10.5px] font-medium uppercase tracking-[0.18em] text-ink-mute">
      — {label}
    </dt>
    <dd className="font-display text-lg leading-snug text-ink">{value}</dd>
  </div>
);

const Timeline = ({ events, t }: { events: TimelineEvent[]; t: Translator }) => {
  if (events.length === 0) {
    return <p className="text-sm text-ink-soft">{t('detail.timelineEmpty')}</p>;
  }
  return (
    <ul className="space-y-3">
      {events.map((event) => {
        const labelKey = EVENT_LABEL_KEY[event.eventType];
        return (
          <li key={event.id} className="flex items-baseline gap-3 text-sm">
            <span className="size-1.5 shrink-0 translate-y-1.5 rounded-full bg-terra" />
            <span className="text-ink">
              {labelKey ? t(`detail.events.${labelKey}`) : event.eventType}
            </span>
            <span className="ml-auto shrink-0 text-xs text-ink-mute">
              {formatRelative(event.occurredAt)}
            </span>
          </li>
        );
      })}
    </ul>
  );
};
