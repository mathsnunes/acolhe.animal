'use client';

import { useMemo, useState, type ComponentType, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Baby, Cat, Dog } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { PortalAnimalItem } from '@/lib/portal-query';
import { ageGroupOf, type AgeGroup } from './labels';
import { PortalAnimalCard } from './portal-animal-card';

type SizeV = 'small' | 'medium' | 'large';
type SexV = 'male' | 'female';
type ConvV = 'children' | 'dogs' | 'cats';

const CONV_ICON: Record<ConvV, ComponentType<{ className?: string }>> = {
  children: Baby,
  dogs: Dog,
  cats: Cat,
};

/**
 * The portal's animal browser: a clean filter bar (porte / idade / sexo /
 * convivência) over the full available set, split into Cães and Gatos sections.
 * All client-side — the org's animals are loaded at once (capped), so filtering
 * and sectioning are instant.
 */
export const PortalAnimalsBrowser = ({ slug, items }: { slug: string; items: PortalAnimalItem[] }) => {
  const t = useTranslations('portal');
  const [sizes, setSizes] = useState<Set<SizeV>>(new Set());
  const [ages, setAges] = useState<Set<AgeGroup>>(new Set());
  const [sexes, setSexes] = useState<Set<SexV>>(new Set());
  const [conv, setConv] = useState<Set<ConvV>>(new Set());

  const toggle = <T,>(set: Set<T>, setSet: (s: Set<T>) => void, v: T) => {
    const next = new Set(set);
    if (next.has(v)) next.delete(v);
    else next.add(v);
    setSet(next);
  };
  const clearAll = () => {
    setSizes(new Set());
    setAges(new Set());
    setSexes(new Set());
    setConv(new Set());
  };
  const anyFilter = sizes.size > 0 || ages.size > 0 || sexes.size > 0 || conv.size > 0;

  const filtered = useMemo(
    () =>
      items.filter(({ animal: a }) => {
        if (sizes.size && (!a.size || !sizes.has(a.size as SizeV))) return false;
        if (ages.size) {
          const g = ageGroupOf(a);
          if (!g || !ages.has(g)) return false;
        }
        if (sexes.size && !sexes.has(a.sex as SexV)) return false;
        for (const c of conv) {
          const ok =
            c === 'children' ? a.goodWithChildren === 'yes' : c === 'dogs' ? a.goodWithDogs === 'yes' : a.goodWithCats === 'yes';
          if (!ok) return false;
        }
        return true;
      }),
    [items, sizes, ages, sexes, conv],
  );

  const dogs = filtered.filter((it) => it.animal.species === 'dog');
  const cats = filtered.filter((it) => it.animal.species === 'cat');

  return (
    <div>
      <div className="mb-12 flex flex-wrap items-center gap-x-2 gap-y-2.5">
        {(['small', 'medium', 'large'] as SizeV[]).map((v) => (
          <Chip key={v} active={sizes.has(v)} onClick={() => toggle(sizes, setSizes, v)}>
            {t(`filters.sizes.${v}`)}
          </Chip>
        ))}
        <Divider />
        {(['baby', 'adult', 'senior'] as AgeGroup[]).map((v) => (
          <Chip key={v} active={ages.has(v)} onClick={() => toggle(ages, setAges, v)}>
            {t(`filters.ages.${v}`)}
          </Chip>
        ))}
        <Divider />
        {(['male', 'female'] as SexV[]).map((v) => (
          <Chip key={v} active={sexes.has(v)} onClick={() => toggle(sexes, setSexes, v)}>
            {t(v === 'male' ? 'labels.sexMale' : 'labels.sexFemale')}
          </Chip>
        ))}
        <Divider />
        {(['children', 'dogs', 'cats'] as ConvV[]).map((v) => (
          <Chip key={v} active={conv.has(v)} onClick={() => toggle(conv, setConv, v)} icon={CONV_ICON[v]}>
            {t(`filters.convivencia.${v}`)}
          </Chip>
        ))}
        {anyFilter && (
          <button
            type="button"
            onClick={clearAll}
            className="ml-1 text-[13px] font-medium text-ink-mute underline-offset-4 hover:text-terra hover:underline"
          >
            {t('filters.clear')}
          </button>
        )}
      </div>

      {dogs.length === 0 && cats.length === 0 ? (
        <p className="rounded-xl border border-line-soft bg-paper px-6 py-12 text-center text-sm text-ink-soft">
          {t('filters.noResults')}
        </p>
      ) : (
        <div className="space-y-14">
          {dogs.length > 0 && <Section title={t('sections.dogs')} items={dogs} slug={slug} />}
          {cats.length > 0 && <Section title={t('sections.cats')} items={cats} slug={slug} />}
        </div>
      )}
    </div>
  );
};

const Section = ({ title, items, slug }: { title: string; items: PortalAnimalItem[]; slug: string }) => (
  <section>
    <h3 className="display mb-6 flex items-baseline gap-2.5 text-3xl text-ink">
      {title}
      <span className="text-base font-normal text-ink-mute">{items.length}</span>
    </h3>
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((it) => (
        <PortalAnimalCard
          key={it.animal.id}
          slug={slug}
          animal={it.animal}
          photoUrl={it.photoUrl}
          listedForAdoption={it.animal.listedForAdoption}
        />
      ))}
    </div>
  </section>
);

const Divider = () => <span className="mx-1 hidden h-5 w-px bg-line/70 sm:block" aria-hidden />;

const Chip = ({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon?: ComponentType<{ className?: string }>;
  children: ReactNode;
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    className={cn(
      'inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[13px] transition',
      active
        ? 'border-terra bg-terra-bg font-medium text-terra'
        : 'border-line bg-paper text-ink-soft hover:border-ink/40 hover:text-ink',
    )}
  >
    {Icon && <Icon className="size-3.5" />}
    {children}
  </button>
);
