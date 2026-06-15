import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArrowRight, PawPrint } from 'lucide-react';

import type { Animal } from '@acolhe-animal/db';
import { formatDateBR } from '@acolhe-animal/shared';

import { formatAge, sizeLabel, speciesNounLabel } from '@/components/animals/labels';

/**
 * The animal a candidacy is for, as a side card: cover photo, gendered species
 * noun + age + size, intake date, the count of candidates competing for it, and a
 * link to the animal's record.
 */
export const AnimalSideCard = ({
  animal,
  coverUrl,
  waiting,
}: {
  animal: Animal;
  coverUrl: string | null;
  waiting: number;
}) => {
  const t = useTranslations('candidates');
  const ta = useTranslations('animals');

  const meta = [speciesNounLabel(ta, animal.species, animal.sex), formatAge(ta, animal), animal.size ? sizeLabel(ta, animal.size) : null]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="section-card overflow-hidden">
      <div className="flex h-40 items-center justify-center bg-bg-2 text-ink-mute">
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- user media on R2/local
          <img src={coverUrl} alt={animal.name} className="size-full object-cover" />
        ) : (
          <PawPrint className="size-10" strokeWidth={1.2} />
        )}
      </div>
      <div className="p-[18px]">
        <p className="eyebrow mb-2 flex items-center gap-2">
          <span className="size-1.5 rounded-full bg-green-soft" aria-hidden />
          {t('detail.animalCandidates', { count: waiting })}
        </p>
        <p className="display text-[26px] leading-none text-ink">{animal.name}</p>
        <p className="mt-2 text-[12.5px] leading-relaxed text-ink-soft">
          {meta}
          <br />
          {t('detail.naOngDesde', { date: formatDateBR(animal.intakeDate) })}
        </p>
        <Link
          href={`/animais/${animal.id}`}
          className="mt-3 inline-flex items-center gap-1 text-xs text-terra hover:underline"
        >
          {t('detail.animalLink')} <ArrowRight className="size-3" strokeWidth={2} />
        </Link>
      </div>
    </div>
  );
};
