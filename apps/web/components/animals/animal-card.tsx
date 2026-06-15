import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { PawPrint, Users } from 'lucide-react';

import type { Animal } from '@acolhe-animal/db';
import { formatRelative } from '@acolhe-animal/shared';

import { cn } from '@/lib/utils';
import { animalListTags, formatMetaLine } from './labels';
import { statusLabel, statusMeta } from './status-pill';

/**
 * Compact animal card for the operational grid. Photo placeholder up top (upload
 * is out of scope), a floating status pill, name in Fraunces, the meta line, a
 * couple of tags and an intake footer. Hover lifts and warms the border —
 * prototype `animais_13.html` › `.animal-card`.
 */
export const AnimalCard = ({
  animal,
  waiting = 0,
  coverUrl,
}: {
  animal: Animal;
  waiting?: number;
  coverUrl?: string | null;
}) => {
  const t = useTranslations('animals');
  const meta = statusMeta[animal.status];
  const tags = animalListTags(t, animal);
  // Resuming a draft re-opens the wizard; published animals open their detail.
  const href = animal.status === 'draft' ? `/animais/${animal.id}/editar` : `/animais/${animal.id}`;

  return (
    <Link
      href={href}
      className={cn(
        'group flex flex-col overflow-hidden rounded-lg border border-line bg-paper',
        'transition duration-200 hover:-translate-y-0.5 hover:border-terra hover:shadow-card',
      )}
    >
      <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-bg-2">
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- user media on R2/local, not a known-size next/image asset
          <img src={coverUrl} alt={animal.name} loading="lazy" className="size-full object-cover" />
        ) : (
          <PawPrint className="size-14 text-ink-mute/50" aria-hidden />
        )}
        <span
          className={cn(
            'absolute left-2.5 top-2.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1',
            'border border-line bg-paper text-[10.5px] font-medium text-ink shadow-sm',
          )}
        >
          <span className={cn('size-1.5 rounded-full', meta.dot)} aria-hidden />
          {statusLabel(t, animal.status)}
        </span>

        {waiting > 0 && (
          <span className="absolute right-2.5 top-2.5 inline-flex items-center gap-1.5 rounded-full bg-terra px-2.5 py-1 text-[10.5px] font-medium text-paper shadow-sm">
            <Users className="size-3" strokeWidth={2} aria-hidden />
            {t('card.candidates', { count: waiting })}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col px-4 pb-4 pt-3.5">
        <h3 className="font-display text-[21px] font-normal leading-[1.1] tracking-tight text-ink">
          {animal.name}
        </h3>
        <p className="mt-1.5 text-[11.5px] leading-snug text-ink-mute">
          {formatMetaLine(t, animal)}
        </p>

        {tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span
                key={tag.text}
                className={cn(
                  'rounded-full px-2 py-[3px] text-[10px] font-medium tracking-wide',
                  tag.tone === 'green' ? 'bg-green/10 text-green' : 'bg-terra-bg text-terra',
                )}
              >
                {tag.text}
              </span>
            ))}
          </div>
        )}

        <div className="mt-auto flex items-center justify-between pt-3 text-[11px] text-ink-mute">
          <span>{t('card.intake', { date: formatRelative(animal.intakeDate) })}</span>
        </div>
      </div>
    </Link>
  );
};
