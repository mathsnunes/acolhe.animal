import {
  BookOpen,
  Heart,
  Home,
  Megaphone,
  Package,
  PawPrint,
  Settings,
  UserCog,
  Users,
  UsersRound,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

/** A single sidebar/bottom-nav destination. `labelKey` indexes the `nav` messages. */
export interface NavItem {
  href: string;
  labelKey: string;
  icon: LucideIcon;
  /** Key into the counts map for a numeric badge (informational). */
  countKey?: 'animals' | 'newApplications';
  /** Show a pulsing "novidade" dot when this count > 0. */
  pulseKey?: 'newApplications';
  /** admin-only items are hidden from volunteers. */
  adminOnly?: boolean;
  /** When set, the topbar shows this "create" CTA while the section is active. */
  createHref?: string;
  createLabelKey?: string;
}

/**
 * Sidebar groups, ordered by frequency of use (not by domain) — divisors do the
 * grouping silently. See `04-componentes-navegacao.md` › Ordem dos itens.
 */
export const NAV_GROUPS: NavItem[][] = [
  [
    { href: '/inicio', labelKey: 'home', icon: Home },
    {
      href: '/animais',
      labelKey: 'animals',
      icon: PawPrint,
      countKey: 'animals',
      createHref: '/animais/novo',
      createLabelKey: 'topbar.newAnimal',
    },
    { href: '/candidatos', labelKey: 'candidates', icon: Users, pulseKey: 'newApplications' },
    { href: '/doacoes', labelKey: 'donations', icon: Heart, adminOnly: true },
    { href: '/caixa', labelKey: 'cashflow', icon: Wallet, adminOnly: true },
  ],
  [
    { href: '/campanhas', labelKey: 'campaigns', icon: Megaphone, adminOnly: true },
    { href: '/historias', labelKey: 'stories', icon: BookOpen },
    { href: '/itens-em-falta', labelKey: 'neededItems', icon: Package },
    { href: '/apoiadores', labelKey: 'supporters', icon: UsersRound, adminOnly: true },
  ],
  [
    { href: '/membros', labelKey: 'members', icon: UserCog, adminOnly: true },
    { href: '/config', labelKey: 'settings', icon: Settings },
  ],
];

/** Editorial section label per NAV_GROUPS entry (keys into `nav.sections.*`). */
export const NAV_GROUP_LABELS = ['general', 'content', 'org'] as const;

/** The 5 fixed bottom-nav slots on mobile (the rest live in "Mais"). */
export const BOTTOM_NAV: NavItem[] = [
  { href: '/inicio', labelKey: 'home', icon: Home },
  { href: '/animais', labelKey: 'animals', icon: PawPrint },
  { href: '/candidatos', labelKey: 'candidates', icon: Users, pulseKey: 'newApplications' },
  { href: '/doacoes', labelKey: 'donations', icon: Heart },
];

export type NavCounts = Partial<Record<'animals' | 'newApplications', number>>;
