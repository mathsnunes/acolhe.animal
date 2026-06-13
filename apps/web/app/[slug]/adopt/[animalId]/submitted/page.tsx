import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { BrandMark } from '@/components/brand';
import { Button } from '@/components/ui/button';
import { getPortalAnimal, getPublicOrganization } from '../../../data';

type PageProps = { params: Promise<{ slug: string; animalId: string }> };

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('portal');
  return {
    title: t('metadata.submittedTitle'),
    robots: { index: false },
  };
}

export default async function SentPage({ params }: PageProps) {
  const { slug, animalId } = await params;
  const t = await getTranslations('portal');
  const org = await getPublicOrganization(slug);
  if (!org) notFound();

  const found = await getPortalAnimal(org.id, animalId);
  const animalName = found?.animal.name ?? t('submitted.fallbackAnimalName');

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <nav className="border-b border-line-soft bg-paper">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-3.5">
          <BrandMark />
          <span className="truncate font-mono text-[11px] tracking-wide text-ink-mute">{org.name}</span>
        </div>
      </nav>

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12 sm:py-16">
        {/* ── Hero ─────────────────────────────────────────────── */}
        <section className="text-center">
          <div className="mx-auto mb-7 flex size-16 items-center justify-center rounded-full bg-green shadow-elevated">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="size-7 text-paper" aria-hidden="true">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <p className="mb-5 inline-flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.25em] text-green">
            <span className="h-px w-4 bg-green" /> {t('submitted.eyebrow')} <span className="h-px w-4 bg-green" />
          </p>
          <h1 className="display text-4xl text-ink sm:text-5xl">
            {t.rich('submitted.title', {
              animalName,
              em: (chunks) => <em className="text-green">{chunks}</em>,
            })}
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-ink-soft">
            {t('submitted.lede', { orgName: org.name })}
          </p>
        </section>

        {/* ── Próximos passos ──────────────────────────────────── */}
        <section className="mt-14">
          <p className="eyebrow eyebrow-mute mb-3">{t('submitted.nextEyebrow')}</p>
          <h2 className="display text-3xl text-ink">
            {t('submitted.nextTitlePrefix')}<em>{t('submitted.nextTitleEm')}</em>{t('submitted.nextTitleSuffix')}
          </h2>

          <div className="mt-8 flex flex-col">
            <NextStep
              num="1"
              title={t('submitted.step1Title')}
              time={t('submitted.step1Time')}
            >
              {t('submitted.step1Body', { orgName: org.name })}
            </NextStep>
            <NextStep num="2" title={t('submitted.step2Title')} time={t('submitted.step2Time')}>
              {t('submitted.step2Body', { animalName })}
            </NextStep>
            <NextStep num="3" title={t('submitted.step3Title')} time={t('submitted.step3Time')}>
              {t('submitted.step3Body', { animalName })}
            </NextStep>
          </div>
        </section>

        {/* ── Dica ─────────────────────────────────────────────── */}
        <div className="mt-12 flex items-start gap-4 rounded-xl border border-terra bg-terra-bg px-6 py-5">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-terra">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="size-[18px] text-paper" aria-hidden="true">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
            </svg>
          </div>
          <div>
            <p className="font-display text-base font-medium text-ink">{t('submitted.tipTitle')}</p>
            <p className="mt-1 text-sm leading-relaxed text-ink-soft">
              {t('submitted.tipBody', { orgName: org.name })}
            </p>
          </div>
        </div>

        {/* ── Ações ────────────────────────────────────────────── */}
        <div className="mt-12 border-t border-line-soft pt-8 text-center">
          <p className="mb-6 font-display text-lg italic text-ink-soft">
            {t('submitted.thanks', { animalName })}
          </p>
          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href={`/${slug}`}>
                {t('submitted.backToOrg', { orgName: org.name })}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href={`/${slug}`}>{t('submitted.otherAnimals')}</Link>
            </Button>
          </div>
        </div>
      </main>

      <footer className="border-t border-line-soft bg-paper py-8 text-center">
        <span className="inline-flex items-center gap-2 font-mono text-[10px] tracking-wider text-ink-mute">
          <span>{t('submitted.footerVia')}</span>
          <BrandMark className="text-[13px]" />
        </span>
      </footer>
    </div>
  );
}

function NextStep({
  num,
  title,
  time,
  children,
}: {
  num: string;
  title: string;
  time: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 gap-2 border-b border-line-soft py-6 last:border-none sm:grid-cols-[64px_1fr] sm:gap-7">
      <span className="display text-5xl leading-none text-terra">{num}</span>
      <div className="pt-1">
        <h3 className="font-display text-xl text-ink">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">{children}</p>
        <p className="mt-2.5 font-mono text-[10.5px] uppercase tracking-[0.15em] text-ink-mute">{time}</p>
      </div>
    </div>
  );
}
