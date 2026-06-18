import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { PortalAnimalDetail } from '@/components/portal/portal-animal-detail';
import { PortalHeader } from '@/components/portal/portal-header';
import { PortalFooter } from '@/components/portal/portal-footer';
import { getPortalAnimal, getPublicOrganization, portalChrome } from '../../data';

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
  const org = await getPublicOrganization(slug);
  if (!org) notFound();

  const found = await getPortalAnimal(org.pk, animalId);
  // Visibility controls whether the animal shows publicly at all; whether it
  // accepts candidacies only gates the adopt button (handled in the detail).
  if (!found || !found.animal.visibleOnPortal) {
    notFound();
  }

  const { animal, photos, videos } = found;

  const { accentStyle, documentLabel, hasAbout } = portalChrome(org);

  return (
    <div className="flex min-h-dvh flex-col bg-bg" style={accentStyle}>
      {/* ── Same top header as the portal home, for a consistent shell ───────── */}
      <PortalHeader slug={slug} orgName={org.name} logoUrl={org.logoUrl} showAbout={hasAbout} />

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8 sm:py-10">
        <PortalAnimalDetail
          slug={slug}
          animal={animal}
          photos={photos}
          videos={videos}
          listedForAdoption={animal.listedForAdoption}
        />
      </main>

      <PortalFooter
        orgName={org.name}
        documentLabel={documentLabel}
        instagram={org.portalConfig?.instagram}
        homeHref={`/${slug}`}
        showAbout={hasAbout}
      />
    </div>
  );
}
