import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { BrandMark } from '@/components/brand';
import { AdoptionForm } from '@/components/portal/adoption-form';
import { animalMeta } from '@/components/portal/labels';
import { getPortalAnimal, getPublicOrganization } from '../../data';

type PageProps = { params: Promise<{ slug: string; animalId: string }> };

export const generateMetadata = async ({ params }: PageProps): Promise<Metadata> => {
  const { slug, animalId } = await params;
  const t = await getTranslations('portal');
  const org = await getPublicOrganization(slug);
  if (!org) return { title: t('metadata.portalNotFound') };
  const found = await getPortalAnimal(org.pk, animalId);
  return {
    title: found
      ? t('metadata.applicationTitleWithAnimal', { animalName: found.animal.name, orgName: org.name })
      : t('metadata.applicationTitle'),
    robots: { index: false },
  };
};

export default async function AdoptPage({ params }: PageProps) {
  const { slug, animalId } = await params;
  const t = await getTranslations('portal');
  const org = await getPublicOrganization(slug);
  if (!org) notFound();

  const found = await getPortalAnimal(org.pk, animalId);
  if (!found || !found.animal.visibleOnPortal || !found.animal.listedForAdoption) {
    notFound();
  }

  const { animal, photoUrl } = found;
  const meta = animalMeta(t, animal).join(' · ');
  const story = animal.shortStory?.trim() || animal.quirks?.trim() || null;

  return (
    <div className="min-h-dvh bg-bg">
      <nav className="border-b border-line-soft bg-paper">
        <div className="mx-auto flex max-w-2xl items-center gap-4 px-5 py-3 sm:px-6">
          <Link
            href={`/${slug}/animais/${animalId}`}
            className="inline-flex items-center gap-2 text-sm text-ink-mute transition hover:text-ink"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-3.5" aria-hidden="true">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            {t('adopt.back')}
          </Link>
          <span className="h-4 w-px bg-line" />
          <span className="truncate font-mono text-[11px] tracking-wide text-ink-mute">{org.name}</span>
        </div>
      </nav>

      <AdoptionForm
        slug={slug}
        animalId={animal.id}
        animalName={animal.name}
        animalSpecies={animal.species}
        animalPhotoUrl={photoUrl}
        animalMeta={meta}
        animalStory={story}
      />

      <footer className="border-t border-line-soft bg-paper">
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-2 px-6 py-8 text-center">
          <p className="text-xs text-ink-mute">
            {t('adopt.footerDoubt', { orgName: org.name })}
          </p>
          <span className="inline-flex items-center gap-2 font-mono text-[10px] tracking-wider text-ink-mute">
            <span>{t('adopt.footerVia')}</span>
            <BrandMark className="text-[13px]" />
          </span>
        </div>
      </footer>
    </div>
  );
}
