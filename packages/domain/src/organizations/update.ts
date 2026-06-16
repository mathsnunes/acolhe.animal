import { and, eq, ne } from 'drizzle-orm';
import { z } from 'zod';

import {
  ConflictError,
  NotFoundError,
  ValidationError,
  RESERVED_SLUGS,
  documentSchema,
  optionalEmailSchema,
  phoneSchema,
  slugSchema,
} from '@acolhe-animal/shared';
import { organization, type Organization } from '@acolhe-animal/db';

import type { Ctx } from '../context';
import { assertAdmin } from '../auth/permissions';
import { getOrganizationByPk } from './service';

/**
 * Org settings edits (admin only). Identity/contact live in `updateOrganization`;
 * the public portal (on/off + URL) lives in `updateOrgPortal` so the two stay
 * independent — you can fix your phone without touching the portal, and flip the
 * portal without re-validating everything else.
 */

const updateOrganizationSchema = z.object({
  name: z.string().trim().min(1, 'Informe o nome.'),
  email: optionalEmailSchema,
  phone: phoneSchema,
  document: z.string().trim(),
  cityId: z.string().min(1).nullish(),
  streetAddress: z.string().trim().nullish(),
  addressNumber: z.string().trim().nullish(),
  addressComplement: z.string().trim().nullish(),
  postalCode: z.string().trim().nullish(),
  aboutText: z.string().trim().nullish(),
});

export type UpdateOrganizationInput = z.input<typeof updateOrganizationSchema>;

export const updateOrganization = async (ctx: Ctx, input: unknown): Promise<Organization> => {
  assertAdmin(ctx);
  const data = updateOrganizationSchema.parse(input);
  const current = await getOrganizationByPk(ctx.db, ctx.organizationId);
  if (!current) throw new NotFoundError('Organização não encontrada.');

  // The document is validated against the org's existing type (CNPJ vs CPF).
  const { document } = documentSchema.parse({
    documentType: current.documentType,
    document: data.document,
  });

  const [docTaken] = await ctx.db
    .select({ pk: organization.pk })
    .from(organization)
    .where(and(eq(organization.document, document), ne(organization.pk, ctx.organizationId)))
    .limit(1);
  if (docTaken) {
    throw new ConflictError('Este documento já está cadastrado.', {
      document: current.documentType === 'cnpj' ? 'CNPJ já cadastrado.' : 'CPF já cadastrado.',
    });
  }

  const [phoneTaken] = await ctx.db
    .select({ pk: organization.pk })
    .from(organization)
    .where(and(eq(organization.phone, data.phone), ne(organization.pk, ctx.organizationId)))
    .limit(1);
  if (phoneTaken) {
    throw new ConflictError('Este telefone já está cadastrado.', { phone: 'Telefone já em uso.' });
  }

  const [row] = await ctx.db
    .update(organization)
    .set({
      name: data.name,
      email: data.email ?? null,
      phone: data.phone,
      document,
      cityId: data.cityId ?? null,
      streetAddress: data.streetAddress ?? null,
      addressNumber: data.addressNumber ?? null,
      addressComplement: data.addressComplement ?? null,
      postalCode: data.postalCode ?? null,
      aboutText: data.aboutText ?? null,
    })
    .where(eq(organization.pk, ctx.organizationId))
    .returning();
  if (!row) throw new Error('Falha ao atualizar a organização.');
  return row;
};

const updateOrgPortalSchema = z.object({
  enabled: z.boolean(),
  slug: z.string().trim().toLowerCase().optional(),
});

export const updateOrgPortal = async (ctx: Ctx, input: unknown): Promise<Organization> => {
  assertAdmin(ctx);
  const data = updateOrgPortalSchema.parse(input);
  const current = await getOrganizationByPk(ctx.db, ctx.organizationId);
  if (!current) throw new NotFoundError('Organização não encontrada.');

  let slugToSet: string | undefined;
  if (data.slug) {
    const parsed = slugSchema.safeParse(data.slug);
    if (!parsed.success) {
      const reserved = RESERVED_SLUGS.has(data.slug);
      throw new ValidationError(reserved ? 'Esse endereço é reservado.' : 'Endereço inválido.', {
        slug: reserved ? 'Endereço reservado.' : 'Use só letras minúsculas, números e hífens.',
      });
    }
    if (parsed.data !== current.slug) {
      const [taken] = await ctx.db
        .select({ pk: organization.pk })
        .from(organization)
        .where(and(eq(organization.slug, parsed.data), ne(organization.pk, ctx.organizationId)))
        .limit(1);
      if (taken) throw new ConflictError('Este endereço já está em uso.', { slug: 'Endereço já em uso.' });
    }
    slugToSet = parsed.data;
  }

  // Can't go live without a URL — either set one now or keep the existing one.
  const finalSlug = slugToSet ?? current.slug ?? null;
  if (data.enabled && !finalSlug) {
    throw new ValidationError('Defina o endereço do portal para habilitá-lo.', {
      slug: 'Defina o endereço primeiro.',
    });
  }

  const [row] = await ctx.db
    .update(organization)
    .set({ portalEnabled: data.enabled, ...(slugToSet ? { slug: slugToSet } : {}) })
    .where(eq(organization.pk, ctx.organizationId))
    .returning();
  if (!row) throw new Error('Falha ao atualizar o portal.');
  return row;
};
