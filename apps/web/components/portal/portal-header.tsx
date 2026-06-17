import Link from 'next/link';
import { useTranslations } from 'next-intl';

/**
 * The portal's top header: org logo (or name) on the left, section navigation
 * on the right. Sticky so it stays available while scrolling the animals.
 * Links are absolute (`/[slug]#…`) so the same header works on the home page
 * and on the animal detail page — clicking a section always lands on home.
 *
 * Donation-portal items (Campanhas, Transparência, Apoiar) are intentionally
 * absent until that pillar ships; only links with a real destination show.
 */
export const PortalHeader = ({
  slug,
  orgName,
  logoUrl,
  showAbout,
}: {
  slug: string;
  orgName: string;
  logoUrl?: string | null;
  showAbout: boolean;
}) => {
  const t = useTranslations('portal');

  return (
    <header className="sticky top-0 z-30 border-b border-line-soft bg-paper/90 backdrop-blur supports-[backdrop-filter]:bg-paper/80">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-3 sm:py-3.5">
        <Link href={`/${slug}`} className="flex items-center transition-opacity hover:opacity-80">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={orgName} className="h-12 w-auto max-w-[240px] object-contain sm:h-14" />
          ) : (
            <span className="display text-2xl text-ink sm:text-3xl">{orgName}</span>
          )}
        </Link>

        <nav className="flex items-center gap-5 text-sm text-ink-soft sm:gap-7">
          <a href={`/${slug}#animais`} className="transition-colors hover:text-ink">
            {t('nav.animals')}
          </a>
          {showAbout && (
            <a href={`/${slug}#sobre`} className="transition-colors hover:text-ink">
              {t('nav.about')}
            </a>
          )}
        </nav>
      </div>
    </header>
  );
};
