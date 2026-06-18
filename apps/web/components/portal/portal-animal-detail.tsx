'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Baby, Cat, Dog, Play, Users, Video } from 'lucide-react';

import type { Animal } from '@acolhe-animal/db';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { AnimalPhoto } from './animal-photo';
import { ageLabel, energyLabel, neuteredLabel, sexLabel, sizeLabel, sociabilityLabel, speciesLabel } from './labels';

/** Everything the detail page can render — only `id/name/species/sex` are required. */
type DetailAnimal = Pick<Animal, 'id' | 'name' | 'species' | 'sex'> &
  Partial<
    Pick<
      Animal,
      | 'size'
      | 'shortStory'
      | 'quirks'
      | 'estimatedBirthDate'
      | 'ageMonthsAtIntake'
      | 'ageReferenceDate'
      | 'predominantColor'
      | 'weightKg'
      | 'microchipCode'
      | 'neutered'
      | 'vaccinations'
      | 'dewormings'
      | 'specialConditions'
      | 'energyLevel'
      | 'goodWithChildren'
      | 'goodWithDogs'
      | 'goodWithCats'
      | 'goodWithStrangers'
    >
  >;

const SOCIABILITY_DOT: Record<NonNullable<Animal['goodWithChildren']>, string> = {
  yes: 'bg-green',
  'with-care': 'bg-gold',
  no: 'bg-rose',
  unknown: 'bg-ink-mute',
};

/**
 * The public animal page: a photo gallery + identity hero, followed by rich
 * info blocks (characteristics, who it lives well with, health, quirks). Every
 * block is conditional, so a sparsely-filled animal still looks intentional
 * instead of leaving a void. `preview` drops the adopt link (admin wizard).
 */
/** Playable video on the public portal (lean shape; built server-side). */
export type PortalVideoItem = { id: string; src: string; poster: string | null };

export const PortalAnimalDetail = ({
  slug,
  animal,
  photos,
  videos = [],
  preview = false,
  listedForAdoption = true,
}: {
  slug: string;
  animal: DetailAnimal;
  photos: string[];
  videos?: PortalVideoItem[];
  preview?: boolean;
  listedForAdoption?: boolean;
}) => {
  const t = useTranslations('portal');

  const meta = [
    speciesLabel(t, animal.species),
    sexLabel(t, animal.sex),
    ageLabel(t, animal),
    animal.size ? sizeLabel(t, animal.size) : null,
  ].filter(Boolean);

  const conditions = animal.specialConditions ?? [];

  // ── Characteristics rows ───────────────────────────────────────────────────
  const facts: { label: string; value: ReactNode }[] = [];
  const age = ageLabel(t, animal);
  if (age) facts.push({ label: t('detail.factAge'), value: age });
  if (animal.size) facts.push({ label: t('detail.factSize'), value: sizeLabel(t, animal.size) });
  if (animal.predominantColor) facts.push({ label: t('detail.factColor'), value: animal.predominantColor });
  if (animal.weightKg) facts.push({ label: t('detail.factWeight'), value: `${Number(animal.weightKg)} kg` });
  if (animal.energyLevel) facts.push({ label: t('detail.factEnergy'), value: energyLabel(t, animal.energyLevel) });
  if (animal.microchipCode) facts.push({ label: t('detail.factMicrochip'), value: t('detail.yes') });

  // ── Sociability rows (skip unknown/undefined) ──────────────────────────────
  const living = (
    [
      ['goodWithChildren', Baby],
      ['goodWithDogs', Dog],
      ['goodWithCats', Cat],
      ['goodWithStrangers', Users],
    ] as const
  )
    .map(([key, Icon]) => ({ key, Icon, value: animal[key] }))
    .filter((r): r is { key: typeof r.key; Icon: typeof Baby; value: NonNullable<Animal['goodWithChildren']> } =>
      r.value != null && r.value !== 'unknown',
    );

  // ── Health rows ────────────────────────────────────────────────────────────
  const vaccines = (animal.vaccinations ?? []).map((v) => v.name).filter(Boolean);
  const dewormings = (animal.dewormings ?? []).length;
  const hasHealth = animal.neutered != null || vaccines.length > 0 || dewormings > 0 || conditions.length > 0;

  return (
    <div className="space-y-8">
      {/* ── Identity hero: gallery + name + story + CTA ──────────────────────── */}
      <article className="grid overflow-hidden rounded-3xl border border-line-soft bg-paper shadow-card lg:grid-cols-[1.05fr_1fr]">
        <Gallery photos={photos} videos={videos} name={animal.name} />

        <div className="flex flex-col justify-center gap-5 p-8 sm:p-10">
          <div>
            <p className="eyebrow eyebrow-mute mb-3">
              {listedForAdoption ? t('detail.available') : t('detail.adoptClosed')}
            </p>
            <h1 className="display text-5xl text-ink sm:text-6xl">{animal.name}</h1>
            {meta.length > 0 && <p className="mt-3 text-sm text-ink-soft">{meta.join(' · ')}</p>}
          </div>

          {conditions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {conditions.map((c) => (
                <span key={c} className="rounded-full bg-terra-bg px-3 py-1 text-xs font-medium text-terra">
                  {c}
                </span>
              ))}
            </div>
          )}

          {animal.shortStory?.trim() && (
            <p className="font-display text-lg italic leading-relaxed text-ink-soft">{animal.shortStory}</p>
          )}

          {preview || !listedForAdoption ? (
            <Button size="lg" className="mt-1 w-full sm:w-auto" disabled>
              {listedForAdoption ? t('detail.adoptCta', { animalName: animal.name }) : t('detail.adoptClosed')}
            </Button>
          ) : (
            <Button asChild size="lg" className="mt-1 w-full sm:w-auto">
              <Link href={`/${slug}/adotar/${animal.id}`}>{t('detail.adoptCta', { animalName: animal.name })}</Link>
            </Button>
          )}
          {!preview && !listedForAdoption && <p className="text-sm text-ink-soft">{t('detail.adoptClosedHint')}</p>}
        </div>
      </article>

      {/* ── Info blocks — only those with data ───────────────────────────────── */}
      <div className="grid gap-5 md:grid-cols-2">
        {facts.length > 0 && (
          <InfoCard title={t('detail.traitsTitle')}>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
              {facts.map((f) => (
                <div key={f.label}>
                  <dt className="text-[11px] uppercase tracking-wide text-ink-mute">{f.label}</dt>
                  <dd className="mt-0.5 text-[15px] text-ink">{f.value}</dd>
                </div>
              ))}
            </dl>
          </InfoCard>
        )}

        {living.length > 0 && (
          <InfoCard title={t('detail.livingTitle')}>
            <ul className="space-y-3">
              {living.map(({ key, Icon, value }) => (
                <li key={key} className="flex items-center justify-between gap-4">
                  <span className="inline-flex items-center gap-2.5 text-[15px] text-ink">
                    <Icon className="size-4 text-ink-mute" aria-hidden />
                    {t(`detail.with.${key}`)}
                  </span>
                  <span className="inline-flex items-center gap-2 text-sm text-ink-soft">
                    <span className={cn('size-2 rounded-full', SOCIABILITY_DOT[value])} aria-hidden />
                    {sociabilityLabel(t, value)}
                  </span>
                </li>
              ))}
            </ul>
          </InfoCard>
        )}

        {hasHealth && (
          <InfoCard title={t('detail.healthTitle')}>
            <dl className="space-y-3 text-[15px]">
              {animal.neutered != null && (
                <Row label={t('detail.factNeutered')} value={neuteredLabel(t, animal.neutered)} />
              )}
              {vaccines.length > 0 && <Row label={t('detail.vaccinesTitle')} value={vaccines.join(', ')} />}
              {dewormings > 0 && <Row label={t('detail.dewormingTitle')} value={t('detail.dewormingDone')} />}
              {conditions.length > 0 && <Row label={t('detail.specialTitle')} value={conditions.join(', ')} />}
            </dl>
          </InfoCard>
        )}

        {animal.quirks?.trim() && (
          <InfoCard title={t('detail.quirksTitle')}>
            <p className="text-[15px] leading-relaxed text-ink-soft">{animal.quirks}</p>
          </InfoCard>
        )}
      </div>
    </div>
  );
};

