import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { BrandMark } from '@/components/brand';
import { Button } from '@/components/ui/button';
import { AnimalPhoto } from '@/components/portal/animal-photo';
import { animalMeta } from '@/components/portal/labels';
import { getPortalAnimal, getPublicOrganization } from '../../data';

type PageProps = { params: Promise<{ slug: string; animalId: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, animalId } = await params;
  const t = await getTranslations('portal');
  const org = await getPublicOrganization(slug);
  if (!org) return { title: t('metadata.portalNotFound') };
  const found = await getPortalAnimal(org.id, animalId);
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
}

export default async function AnimalDetailPage({ params }: PageProps) {
  const { slug, animalId } = await params;
  const t = await getTranslations('portal');
  const org = await getPublicOrganization(slug);
  if (!org) notFound();

  const found = await getPortalAnimal(org.id, animalId);
  if (!found || !found.animal.visibleOnPortal || !found.animal.listedForAdoption) {
    notFound();
  }

  const { animal, photoUrl } = found;
  const meta = animalMeta(t, animal);

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

            <Button asChild size="lg" className="mt-8 w-full sm:w-auto">
              <Link href={`/${slug}/adotar/${animal.id}`}>{t('detail.adoptCta', { animalName: animal.name })}</Link>
            </Button>
          </div>
        </article>
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
