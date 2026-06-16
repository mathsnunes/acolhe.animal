'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Check, ChevronsUpDown, ExternalLink, LogOut, MoreHorizontal, Settings, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, useTransition, type ReactNode } from 'react';

import { initials } from '@acolhe-animal/shared';

import { BrandMark } from '@/components/brand';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { signOut } from '@/lib/auth-client';
import { cn } from '@/lib/utils';
import { setActiveOrgAction } from '@/app/(admin)/actions';
import { Topbar } from './topbar';
import { BOTTOM_NAV, NAV_GROUP_LABELS, NAV_GROUPS, type NavCounts, type NavItem } from './nav-config';

export interface ShellOrg {
  name: string;
  /** Null when the public portal isn't set up yet — the public-page link is hidden. */
  slug: string | null;
  cityLabel?: string;
  logoUrl?: string | null;
}
export interface ShellOrgOption {
  id: string;
  name: string;
  cityLabel?: string;
  logoUrl?: string | null;
}
export interface ShellUser {
  name: string;
  role: 'admin' | 'volunteer';
}

interface AdminShellProps {
  org: ShellOrg;
  /** All orgs the user belongs to + the active one — drives the switcher. */
  orgs: ShellOrgOption[];
  activeOrgId: string | null;
  user: ShellUser;
  counts: NavCounts;
  children: ReactNode;
}

const isActive = (pathname: string, href: string): boolean => pathname === href || pathname.startsWith(`${href}/`);

const visibleItems = (items: NavItem[], role: ShellUser['role']): NavItem[] => items.filter((i) => !i.adminOnly || role === 'admin');

/** Circular initials avatar with a soft brand tint (org = terra, user = green). */
const InitialsAvatar = ({ name, variant }: { name: string; variant: 'org' | 'user' }) => <span
      className={cn(
        'flex size-7 shrink-0 items-center justify-center rounded-full text-[10px] font-medium uppercase',
        variant === 'org' ? 'bg-terra-bg font-display text-terra' : 'bg-green/10 text-green',
      )}
    >
      {initials(name)}
    </span>;

/**
 * Org avatar: the uploaded logo shown in full (object-contain, never cropped) in
 * a soft rounded tile, falling back to the terra initials badge when unset.
 */
const OrgAvatar = ({ name, logoUrl }: { name: string; logoUrl?: string | null }) =>
  logoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={logoUrl}
      alt=""
      className="size-7 shrink-0 rounded-md border border-line bg-paper object-contain p-0.5"
    />
  ) : (
    <InitialsAvatar name={name} variant="org" />
  );

