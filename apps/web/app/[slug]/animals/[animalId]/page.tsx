import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { BrandMark } from '@/components/brand';
import { PortalAnimalHero } from '@/components/portal/portal-animal-hero';
import { getPortalAnimal, getPublicOrganization } from '../../data';

type PageProps = { params: Promise<{ slug: string; animalId: string }> };

export const generateMetadata = async ({ params }: PageProps): Promise<Metadata> => {
  const { slug, animalId } = await params;
  const t = await getTranslations('portal');
  const org = await getPublicOrganization(slug);
  if (!org) return { title: t('metadata.portalNotFound') };
  const found = await getPortalAnimal(org.pk, animalId);
  if (!found) return { title: t('metadata.animalNotFound') };

  const description =
    found.animal.shortStory?.trim() ||
    t('metadata.animalDescription', { animalName: found.animal.name, orgName: org.name });

  return {
    title: t('metadata.animalDetailTitle', { animalName: found.animal.name, orgName: org.name }),
    description,
    openGraph: {
      title: t('metadata.animalOgTitle', { animalName: found.animal.name }),
      description,
      ...(found.photoUrl ? { images: [{ url: found.photoUrl }] } : {}),
    },
  };
};

export default async function AnimalDetailPage({ params }: PageProps) {
  const { slug, animalId } = await params;
  const t = await getTranslations('portal');
  const org = await getPublicOrganization(slug);
  if (!org) notFound();

  const found = await getPortalAnimal(org.pk, animalId);
  // Visibility controls whether the animal shows publicly at all; whether it
  // accepts candidacies only gates the adopt button (handled in the hero).
  if (!found || !found.animal.visibleOnPortal) {
    notFound();
  }

  const { animal, photoUrl } = found;

  return (
    <div className="min-h-dvh bg-bg">
      <nav className="border-b border-line-soft bg-paper">
        <div className="mx-auto flex max-w-4xl items-center gap-4 px-6 py-3">
          <Link
            href={`/${slug}`}
            className="inline-flex items-center gap-2 text-sm text-ink-mute transition hover:text-ink"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="size-3.5"
              aria-hidden="true"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
            {t('adopt.back')}
          </Link>
          <span className="h-4 w-px bg-line" />
          <span className="font-mono text-[11px] tracking-wide text-ink-mute">{org.name}</span>
        </div>
      </nav>

      <main className="mx-auto max-w-4xl px-6 py-10 sm:py-14">
        <PortalAnimalHero
          slug={slug}
          animal={animal}
          photoUrl={photoUrl}
          listedForAdoption={animal.listedForAdoption}
        />
      </main>

      <footer className="border-t border-line-soft bg-paper">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-3 px-6 py-10 text-center">
          <p className="display text-lg text-ink">{org.name}</p>
          <span className="inline-flex items-center gap-2 font-mono text-[11px] tracking-wider text-ink-mute">
            <span>{t('footer.madeWith')}</span>
            <BrandMark className="text-[13px]" />
          </span>
        </div>
      </footer>
    </div>
  );
}
