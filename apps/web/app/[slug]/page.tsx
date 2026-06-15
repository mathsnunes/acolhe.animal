import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { BrandMark } from '@/components/brand';
import { AnimalPhoto } from '@/components/portal/animal-photo';
import { PortalAnimalsGrid } from '@/components/portal/portal-animals-grid';
import { PORTAL_PAGE_SIZE } from '@/lib/portal-query';
import { getPortalAnimals, getPublicOrganization } from './data';

type PageProps = { params: Promise<{ slug: string }> };

export const generateMetadata = async ({ params }: PageProps): Promise<Metadata> => {
  const { slug } = await params;
  const t = await getTranslations('portal');
  const org = await getPublicOrganization(slug);
  if (!org) return { title: t('metadata.portalNotFound') };

  const description =
    org.aboutText?.trim() ||
    t('metadata.defaultDescription', { orgName: org.name });

  return {
    title: org.name,
    description,
    openGraph: {
      title: org.name,
      description,
      type: 'website',
      ...(org.coverUrl || org.logoUrl
        ? { images: [{ url: org.coverUrl ?? org.logoUrl! }] }
        : {}),
    },
  };
};

export default async function PortalPage({ params }: PageProps) {
  const { slug } = await params;
  const t = await getTranslations('portal');
  const org = await getPublicOrganization(slug);
  if (!org) notFound();

  const sections = org.portalConfig?.sections;
  const showAnimals = sections?.animals !== false; // animals on by default for MVP

  const animalsPage = showAnimals
    ? await getPortalAnimals(org.pk, { limit: PORTAL_PAGE_SIZE, offset: 0 })
    : { items: [], nextOffset: 0, hasMore: false };

  return (
    <div className="min-h-dvh bg-bg">
      {/* ── Hero ─────────────────────────────────────────────── */}
      <header className="relative overflow-hidden border-b border-line-soft bg-paper">
        {org.coverUrl && (
          <div className="absolute inset-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={org.coverUrl} alt="" className="size-full object-cover opacity-25" />
            <div className="absolute inset-0 bg-gradient-to-b from-paper/40 to-paper" />
          </div>
        )}

        <div className="relative mx-auto max-w-5xl px-6 py-16 sm:py-24">
          {org.logoUrl && (
            <div className="mb-6 size-16 overflow-hidden rounded-full border border-line bg-bg-2">
              <AnimalPhoto src={org.logoUrl} name={org.name} rounded="rounded-full" />
            </div>
          )}

          <p className="eyebrow mb-4">{t('hero.eyebrow')}</p>
          <h1 className="display max-w-3xl text-5xl text-ink sm:text-6xl">{org.name}</h1>

          {org.aboutText?.trim() && (
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-soft">
              {org.aboutText}
            </p>
          )}
        </div>
      </header>

      {/* ── Animais disponíveis ──────────────────────────────── */}
      <main className="mx-auto max-w-5xl px-6 py-16">
        {showAnimals && (
          <section aria-labelledby="disponiveis">
            <div className="mb-8">
              <p className="eyebrow mb-3">{t('available.eyebrow')}</p>
              <h2 id="disponiveis" className="display text-3xl text-ink sm:text-4xl">
                {t('available.titlePrefix')}<em>{t('available.titleEm')}</em>
              </h2>
            </div>

            {animalsPage.items.length === 0 ? (
              <div className="rounded-xl border border-line-soft bg-paper px-6 py-16 text-center">
                <p className="display text-2xl text-ink">
                  {t('available.emptyTitle')}
                </p>
                <p className="mt-3 text-sm text-ink-soft">
                  {t('available.emptyDescription', { orgName: org.name })}
                </p>
              </div>
            ) : (
              <PortalAnimalsGrid slug={slug} initial={animalsPage} />
            )}
          </section>
        )}
      </main>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="border-t border-line-soft bg-paper">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-3 px-6 py-12 text-center">
          <p className="display text-xl text-ink">{org.name}</p>
          <span className="inline-flex items-center gap-2 font-mono text-[11px] tracking-wider text-ink-mute">
            <span>{t('footer.madeWith')}</span>
            <BrandMark className="text-[13px]" />
          </span>
        </div>
      </footer>
    </div>
  );
}
