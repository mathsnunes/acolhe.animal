import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { ArrowRight, PawPrint, Users } from 'lucide-react';

import type { Animal } from '@acolhe-animal/db';
import { formatDateBR } from '@acolhe-animal/shared';

import { cn } from '@/lib/utils';
import { statusLabel, statusMeta } from './status-pill';
import { animalListTags, formatAge, sizeLabel, speciesLabel } from './labels';

const COLS = 'lg:grid-cols-[56px_1.4fr_1fr_104px_132px_104px_24px]';

/**
 * List ("lista") variant of the animals listing — the table layout from
 * animais_13.html. On desktop it's a 7-column grid (photo · name · espécie·idade·porte
 * · status · candidatos · na casa desde · →); on mobile it collapses to a compact
 * row with the status + meta inline under the name.
 */
export const AnimalsTable = async ({
  animals,
  waiting,
  covers = {},
}: {
  animals: Animal[];
  waiting: Record<string, number>;
  /** Animal public id → cover thumbnail URL. */
  covers?: Record<string, string>;
}) => {
  const t = await getTranslations('animals');

  return (
    <div className="mt-7 px-6 sm:px-10">
      <div
        className={cn(
          'hidden items-center gap-4 border-b border-line px-4 pb-3 lg:grid',
          COLS,
        )}
      >
        <span />
        <ColHead>{t('list.colName')}</ColHead>
        <ColHead>{t('list.colSpecies')}</ColHead>
        <ColHead>{t('list.colStatus')}</ColHead>
        <ColHead>{t('list.colCandidates')}</ColHead>
        <ColHead>{t('list.colIntake')}</ColHead>
        <span />
      </div>

      {animals.map((a) => {
        const meta = [speciesLabel(t, a.species), formatAge(t, a), a.size ? sizeLabel(t, a.size) : null]
          .filter(Boolean)
          .join(' · ');
        const waitingCount = waiting[a.id] ?? 0;
        const tags = animalListTags(t, a);
        return (
          <Link
            key={a.id}
            href={a.status === 'draft' ? `/animais/${a.id}/editar` : `/animais/${a.id}`}
            aria-label={t('list.open', { name: a.name })}
            className={cn(
              'grid grid-cols-[56px_1fr] items-center gap-4 border-b border-line-soft px-4 py-3.5 transition-colors hover:bg-bg-2',
              COLS,
            )}
          >
            <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-bg-2 text-ink-mute">
              {covers[a.id] ? (
                // eslint-disable-next-line @next/next/no-img-element -- user media on R2/local
                <img src={covers[a.id]} alt={a.name} loading="lazy" className="size-full object-cover" />
              ) : (
                <PawPrint className="size-5" strokeWidth={1.5} />
              )}
            </div>

            <div className="min-w-0">
              <div className="truncate font-display text-[18px] leading-tight text-ink">{a.name}</div>
              {tags.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {tags.map((tag) => (
                    <span
                      key={tag.text}
                      className={cn(
                        'rounded-full px-2 py-[2px] text-[10px] font-medium',
                        tag.tone === 'green' ? 'bg-green/10 text-green' : 'bg-terra-bg text-terra',
                      )}
                    >
                      {tag.text}
                    </span>
                  ))}
                </div>
              )}
              {/* mobile-only status + meta (the dedicated columns are hidden < lg) */}
              <div className="mt-1 flex items-center gap-1.5 text-[11.5px] text-ink-mute lg:hidden">
                <span className={cn('size-[7px] shrink-0 rounded-full', statusMeta[a.status].dot)} />
                <span className="truncate">
                  {statusLabel(t, a.status)} · {meta}
                </span>
              </div>
            </div>

            <div className="hidden text-[11.5px] leading-snug text-ink-soft lg:block">{meta}</div>

            <div className="hidden items-center gap-1.5 text-[12px] text-ink-soft lg:flex">
              <span className={cn('size-[7px] shrink-0 rounded-full', statusMeta[a.status].dot)} />
              {statusLabel(t, a.status)}
            </div>

            <div className="hidden text-[12px] lg:block">
              {waitingCount > 0 ? (
                <span className="inline-flex items-center gap-1.5 font-medium text-terra">
                  <Users className="size-3.5" strokeWidth={2} />
                  {t('list.waiting', { count: waitingCount })}
                </span>
              ) : (
                <span className="text-ink-mute">{t('list.noCandidates')}</span>
              )}
            </div>

            <div className="hidden text-[11.5px] text-ink-mute lg:block">
              {formatDateBR(a.intakeDate)}
            </div>

            <ArrowRight className="hidden size-4 text-ink-mute lg:block" strokeWidth={1.75} />
          </Link>
        );
      })}
    </div>
  );
};

const ColHead = ({ children }: { children: React.ReactNode }) => <span className="text-[10.5px] font-medium uppercase tracking-[0.18em] text-ink-mute">
      {children}
    </span>;
