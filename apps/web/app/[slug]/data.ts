import 'server-only';

import type { CSSProperties } from 'react';

import { formatCnpj, formatCpf } from '@acolhe-animal/shared';
import { db, type Organization } from '@acolhe-animal/db';
import {
  getOrganizationBySlug,
  getPortalAnimal as loadPortalAnimal,
  getPortalStats as loadPortalStats,
  listPortalAnimals as loadPortalAnimals,
  listPortalAnimalsPage as loadPortalAnimalsPage,
  type PortalAnimalDetail,
  type PortalAnimalItem,
  type PortalAnimalsPage,
  type PortalStats,
} from '@acolhe-animal/domain';

import { publicCtx } from '@/lib/auth-context';

/**
 * Thin web adapters for the public portal: resolve the org from the slug, build a
 * public `Ctx`, and call the domain read model. All DB access lives in
 * `@acolhe-animal/domain` (portal service) — the web layer never queries directly.
 */

/** Shared portal-shell derivations, identical on the home and detail pages. */
export interface PortalChrome {
  accentStyle: CSSProperties | undefined;
  documentLabel: string;
  hasAbout: boolean;
}

/**
 * Per-org portal chrome: accent tokens retinted from the saved primary color,
 * the formatted CNPJ/CPF label, and whether there's an about section to anchor.
 */
export const portalChrome = (org: Organization): PortalChrome => {
  const accent = org.portalConfig?.primaryColor;
  return {
    // Solid hex (no color-mix) so it degrades safely on older browsers.
    accentStyle: accent ? ({ '--color-terra': accent, '--color-ring': accent } as CSSProperties) : undefined,
    documentLabel:
      org.documentType === 'cnpj' ? `CNPJ ${formatCnpj(org.document)}` : `CPF ${formatCpf(org.document)}`,
    hasAbout: !!org.aboutText?.trim(),
  };
};

/** Resolve a public, active organization by slug (or null when not adoptable). */
export const getPublicOrganization = async (slug: string): Promise<Organization | null> => {
  const org = await getOrganizationBySlug(db, slug);
  // The portal is live only when the org is active AND the owner enabled it.
  if (!org || org.status !== 'active' || !org.portalEnabled) return null;
  return org;
};

/** A page of publicly-shown animals (legacy infinite-scroll path). */
export const getPortalAnimals = (
  organizationPk: number,
  page: { limit: number; offset: number },
): Promise<PortalAnimalsPage> => loadPortalAnimalsPage(publicCtx(organizationPk), page);

/** Every adoptable animal shown publicly, loaded at once for the sections + filters. */
export const getAllPortalAnimals = (organizationPk: number): Promise<PortalAnimalItem[]> =>
  loadPortalAnimals(publicCtx(organizationPk));

/** Lives changed: count of active adoptions + a few recently adopted animals. */
export const getPortalStats = (organizationPk: number): Promise<PortalStats> =>
  loadPortalStats(publicCtx(organizationPk));

/** A single public animal with its full ordered photo set + playable videos. */
export const getPortalAnimal = (
  organizationPk: number,
  animalId: string,
): Promise<PortalAnimalDetail | null> => loadPortalAnimal(publicCtx(organizationPk), animalId);
