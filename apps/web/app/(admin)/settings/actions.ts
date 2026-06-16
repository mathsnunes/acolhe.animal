'use server';

import { revalidatePath } from 'next/cache';

import { db } from '@acolhe-animal/db';
import {
  checkSlugAvailability,
  updateOrgPortal,
  updateOrganization,
  type SlugAvailability,
  type UpdateOrganizationInput,
} from '@acolhe-animal/domain';

import { action } from '@/lib/action';
import { requireCtx } from '@/lib/auth-context';

/** Save the org identity/contact data (admin only — enforced in the domain). */
export const updateOrgAction = async (input: UpdateOrganizationInput) =>
  action(async () => {
    const ctx = await requireCtx();
    const org = await updateOrganization(ctx, input);
    revalidatePath('/configuracoes');
    return { id: org.id };
  });

/** Enable/disable the public portal and/or set its URL. */
export const updatePortalAction = async (input: { enabled: boolean; slug?: string }) =>
  action(async () => {
    const ctx = await requireCtx();
    const org = await updateOrgPortal(ctx, input);
    revalidatePath('/configuracoes');
    if (org.slug) revalidatePath(`/${org.slug}`);
    return { portalEnabled: org.portalEnabled, slug: org.slug };
  });

/** Live slug availability for the portal URL field (excludes the current org). */
export const checkSettingsSlugAction = async (slug: string): Promise<SlugAvailability> => {
  const ctx = await requireCtx();
  return checkSlugAvailability(db, slug, ctx.organizationId);
};