/** Org context indicator. A dropdown switcher when the user belongs to >1 org. */
const OrgSwitcher = ({ org, orgs, activeOrgId }: { org: ShellOrg; orgs: ShellOrgOption[]; activeOrgId: string | null }) => {
  const [pending, startTransition] = useTransition();

  const card = (interactive: boolean) => (
    <div
      className={cn(
        'flex w-full items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-left transition-colors',
        interactive && 'hover:bg-bg-2',
      )}
    >
      <OrgAvatar name={org.name} logoUrl={org.logoUrl} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-medium text-ink">{org.name}</div>
        {org.cityLabel && <div className="truncate text-[11px] text-ink-mute">{org.cityLabel}</div>}
      </div>
      {orgs.length > 1 && <ChevronsUpDown className="size-3.5 shrink-0 text-ink-mute" />}
    </div>
  );

  if (orgs.length <= 1) return <div className="px-2 mb-1 mt-3">{card(false)}</div>;

  return (
    <div className="px-2 mb-1 mt-3">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" disabled={pending} className="w-full">
            {card(true)}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[--radix-dropdown-menu-trigger-width] min-w-56">
          {orgs.map((o) => (
            <DropdownMenuItem
              key={o.id}
              onClick={() => startTransition(() => setActiveOrgAction(o.id))}
              className="gap-2.5"
            >
              <OrgAvatar name={o.name} logoUrl={o.logoUrl} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-medium text-ink">{o.name}</div>
                {o.cityLabel && <div className="truncate text-[10px] text-ink-mute">{o.cityLabel}</div>}
              </div>
              {o.id === activeOrgId && <Check className="size-3.5 shrink-0 text-terra" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

/** User menu at the sidebar foot: identity + settings + logout. */
const UserMenu = ({ user }: { user: ShellUser }) => {
  const t = useTranslations('nav');
  const router = useRouter();

  const logout = async () => {
    await signOut();
    router.push('/entrar');
  };

  return (
    <div className="px-2 mt-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex w-full items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-left transition-colors hover:bg-bg-2">
            <InitialsAvatar name={user.name} variant="user" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-medium text-ink">{user.name}</div>
              <div className="text-[11px] text-ink-mute">
                {user.role === 'admin' ? t('roleAdmin') : t('roleVolunteer')}
              </div>
            </div>
            <MoreHorizontal className="size-4 text-ink-mute" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" side="top" className="w-[--radix-dropdown-menu-trigger-width] min-w-52">
          <DropdownMenuLabel className="truncate">{user.name}</DropdownMenuLabel>
          <DropdownMenuItem asChild>
            <Link href="/config">
              <Settings className="size-4" />
              {t('settings')}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={logout} className="text-rose focus:text-rose">
            <LogOut className="size-4" />
            {t('logout')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

const NavLink = ({ item, counts, pathname }: { item: NavItem; counts: NavCounts; pathname: string }) => {
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
        'mx-2 flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-[13px] transition-colors',
        active ? 'bg-terra-bg font-medium text-terra' : 'text-ink-soft hover:bg-bg-2',
      )}
    >
      <Icon className="size-4 shrink-0" strokeWidth={active ? 2 : 1.5} />
      <span className="flex-1">{t(item.labelKey)}</span>
      {pulse && <span className="size-2 rounded-full bg-terra animate-pulse-dot" aria-hidden />}
      {count != null && count > 0 && <span className="text-[11px] text-ink-mute">{count}</span>}
    </Link>
  );
};

const SidebarContent = ({
  org,
  orgs,
  activeOrgId,
  user,
  counts,
  pathname,
}: {
  org: ShellOrg;
  orgs: ShellOrgOption[];
  activeOrgId: string | null;
  user: ShellUser;
  counts: NavCounts;
  pathname: string;
}) => {
  const t = useTranslations('nav');
  const tc = useTranslations('common');
  return (
    <>
      <div className="px-5 pb-1 pt-1">
        <BrandMark />
      </div>

      <OrgSwitcher org={org} orgs={orgs} activeOrgId={activeOrgId} />

      <nav className="flex-1 overflow-y-auto py-1">
        {NAV_GROUPS.map((group, gi) => {
          const items = visibleItems(group, user.role);
          if (!items.length) return null;
          const sectionKey = NAV_GROUP_LABELS[gi];
          return (
            <div key={gi} className="mt-3 first:mt-1">
              {sectionKey && (
                <div className="px-[18px] pb-1 text-[11px] tracking-[0.03em] text-ink-mute/85">{t(`sections.${sectionKey}`)}</div>
              )}
              {items.map((item) => (
                <NavLink key={item.href} item={item} counts={counts} pathname={pathname} />
              ))}
            </div>
          );
        })}

        {org.slug && (
          <a
            href={`/${org.slug}`}
            target="_blank"
            rel="noopener"
            className="mx-2 mt-1 flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-[13px] text-terra transition-colors hover:bg-bg-2"
          >
            <ExternalLink className="size-4 shrink-0" strokeWidth={1.5} />
            <span className="flex-1">{tc('nav.viewPublicPage')}</span>
          </a>
        )}
      </nav>

      <div className="divider-soft mx-4" />
      <UserMenu user={user} />
    </>
  );
};

export const AdminShell = ({ org, orgs, activeOrgId, user, counts, children }: AdminShellProps) => {
  const pathname = usePathname();
  const router = useRouter();
  const [moreOpen, setMoreOpen] = useState(false);
  const [orgPending, startOrgTransition] = useTransition();
  const t = useTranslations('nav');
  const tc = useTranslations('common');

  const logout = async () => {
    await signOut();
    router.push('/entrar');
  };

  return (
    <div className="flex min-h-dvh">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-sidebar shrink-0 flex-col border-r border-line bg-paper py-5 lg:flex">
        <SidebarContent org={org} orgs={orgs} activeOrgId={activeOrgId} user={user} counts={counts} pathname={pathname} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Desktop topbar (global actions) */}
        <Topbar counts={counts} />

        {/* Mobile top bar — org context doubles as the switcher entry point */}
        <header className="sticky top-0 z-40 flex h-topbar-mobile items-center justify-between gap-3 border-b border-line-soft bg-paper px-4 lg:hidden">
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            aria-label={t('sections.org')}
            className="flex min-w-0 items-center gap-2.5 rounded-[10px] py-1 pr-2 text-left transition-colors active:bg-bg-2"
          >
            <OrgAvatar name={org.name} logoUrl={org.logoUrl} />
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-ink">{org.name}</div>
              {org.cityLabel && <div className="truncate text-[11px] text-ink-mute">{org.cityLabel}</div>}
            </div>
            {orgs.length > 1 && <ChevronsUpDown className="size-3.5 shrink-0 text-ink-mute" />}
          </button>
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

            {/* Org context + switcher */}
            <div className="px-5 pb-1 pt-1">
              <div className="px-1 pb-1 text-[11px] tracking-[0.03em] text-ink-mute/85">{t('sections.org')}</div>
              {orgs.length > 1 ? (
                orgs.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    disabled={orgPending}
                    onClick={() => startOrgTransition(() => setActiveOrgAction(o.id))}
                    className={cn(
                      'flex w-full items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-left transition-colors disabled:opacity-60',
                      o.id === activeOrgId ? 'bg-terra-bg' : 'hover:bg-bg-2',
                    )}
                  >
                    <OrgAvatar name={o.name} logoUrl={o.logoUrl} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-medium text-ink">{o.name}</div>
                      {o.cityLabel && <div className="truncate text-[11px] text-ink-mute">{o.cityLabel}</div>}
                    </div>
                    {o.id === activeOrgId && <Check className="size-4 shrink-0 text-terra" />}
                  </button>
                ))
              ) : (
                <div className="flex w-full items-center gap-2.5 rounded-[10px] px-2.5 py-2">
                  <OrgAvatar name={org.name} logoUrl={org.logoUrl} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-medium text-ink">{org.name}</div>
                    {org.cityLabel && <div className="truncate text-[11px] text-ink-mute">{org.cityLabel}</div>}
                  </div>
                </div>
              )}
            </div>
            <div className="divider-soft mx-5 my-2" />

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
            <div className="divider-soft mx-5 my-2" />
            <button
              onClick={logout}
              className="flex w-full items-center gap-3 px-5 py-3 text-sm text-rose hover:bg-bg-2"
            >
              <LogOut className="size-[18px]" strokeWidth={1.5} />
              {t('logout')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
