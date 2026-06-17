import { useTranslations } from 'next-intl';

import { AnimalPhoto } from './animal-photo';

interface AdoptedAnimal {
  id: string;
  name: string;
  photoUrl: string | null;
}

/**
 * "Vidas mudadas" — social proof for the org: the number of adoptions plus a
 * strip of recently adopted animals. Hidden entirely when there are none yet.
 */
export const PortalLivesChanged = ({ count, animals }: { count: number; animals: AdoptedAnimal[] }) => {
  const t = useTranslations('portal');
  if (count <= 0) return null;

  return (
    <section className="border-t border-line-soft bg-paper">
      <div className="mx-auto max-w-5xl px-6 py-16 text-center sm:py-20">
        <p className="eyebrow mb-3">{t('lives.eyebrow')}</p>
        <p className="display text-6xl leading-none text-ink sm:text-7xl">{count}</p>
        <p className="mt-3 text-lg text-ink-soft">{t('lives.subtitle')}</p>

        {animals.length > 0 && (
          <div className="mt-10 flex flex-wrap justify-center gap-x-4 gap-y-5">
            {animals.map((a) => (
              <div key={a.id} className="flex w-[68px] flex-col items-center gap-1.5">
                <div className="size-16 overflow-hidden rounded-full border border-line-soft bg-bg-2">
                  <AnimalPhoto src={a.photoUrl} name={a.name} rounded="rounded-full" />
                </div>
                <span className="w-full truncate text-center text-[11px] text-ink-mute">{a.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
