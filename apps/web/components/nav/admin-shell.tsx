'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, ExternalLink, MoreHorizontal, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, type ReactNode } from 'react';

import { initials } from '@acolhe-animal/shared';

import { BrandMark } from '@/components/brand';
import { cn } from '@/lib/utils';
import { Topbar } from './topbar';
import { BOTTOM_NAV, NAV_GROUPS, type NavCounts, type NavItem } from './nav-config';

export interface ShellOrg {
  name: string;
  slug: string;
  cityLabel?: string;
}
export interface ShellUser {
  name: string;
  role: 'admin' | 'volunteer';
}

interface AdminShellProps {
  org: ShellOrg;
  user: ShellUser;
  counts: NavCounts;
  children: ReactNode;
}

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function visibleItems(items: NavItem[], role: ShellUser['role']): NavItem[] {
  return items.filter((i) => !i.adminOnly || role === 'admin');
}

/** Circular initials avatar (org uses Fraunces, user uses sans). */
function InitialsAvatar({ name, variant }: { name: string; variant: 'org' | 'user' }) {
  return (
    <span
      className={cn(
        'flex size-7 shrink-0 items-center justify-center rounded-full text-[10px] font-medium uppercase text-paper',
        variant === 'org' ? 'bg-terra font-display' : 'bg-green',
      )}
    >
      {initials(name)}
    </span>
  );
}

function NavLink({ item, counts, pathname }: { item: NavItem; counts: NavCounts; pathname: string }) {
  const t = useTranslations('nav');
  const active = isActive(pathname, item.href);
  const count = item.countKey ? counts[item.countKey] : undefined;
  const pulse = item.pulseKey ? (counts[item.pulseKey] ?? 0) > 0 : false;
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'relative flex items-center gap-3 py-2.5 pl-[22px] pr-5 text-[13px] transition-colors',
        active ? 'bg-terra-bg font-medium text-ink' : 'text-ink-soft hover:bg-bg-2',
      )}
    >
      {active && <span className="absolute inset-y-0 left-0 w-[3px] bg-terra" />}
      <Icon className="size-4 shrink-0" strokeWidth={1.5} />
      <span className="flex-1">{t(item.labelKey)}</span>
      {pulse && <span className="size-2 rounded-full bg-terra animate-pulse-dot" aria-hidden />}
      {count != null && count > 0 && (
        <span className="rounded-full bg-green px-[7px] py-0.5 text-[10px] font-medium leading-none text-paper">
          {count}
        </span>
      )}
    </Link>
  );
}

function SidebarContent({
  org,
  user,
  counts,
  pathname,
}: {
  org: ShellOrg;
  user: ShellUser;
  counts: NavCounts;
  pathname: string;
}) {
  const t = useTranslations('nav');
  const tc = useTranslations('common');
  return (
    <>
      <div className="px-5 pb-4">
        <BrandMark />
      </div>
      <div className="divider-soft mx-4" />

      {/* Org switcher (context indicator — single org, no chevron action) */}
      <div className="px-4 my-3">
        <div className="flex w-full items-center gap-2.5 rounded-[10px] border border-line bg-bg-2 px-2.5 py-2">
          <InitialsAvatar name={org.name} variant="org" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-medium text-ink">{org.name}</div>
            {org.cityLabel && <div className="truncate text-[10px] text-ink-mute">{org.cityLabel}</div>}
          </div>
        </div>
      </div>
      <div className="divider-soft mx-4" />

      <nav className="flex-1 overflow-y-auto py-1">
        {NAV_GROUPS.map((group, gi) => {
          const items = visibleItems(group, user.role);
          if (!items.length) return null;
          return (
            <div key={gi}>
              {gi > 0 && <div className="divider-soft mx-4 my-2" />}
              {items.map((item) => (
                <NavLink key={item.href} item={item} counts={counts} pathname={pathname} />
              ))}
            </div>
          );
        })}

        <a
          href={`/${org.slug}`}
          target="_blank"
          rel="noopener"
          className="mt-1 flex items-center gap-3 py-2.5 pl-[22px] pr-5 text-[13px] text-terra transition-colors hover:bg-bg-2"
        >
          <ExternalLink className="size-4 shrink-0" strokeWidth={1.5} />
          <span className="flex-1">{tc('nav.viewPublicPage')}</span>
        </a>
      </nav>

      <div className="divider-soft mx-4" />
      <div className="px-4 mt-3">
        <button className="flex w-full items-center gap-2.5 rounded-[10px] border border-line bg-bg-2 px-2.5 py-2 text-left">
          <InitialsAvatar name={user.name} variant="user" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-medium text-ink">{user.name}</div>
            <div className="text-[10px] text-ink-mute">
              {user.role === 'admin' ? t('roleAdmin') : t('roleVolunteer')}
            </div>
          </div>
          <ChevronDown className="size-3.5 text-ink-mute" />
        </button>
      </div>
    </>
  );
}

