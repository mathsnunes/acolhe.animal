'use client';

import { useState } from 'react';
import { Instagram } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { BrandMark } from '@/components/brand';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

/**
 * Portal footer: org identity (name + document) on the left, content links
 * (Instagram, Sobre, Termos de adoção) in the middle, and the "made with
 * Acolhe.animal" credit on the right. The terms open a modal with the
 * responsible-adoption commitment — credibility for the adopter.
 */
export const PortalFooter = ({
  orgName,
  documentLabel,
  instagram,
  homeHref = '',
  showAbout = true,
}: {
  orgName: string;
  documentLabel: string | null;
  instagram?: string | null;
  /** Base path for the "Sobre" anchor — '' on the home page, '/[slug]' elsewhere. */
  homeHref?: string;
  /** Whether the org has an about section to link to. */
  showAbout?: boolean;
}) => {
  const t = useTranslations('portal');

  return (
    <footer className="border-t border-line-soft bg-paper">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-6 px-6 py-10 text-center md:flex-row md:justify-between md:gap-6 md:text-left">
        <p className="font-mono text-[11px] tracking-wide text-ink-mute">
          © {orgName}
          {documentLabel ? ` · ${documentLabel}` : ''}
        </p>

        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[13px] text-ink-soft">
          {instagram && (
            <a
              href={`https://instagram.com/${instagram}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 transition-colors hover:text-terra"
            >
              <Instagram className="size-4" aria-hidden /> Instagram
            </a>
          )}
          {showAbout && (
            <a href={`${homeHref}#sobre`} className="transition-colors hover:text-terra">
              {t('footer.about')}
            </a>
          )}
          <TermsDialog />
        </nav>

        <span className="inline-flex items-center gap-1.5 font-mono text-[11px] tracking-wide text-ink-mute">
          {t('footer.madeWith')} <BrandMark className="text-[13px]" />
        </span>
      </div>
    </footer>
  );
};

const TermsDialog = () => {
  const t = useTranslations('portal');
  const [open, setOpen] = useState(false);
  const bullets = Object.values(t.raw('terms.bullets') as Record<string, string>);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button type="button" className="transition-colors hover:text-terra">
          {t('terms.trigger')}
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('terms.title')}</DialogTitle>
          <DialogDescription>{t('terms.description')}</DialogDescription>
        </DialogHeader>
        <ul className="space-y-3">
          {bullets.map((b, i) => (
            <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-ink-soft">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-terra" aria-hidden />
              {b}
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
};
