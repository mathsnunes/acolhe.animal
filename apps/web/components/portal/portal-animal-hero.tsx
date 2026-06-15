import Link from 'next/link';
import { useTranslations } from 'next-intl';

import type { Animal } from '@acolhe-animal/db';

import { Button } from '@/components/ui/button';
import { AnimalPhoto } from './animal-photo';
import { animalMeta } from './labels';

/**
 * The hero of the public animal page: photo + name + meta + story + adopt CTA.
 * Shared between the real portal detail page and the admin wizard's review
 * preview, so both stay identical. `preview` drops the navigation/CTA target.
 */
export const PortalAnimalHero = ({
  slug,
  animal,
  photoUrl,
  preview = false,
}: {
  slug: string;
  animal: Pick<Animal, 'id' | 'name' | 'species' | 'sex' | 'size' | 'shortStory' | 'quirks'>;
  photoUrl?: string | null;
  preview?: boolean;
}) => {
  const t = useTranslations('portal');
  const meta = animalMeta(t, animal);

  return (
    <article className="overflow-hidden rounded-2xl border border-line-soft bg-paper shadow-card md:grid md:grid-cols-[0.85fr_1.15fr]">
      <div className="aspect-[4/5] overflow-hidden bg-bg-2 md:aspect-auto">
        <AnimalPhoto src={photoUrl} name={animal.name} rounded="rounded-none" />
      </div>

      <div className="flex flex-col justify-center p-8 sm:p-10">
        <p className="eyebrow eyebrow-mute mb-3">{t('detail.available')}</p>
        <h1 className="display text-5xl text-ink sm:text-6xl">{animal.name}</h1>
        <p className="mt-4 flex flex-wrap gap-2 text-sm text-ink-soft">
          {meta.map((part, i) => (
            <span key={part} className="inline-flex items-center gap-2">
              {i > 0 && <span className="text-line">·</span>}
              {part}
            </span>
          ))}
        </p>

        {animal.shortStory?.trim() && (
          <p className="mt-6 border-t border-line-soft pt-6 font-display text-lg italic leading-relaxed text-ink-soft">
            {animal.shortStory}
          </p>
        )}

        {animal.quirks?.trim() && (
          <p className="mt-4 text-sm leading-relaxed text-ink-soft">{animal.quirks}</p>
        )}

        {preview ? (
          <Button size="lg" className="mt-8 w-full sm:w-auto" disabled>
            {t('detail.adoptCta', { animalName: animal.name })}
          </Button>
        ) : (
          <Button asChild size="lg" className="mt-8 w-full sm:w-auto">
            <Link href={`/${slug}/adotar/${animal.id}`}>{t('detail.adoptCta', { animalName: animal.name })}</Link>
          </Button>
        )}
      </div>
    </article>
  );
};