type MediaItem =
  | { kind: 'photo'; key: string; src: string }
  | { kind: 'video'; key: string; src: string; poster: string | null };

/**
 * Media gallery: a large active stage (photo or playable video) with a
 * thumbnail strip when there's more than one. Photos lead; videos follow with a
 * play badge and play in place when selected.
 */
const Gallery = ({ photos, videos, name }: { photos: string[]; videos: PortalVideoItem[]; name: string }) => {
  const [active, setActive] = useState(0);

  const media: MediaItem[] = [
    ...photos.map((src, i): MediaItem => ({ kind: 'photo', key: `p${i}`, src })),
    ...videos.map((v): MediaItem => ({ kind: 'video', key: v.id, src: v.src, poster: v.poster })),
  ];
  const current = media[active] ?? media[0] ?? null;

  return (
    <div className="relative bg-bg-2">
      <div className="aspect-[4/5] overflow-hidden sm:aspect-[4/3] lg:aspect-auto lg:h-full">
        {current?.kind === 'video' ? (
          <video
            key={current.key}
            src={current.src}
            poster={current.poster ?? undefined}
            controls
            playsInline
            preload="metadata"
            className="size-full bg-ink object-contain"
          />
        ) : (
          <AnimalPhoto src={current?.src ?? null} name={name} rounded="rounded-none" />
        )}
      </div>

      {media.length > 1 && (
        // Overlaid on the stage so the thumbnails stay visible even when the
        // media fills the hero's full height on desktop.
        <div className="absolute inset-x-0 bottom-0 flex gap-2 overflow-x-auto bg-gradient-to-t from-ink/45 to-transparent p-3">
          {media.map((item, i) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`${name} — ${i + 1}`}
              aria-pressed={i === active}
              className={cn(
                'relative size-14 shrink-0 overflow-hidden rounded-lg border-2 transition',
                i === active ? 'border-paper' : 'border-transparent opacity-80 hover:opacity-100',
              )}
            >
              {item.kind === 'video' && !item.poster ? (
                <span className="flex size-full items-center justify-center bg-ink/80">
                  <Video className="size-5 text-paper" aria-hidden />
                </span>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.kind === 'video' ? item.poster! : item.src} alt="" className="size-full object-cover" />
              )}
              {item.kind === 'video' && (
                <span className="absolute left-1/2 top-1/2 flex size-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-ink/70 text-paper backdrop-blur">
                  <Play className="size-3 translate-x-px fill-current" aria-hidden />
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const InfoCard = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="rounded-2xl border border-line-soft bg-paper p-6 sm:p-7">
    <h2 className="eyebrow eyebrow-mute mb-4">{title}</h2>
    {children}
  </section>
);

const Row = ({ label, value }: { label: string; value: ReactNode }) => (
  <div className="flex items-baseline justify-between gap-4">
    <dt className="text-ink-mute">{label}</dt>
    <dd className="text-right text-ink">{value}</dd>
  </div>
);
