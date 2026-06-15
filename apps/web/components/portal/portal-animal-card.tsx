import Link from 'next/link';
import { useTranslations } from 'next-intl';

import type { Animal } from '@acolhe-animal/db';

import { cn } from '@/lib/utils';
import { AnimalPhoto } from './animal-photo';
import { animalMeta } from './labels';

/**
 * One animal on the public portal grid: photo, name, a short story snippet, the
 * species/sex/size meta line, and a terra "Quero adotar" affordance. The whole
 * card is a link to the public detail page.
 *
 * `preview` renders the same visual without the link — used by the admin wizard
 * to show exactly how the card will look on the portal (single source of truth).
 */
export const PortalAnimalCard = ({
  slug,
  animal,
  photoUrl,
  preview = false,
}: {
  slug: string;
  animal: Pick<Animal, 'id' | 'name' | 'species' | 'sex' | 'size' | 'shortStory'>;
  photoUrl?: string | null;
  preview?: boolean;
}) => {
  const t = useTranslations('portal');
  const meta = animalMeta(t, animal);

  const className = cn(
    'group flex flex-col overflow-hidden rounded-xl border border-line-soft bg-paper shadow-card',
    !preview && 'transition hover:-translate-y-0.5 hover:shadow-elevated',
  );

  const content = (
    <>
      <div className="aspect-[4/5] overflow-hidden bg-bg-2">
        <AnimalPhoto
          src={photoUrl}
          name={animal.name}
          rounded="rounded-none"
          className={preview ? undefined : 'transition duration-500 group-hover:scale-[1.03]'}
        />
      </div>

      <div className="flex flex-1 flex-col p-5">
        <p className="eyebrow eyebrow-mute mb-2 text-[10px]">{meta.join(' · ')}</p>
        <h3 className="display text-2xl text-ink">{animal.name}</h3>

        {animal.shortStory && (
          <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-ink-soft">{animal.shortStory}</p>
        )}

        <span className="eyebrow mt-4 inline-flex items-center gap-2 pt-1">
          {t('card.cta')}
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
