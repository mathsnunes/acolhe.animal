'use server';

import { headers } from 'next/headers';

import { db } from '@acolhe-animal/db';
import { checkSlugAvailability, registerOrganization, type SlugAvailability } from '@acolhe-animal/domain';

import { action } from '@/lib/action';
import { auth } from '@/lib/auth';
import { requireUserId } from '@/lib/auth-context';

/** Live slug availability for the org profile step. */
export const checkSlugAction = async (slug: string): Promise<SlugAvailability> => checkSlugAvailability(db, slug);

export interface FinalizeSignupInput {
  password: string;
  ownerName: string;
  ownerEmail?: string;
  profileType: 'ong' | 'protetor';
  orgName: string;
  document: string;
  cityId: string;
  phone: string;
}

/**
 * Complete signup after the phone OTP has been verified (which created the
 * session): set the chosen password and bootstrap the organization with the
 * current user as admin.
 */
export const finalizeSignupAction = async (input: FinalizeSignupInput) =>
  action(async () => {
    const userId = await requireUserId();
    await auth.api.setPassword({ headers: await headers(), body: { newPassword: input.password } });
    const org = await registerOrganization(db, {
      ownerUserId: userId,
      ownerName: input.ownerName,
      ownerEmail: input.ownerEmail,
      profileType: input.profileType,
      orgName: input.orgName,
      document: input.document,
      cityId: input.cityId,
      phone: input.phone,
    });
    return { organizationId: org.id };
  });
