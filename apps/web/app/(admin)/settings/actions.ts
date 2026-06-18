'use server';

import { revalidatePath } from 'next/cache';

import { db } from '@acolhe-animal/db';
import {
  checkSlugAvailability,
  commitOrgLogo,
  getOrganizationByPk,
  removeOrgLogo,
  requestUploads,
  updateOrgPortal,
  updateOrganization,
  type SlugAvailability,
  type UpdateOrganizationInput,
} from '@acolhe-animal/domain';

import { action } from '@/lib/action';
import { requireCtx } from '@/lib/auth-context';

const revalidateOrg = async (slug?: string | null) => {
  revalidatePath('/config');
  if (slug) revalidatePath(`/${slug}`);
};

/** Save the org identity/contact data (admin only — enforced in the domain). */
export const updateOrgAction = async (input: UpdateOrganizationInput) =>
  action(async () => {
    const ctx = await requireCtx();
    const org = await updateOrganization(ctx, input);
    revalidatePath('/config');
    return { id: org.id };
  });

/** Enable/disable the public portal, set its URL, and/or its accent color. */
export const updatePortalAction = async (input: {
  enabled: boolean;
  slug?: string;
  primaryColor?: string | null;
  instagram?: string | null;
}) =>
  action(async () => {
    const ctx = await requireCtx();
    const org = await updateOrgPortal(ctx, input);
    await revalidateOrg(org.slug);
    return { portalEnabled: org.portalEnabled, slug: org.slug };
  });

/** Live slug availability for the portal URL field (excludes the current org). */
export const checkSettingsSlugAction = async (slug: string): Promise<SlugAvailability> => {
  const ctx = await requireCtx();
  return checkSlugAvailability(db, slug, ctx.organizationId);
};

/** Mint a presigned upload URL for the org logo (admin only). */
export const requestLogoUploadAction = async (file: {
  filename: string;
  contentType: string;
  size: number;
}) =>
  action(async () => {
    const ctx = await requireCtx();
    const org = await getOrganizationByPk(db, ctx.organizationId);
    const [ticket] = await requestUploads(ctx, {
      policy: 'org-logo',
      owner: { type: 'organization', id: org?.id ?? '' },
      files: [file],
    });
    return ticket;
  });

/** Process the uploaded logo and set it on the org. */
export const commitLogoAction = async (uploadId: string) =>
  action(async () => {
    const ctx = await requireCtx();
    const res = await commitOrgLogo(ctx, uploadId);
    const org = await getOrganizationByPk(db, ctx.organizationId);
    await revalidateOrg(org?.slug);
    return res;
  });

/** Remove the org logo. */
export const removeLogoAction = async () =>
  action(async () => {
    const ctx = await requireCtx();
    await removeOrgLogo(ctx);
    const org = await getOrganizationByPk(db, ctx.organizationId);
    await revalidateOrg(org?.slug);
    return { ok: true };
  });
