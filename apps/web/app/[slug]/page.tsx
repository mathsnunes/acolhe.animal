import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { PortalHeader } from '@/components/portal/portal-header';
import { PortalAnimalsBrowser } from '@/components/portal/portal-animals-browser';
import { PortalLivesChanged } from '@/components/portal/portal-lives-changed';
import { PortalFooter } from '@/components/portal/portal-footer';
import { getAllPortalAnimals, getPortalStats, getPublicOrganization, portalChrome } from './data';

type PageProps = { params: Promise<{ slug: string }> };

export const generateMetadata = async ({ params }: PageProps): Promise<Metadata> => {
  const { slug } = await params;
  const t = await getTranslations('portal');
  const org = await getPublicOrganization(slug);
  if (!org) return { title: t('metadata.portalNotFound') };

  const description = org.aboutText?.trim() || t('metadata.defaultDescription', { orgName: org.name });

  return {
    title: org.name,
    description,
    openGraph: {
      title: org.name,
      description,
      type: 'website',
      ...(org.coverUrl || org.logoUrl ? { images: [{ url: org.coverUrl ?? org.logoUrl! }] } : {}),
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

  const [animals, stats] = await Promise.all([
    showAnimals ? getAllPortalAnimals(org.pk) : Promise.resolve([]),
    getPortalStats(org.pk),
  ]);

  const { accentStyle, documentLabel, hasAbout } = portalChrome(org);

  return (
    <div className="min-h-dvh bg-bg" style={accentStyle}>
      {/* ── Top header — logo + section nav, sticky; the animals are the focus ─ */}
      <PortalHeader slug={slug} orgName={org.name} logoUrl={org.logoUrl} showAbout={hasAbout} />

      {/* ── Animals — start immediately ──────────────────────────────────────── */}
      <main id="animais" className="mx-auto max-w-5xl px-6 py-12 sm:py-14">
        {showAnimals &&
          (animals.length === 0 ? (
            <div className="rounded-xl border border-line-soft bg-paper px-6 py-16 text-center">
              <p className="display text-2xl text-ink">{t('available.emptyTitle')}</p>
              <p className="mt-3 text-sm text-ink-soft">{t('available.emptyDescription', { orgName: org.name })}</p>
            </div>
          ) : (
            <>
              <p className="eyebrow mb-8">{t('available.eyebrow')}</p>
              <PortalAnimalsBrowser slug={slug} items={animals} />
            </>
          ))}
      </main>

      {/* ── Lives changed — social proof ───────────────────────────────────── */}
      <PortalLivesChanged count={stats.adoptionsCount} animals={stats.recent} />

      {/* ── About — the org's identity, anchored for the header/footer nav ───── */}
      {hasAbout && (
        <section id="sobre" className="border-t border-line-soft bg-paper">
          <div className="mx-auto max-w-3xl px-6 py-16 text-center">
            <p className="eyebrow eyebrow-mute mb-4">{t('nav.about')}</p>
            <h2 className="display text-3xl text-ink sm:text-4xl">{org.name}</h2>
            <p className="mt-5 text-lg leading-relaxed text-ink-soft">{org.aboutText}</p>
          </div>
        </section>
      )}

      {/* ── Footer — org identity, links, made-with ────────────────────────── */}
      <PortalFooter
        orgName={org.name}
        documentLabel={documentLabel}
        instagram={org.portalConfig?.instagram}
        showAbout={hasAbout}
      />
    </div>
  );
}
