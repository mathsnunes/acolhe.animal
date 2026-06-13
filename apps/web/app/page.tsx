import Link from 'next/link';
import { useTranslations } from 'next-intl';

/**
 * Root landing. In production the marketing site lives here; for the MVP it's a
 * simple hub linking to the admin login and the demo org's public portal.
 */
export default function HomePage() {
  const t = useTranslations('landing');
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center gap-10 px-6 py-20">
      <div>
        <p className="eyebrow mb-3">— {t('eyebrow')}</p>
        <h1 className="display text-5xl text-ink sm:text-6xl">
          Acolhe<span className="text-terra">.</span>animal
        </h1>
        <p className="mt-5 max-w-md text-ink-soft">{t('tagline')}</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/entrar"
          className="rounded-full bg-terra px-6 py-3 text-sm font-medium text-paper transition hover:brightness-95"
        >
          {t('enterPanel')}
        </Link>
        <Link
          href="/angeli-felice"
          className="rounded-full border border-line px-6 py-3 text-sm font-medium text-ink transition hover:bg-bg-2"
        >
          {t('viewExample')}
        </Link>
      </div>
    </main>
  );
}
