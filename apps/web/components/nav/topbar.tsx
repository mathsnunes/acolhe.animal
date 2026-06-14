'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Bell, Plus, Search } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { NAV_GROUPS, type NavCounts } from './nav-config';

/**
 * Desktop topbar (64px) — global actions on the right: search · notifications ·
 * contextual CTA (04-componentes-navegacao.md). The page hero lives in the
 * content below, so the topbar's left stays empty on listing screens. Hidden on
 * mobile (the bottom nav + mobile header cover that).
 */
export const Topbar = ({ counts }: { counts: NavCounts }) => {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const [searchOpen, setSearchOpen] = useState(false);

  const newApplications = counts.newApplications ?? 0;
  // Contextual primary CTA, declared per-section in nav-config (so a new section
  // with a create button doesn't need a topbar edit).
  const activeSection = NAV_GROUPS.flat().find(
    (item) => item.createHref && pathname.startsWith(item.href),
  );
  const cta =
    activeSection?.createHref && activeSection.createLabelKey
      ? { href: activeSection.createHref, label: t(activeSection.createLabelKey) }
      : null;

  return (
    <header className="sticky top-0 z-30 hidden h-topbar items-center justify-end gap-2 border-b border-line bg-paper px-8 lg:flex">
      <button
        onClick={() => setSearchOpen(true)}
        aria-label={t('topbar.search')}
        className="flex size-9 items-center justify-center rounded-full text-ink-soft transition hover:bg-bg-2"
      >
        <Search className="size-[18px]" strokeWidth={1.6} />
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            aria-label={t('topbar.notifications')}
            className="relative flex size-9 items-center justify-center rounded-full text-ink-soft transition hover:bg-bg-2"
          >
            <Bell className="size-[18px]" strokeWidth={1.6} />
            {newApplications > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full border-[1.5px] border-paper bg-terra px-1 text-[9.5px] font-semibold leading-none text-paper">
                {newApplications > 9 ? '9+' : newApplications}
              </span>
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72">
          <div className="px-2 py-1.5">
            <p className="eyebrow mb-2">— {t('topbar.notifications')}</p>
            {newApplications > 0 ? (
              <Link
                href="/candidatos"
                className="block rounded-md p-2 text-sm text-ink hover:bg-bg-2"
              >
                {t('topbar.newApplications', { count: newApplications })}
              </Link>
            ) : (
              <p className="p-2 text-sm text-ink-mute">{t('topbar.noNotifications')}</p>
            )}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      {cta && (
        <Button asChild size="sm">
          <Link href={cta.href}>
            <Plus className="size-4" />
            {cta.label}
          </Link>
        </Button>
      )}

      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="top-[20%] translate-y-0">
          <DialogHeader>
            <DialogTitle className="sr-only">{t('topbar.search')}</DialogTitle>
          </DialogHeader>
          <Input autoFocus placeholder={t('topbar.searchPlaceholder')} />
          <p className="mt-2 text-xs text-ink-mute">{t('topbar.searchComingSoon')}</p>
        </DialogContent>
      </Dialog>
    </header>
  );
};
