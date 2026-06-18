import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Baby, Cat, Dog } from 'lucide-react';

import type { Animal } from '@acolhe-animal/db';

import { cn } from '@/lib/utils';
import { AnimalPhoto } from './animal-photo';
import { ageLabel, sexLabel, sizeLabel } from './labels';

/** Fields a portal card can use. The core few are required; the rest enrich it. */
type CardAnimal = Pick<Animal, 'id' | 'name' | 'species' | 'sex' | 'size' | 'shortStory'> &
  Partial<
    Pick<
      Animal,
      | 'estimatedBirthDate'
      | 'ageMonthsAtIntake'
      | 'ageReferenceDate'
      | 'specialConditions'
      | 'goodWithChildren'
      | 'goodWithDogs'
      | 'goodWithCats'
    >
  >;

/**
 * One animal on the public portal grid: photo (with special-condition tags),
 * the age/size/sex meta line, name, who it gets along with, a short story snippet
 * and a "Quero adotar" affordance. The whole card links to the public detail page.
 *
 * `preview` renders the same visual without the link — used by the admin wizard
 * to show exactly how the card will look on the portal (single source of truth).
 */
export const PortalAnimalCard = ({
  slug,
  animal,
  photoUrl,
  preview = false,
  listedForAdoption = true,
}: {
  slug: string;
  animal: CardAnimal;
  photoUrl?: string | null;
  preview?: boolean;
  listedForAdoption?: boolean;
}) => {
  const t = useTranslations('portal');

  const meta = [ageLabel(t, animal), sizeLabel(t, animal.size), sexLabel(t, animal.sex)].filter(Boolean);
  const tags = (animal.specialConditions ?? []).slice(0, 3);
  const goodWith = [
    animal.goodWithChildren === 'yes' && { Icon: Baby, label: t('card.goodWithChildren') },
    animal.goodWithDogs === 'yes' && { Icon: Dog, label: t('card.goodWithDogs') },
    animal.goodWithCats === 'yes' && { Icon: Cat, label: t('card.goodWithCats') },
  ].filter(Boolean) as { Icon: typeof Baby; label: string }[];

  const className = cn(
    'group flex flex-col overflow-hidden rounded-xl border border-line-soft bg-paper shadow-card',
    !preview && 'transition hover:-translate-y-0.5 hover:shadow-elevated',
  );

  const content = (
    <>
      <div className="relative aspect-[4/5] overflow-hidden bg-bg-2">
        <AnimalPhoto
          src={photoUrl}
          name={animal.name}
          rounded="rounded-none"
          className={preview ? undefined : 'transition duration-500 group-hover:scale-[1.03]'}
        />
        {tags.length > 0 && (
          <div className="absolute inset-x-3 top-3 flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-ink/75 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-paper backdrop-blur-sm"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        {meta.length > 0 && <p className="eyebrow eyebrow-mute mb-2 text-[10px]">{meta.join(' · ')}</p>}
        <h3 className="display text-2xl text-ink">{animal.name}</h3>

        {goodWith.length > 0 && (
          <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-ink-mute">
            {goodWith.map(({ Icon, label }) => (
              <span key={label} className="inline-flex items-center gap-1 text-[11px]">
                <Icon className="size-3.5" aria-hidden /> {label}
              </span>
            ))}
          </div>
        )}

        {animal.shortStory && (
          <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-ink-soft">{animal.shortStory}</p>
        )}

        <span className="eyebrow mt-4 inline-flex items-center gap-2 pt-1">
          {listedForAdoption ? t('card.cta') : t('card.ctaStoryOnly')}
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="size-3.5 transition-transform group-hover:translate-x-0.5"
            aria-hidden="true"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </span>
      </div>
    </>
  );

  if (preview) {
    return (
      <div className={className} aria-hidden>
        {content}
      </div>
    );
  }

  return (
    <Link href={`/${slug}/animais/${animal.id}`} className={className}>
      {content}
    </Link>
  );
};
