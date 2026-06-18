import { eq } from 'drizzle-orm';
import { z } from 'zod';

import {
  ConflictError,
  createId,
  documentSchema,
  optionalEmailSchema,
  phoneSchema,
} from '@acolhe-animal/shared';
import type { Database, Organization } from '@acolhe-animal/db';
import { organization, organizationMember } from '@acolhe-animal/db';

import { setUserProfile } from '../users/service';

/**
 * Tenant bootstrap: turn a just-verified user into the admin of a brand-new
 * organization. This is the one operation that *creates* a tenant, so it can't
 * take a tenant-scoped `Ctx` (there is no org yet) — it takes the raw `db` plus
 * the owner's user id, mirroring `organizations/service.ts`.
 *
 * Runs in a single transaction: finalize the owner's profile, create the org
 * (status `active`), and create the admin membership. The public portal is OFF
 * by default (no slug claimed at signup) — the owner enables it later in settings.
 * The owner's phone becomes the org contact phone; it can be separated later.
 */
const registerOrganizationSchema = z.object({
  ownerUserId: z.string().min(1),
  ownerName: z.string().trim().min(1, 'Informe seu nome.'),
  ownerEmail: optionalEmailSchema,
  profileType: z.enum(['ong', 'protetor']),
  orgName: z.string().trim().min(1, 'Informe o nome do perfil.'),
  document: z.string().trim(),
  cityId: z.string().min(1, 'Selecione uma cidade.'),
  phone: phoneSchema,
});

export type RegisterOrganizationInput = z.input<typeof registerOrganizationSchema>;

export const registerOrganization = async (db: Database, input: RegisterOrganizationInput): Promise<Organization> => {
  const data = registerOrganizationSchema.parse(input);

  // Document type follows the profile type: a formal NGO has a CNPJ, an
  // individual protector a CPF. Validate the digits against that type.
  const documentType = data.profileType === 'ong' ? 'cnpj' : 'cpf';
  const { document } = documentSchema.parse({ documentType, document: data.document });

  return db.transaction(async (tx) => {
    // Pre-check uniqueness for friendly field errors; the unique indexes on
    // document/phone are the backstop against a race.
    const [docTaken] = await tx
      .select({ pk: organization.pk })
      .from(organization)
      .where(eq(organization.document, document))
      .limit(1);
    if (docTaken) {
      throw new ConflictError('Este documento já está cadastrado.', {
        document: documentType === 'cnpj' ? 'CNPJ já cadastrado.' : 'CPF já cadastrado.',
      });
    }

    const [phoneTaken] = await tx
      .select({ pk: organization.pk })
      .from(organization)
      .where(eq(organization.phone, data.phone))
      .limit(1);
    if (phoneTaken) throw new ConflictError('Este telefone já está cadastrado.', { phone: 'Telefone já em uso.' });

    await setUserProfile(tx, data.ownerUserId, { name: data.ownerName, email: data.ownerEmail });

    const [org] = await tx
      .insert(organization)
      .values({
        id: createId('organization'),
        name: data.orgName,
        // No slug / portal yet — the owner claims a URL and turns the portal on
        // from settings when they're ready.
        document,
        documentType,
        status: 'active',
        email: data.ownerEmail ?? null,
        phone: data.phone,
        cityId: data.cityId,
      })
      .returning();
    if (!org) throw new Error('Falha ao criar a organização.');

    await tx.insert(organizationMember).values({
      id: createId('organizationMember'),
      userId: data.ownerUserId,
      organizationId: org.pk,
      role: 'admin',
    });

    return org;
  });
};