export function AdminShell({ org, user, counts, children }: AdminShellProps) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const t = useTranslations('nav');
  const tc = useTranslations('common');

  return (
    <div className="flex min-h-dvh">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-sidebar shrink-0 flex-col border-r border-line bg-paper py-5 lg:flex">
        <SidebarContent org={org} user={user} counts={counts} pathname={pathname} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Desktop topbar (global actions) */}
        <Topbar counts={counts} />

        {/* Mobile top bar */}
        <header className="sticky top-0 z-40 flex h-topbar-mobile items-center justify-between border-b border-line-soft bg-paper px-5 lg:hidden">
          <BrandMark className="text-base" />
          <InitialsAvatar name={user.name} variant="user" />
        </header>

        <main className="flex-1 pb-[calc(var(--spacing-bottom-nav)+16px)] lg:pb-0">{children}</main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-5 border-t border-line-soft bg-paper px-1 pt-2 pb-4 shadow-[0_-2px_12px_rgba(30,42,34,0.04)] lg:hidden">
        {visibleItems(BOTTOM_NAV, user.role).map((item) => {
          const active = isActive(pathname, item.href);
          const pulse = item.pulseKey ? (counts[item.pulseKey] ?? 0) > 0 : false;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center gap-1.5 rounded-xl px-1 py-2 transition-colors',
                active ? 'bg-terra/5 text-terra' : 'text-ink-mute',
              )}
            >
              <span className="relative">
                <Icon className="size-[22px]" strokeWidth={1.6} />
                {pulse && (
                  <span className="absolute -right-1.5 -top-1 size-2.5 rounded-full border-[1.5px] border-paper bg-terra" />
                )}
              </span>
              <span className="text-[11px] font-medium leading-none">{t(item.labelKey)}</span>
            </Link>
          );
        })}
        <button
          onClick={() => setMoreOpen(true)}
          className={cn(
            'flex flex-col items-center justify-center gap-1.5 rounded-xl px-1 py-2 text-ink-mute',
          )}
        >
          <MoreHorizontal className="size-[22px]" strokeWidth={1.6} />
          <span className="text-[11px] font-medium leading-none">{t('more')}</span>
        </button>
      </nav>

      {/* "Mais" drawer */}
      {moreOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true">
          <div
            className="absolute inset-0 bg-ink/60 backdrop-blur-[6px]"
            onClick={() => setMoreOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[75vh] overflow-y-auto rounded-t-xl bg-paper pb-8 pt-3">
            <div className="mx-auto mb-2 h-[5px] w-9 rounded-full bg-line" />
            <div className="flex items-center justify-between px-5 py-2">
              <span className="eyebrow">— {t('more')}</span>
              <button onClick={() => setMoreOpen(false)} aria-label={tc('actions.close')}>
                <X className="size-5 text-ink-mute" />
              </button>
            </div>
            {NAV_GROUPS.flat()
              .filter((i) => !BOTTOM_NAV.some((b) => b.href === i.href))
              .filter((i) => !i.adminOnly || user.role === 'admin')
              .map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    className="flex items-center gap-3 px-5 py-3 text-sm text-ink-soft hover:bg-bg-2"
                  >
                    <Icon className="size-[18px]" strokeWidth={1.5} />
                    {t(item.labelKey)}
                  </Link>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
