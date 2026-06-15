import bcrypt from 'bcryptjs';

import { createId } from '@acolhe-animal/shared';

import { db } from '../client';
import * as s from '../schema';
import type { NewAnimal } from '../types';

/**
 * Development data seed — the demo org "Angeli Felice" (Criciúma/SC) with a
 * volunteer admin, ~12 animals across every status, a handful of candidates for
 * the triage kanban, and one offline adoption. Lets you see the product running
 * without registering everything by hand (`modelagem-dados.md` › Notas).
 *
 * Idempotent by wipe-then-insert on the demo tables. NEVER runs in production.
 *
 * Hybrid ids: the public `id` (org_…, animal_…) is set explicitly; the internal
 * `pk` (bigint identity) is assigned by Postgres and captured via `.returning`
 * so foreign keys point at the surrogate key.
 */

const DEMO_ORG_ID = 'org_angelifelice00000';
const ADMIN_USER_ID = 'user_matheus000000000';
const CRICIUMA = '4204608';
/** Dev login: phone +55 48 99999-0000 / password "acolhe123". */
const ADMIN_PHONE = '+5548999990000';
const ADMIN_PASSWORD = 'acolhe123';

export const seedDev = async (): Promise<void> => {
  await db.transaction(async (tx) => {
    // Wipe demo domain data (FK-safe order). City + auth-of-other-users untouched.
    await tx.delete(s.adoption);
    await tx.delete(s.application);
    await tx.delete(s.person);
    await tx.delete(s.animalPhoto);
    await tx.delete(s.animal);
    await tx.delete(s.organizationMember);
    await tx.delete(s.organizationInvite);
    await tx.delete(s.organization);

    // ── Organization ──
    const [orgRow] = await tx
      .insert(s.organization)
      .values({
        id: DEMO_ORG_ID,
        name: 'Angeli Felice',
        slug: 'angeli-felice',
        document: '12345678000190',
        documentType: 'cnpj',
        status: 'active',
        phone: '+5548999990000',
        email: 'contato@angelifelice.org',
        cityId: CRICIUMA,
        aboutText:
          'Protegemos e cuidamos de cães e gatos resgatados em Criciúma e região, ' +
          'buscando lares responsáveis e amorosos.',
        foundedAt: new Date('2018-03-01'),
      })
      .returning({ pk: s.organization.pk });
    const orgPk = orgRow!.pk;

    // ── Admin user + credential + membership ──
    await tx
      .insert(s.user)
      .values({
        id: ADMIN_USER_ID,
        name: 'Matheus A.',
        phoneNumber: ADMIN_PHONE,
        phoneNumberVerified: true,
        email: 'matheus@example.com',
        emailVerified: true,
        status: 'active',
      })
      .onConflictDoNothing();

    await tx
      .insert(s.account)
      .values({
        id: createId('organizationMember'), // any unique id is fine here
        accountId: ADMIN_USER_ID,
        providerId: 'credential',
        userId: ADMIN_USER_ID,
        password: bcrypt.hashSync(ADMIN_PASSWORD, 10),
      })
      .onConflictDoNothing();

    await tx.insert(s.organizationMember).values({
      id: createId('organizationMember'),
      userId: ADMIN_USER_ID,
      organizationId: orgPk,
      role: 'admin',
      joinedAt: new Date('2018-03-01'),
    });

    // ── Animals ──
    const animals: NewAnimal[] = [
      buildAnimal('Frida', 'dog', 'female', 'available', {
        size: 'medium',
        energyLevel: 'calm',
        shortStory: 'A doce vira-lata que entende quando você precisa de paz.',
        goodWithChildren: 'yes',
        goodWithDogs: 'yes',
        goodWithCats: 'with-care',
      }),
      buildAnimal('Bento', 'dog', 'male', 'available', {
        size: 'large',
        energyLevel: 'energetic',
        goodWithChildren: 'yes',
        goodWithDogs: 'yes',
      }),
      buildAnimal('Luna', 'cat', 'female', 'available', {
        size: 'small',
        energyLevel: 'balanced',
        specialConditions: ['FIV+'],
      }),
      buildAnimal('Pingo', 'dog', 'male', 'under-review', {
        size: 'small',
        energyLevel: 'calm',
        specialConditions: ['epilepsia'],
      }),
      buildAnimal('Mel', 'dog', 'female', 'reserved', { size: 'medium', energyLevel: 'balanced' }),
      buildAnimal('Tom', 'cat', 'male', 'available', { size: 'medium', energyLevel: 'energetic' }),
      buildAnimal('Nina', 'cat', 'female', 'available', { size: 'small', energyLevel: 'calm' }),
      buildAnimal('Thor', 'dog', 'male', 'adopted', { size: 'large', energyLevel: 'energetic' }),
      buildAnimal('Amora', 'dog', 'female', 'available', { size: 'small', energyLevel: 'calm' }),
      buildAnimal('Simba', 'cat', 'male', 'under-review', {
        size: 'medium',
        energyLevel: 'balanced',
      }),
      buildAnimal('Chico', 'dog', 'male', 'available', {
        size: 'medium',
        energyLevel: 'balanced',
        clinicalCondition: {
          type: 'post-surgery-recovery',
          description: 'Recuperando de cirurgia na pata. Precisa de repouso por 3 semanas.',
          needsSpecialAdopter: true,
          expectedResolution: null,
        },
      }),
      buildAnimal('Bel', 'cat', 'female', 'unavailable', { size: 'small', energyLevel: 'calm' }),
    ].map((a) => ({ ...a, organizationId: orgPk }));
    const inserted = await tx.insert(s.animal).values(animals).returning({ pk: s.animal.pk });

    // ── Candidates for the triage kanban ──
    const fridaPk = inserted[0]!.pk;
    const bentoPk = inserted[1]!.pk;

    const people = await tx
      .insert(s.person)
      .values([
        person('Maria Silva', '+5548988887777', orgPk),
        person('João Pereira', '+5548977776666', orgPk),
        person('Ana Souza', '+5548966665555', orgPk),
      ])
      .returning({ pk: s.person.pk });
    const [mariaPk, joaoPk, anaPk] = [people[0]!.pk, people[1]!.pk, people[2]!.pk];

    await tx.insert(s.application).values([
      application(fridaPk, mariaPk, 'new', orgPk),
      application(fridaPk, joaoPk, 'in-progress', orgPk),
      application(bentoPk, anaPk, 'approved', orgPk),
    ]);
  });
};

// ── helpers ──────────────────────────────────────────────────────────────────

/** Builds an animal row sans `organizationId` (injected by the caller's `.map`). */
const buildAnimal = (name: string, species: 'dog' | 'cat', sex: 'male' | 'female', status: NewAnimal['status'], extra: Partial<NewAnimal>): Omit<NewAnimal, 'organizationId'> => ({
    id: createId('animal'),
    name,
    species,
    sex,
    status,
    neutered: 'yes',
    intakeDate: new Date('2024-06-01'),
    ageMonthsAtIntake: 24,
    ageReferenceDate: new Date('2024-06-01'),
    ...extra,
  });

const person = (name: string, phone: string, organizationId: number) => ({
    id: createId('person'),
    organizationId,
    name,
    phone,
    cityId: CRICIUMA,
  });

const application = (animalId: number, personId: number, status: 'new' | 'in-progress' | 'approved', organizationId: number) => ({
    id: createId('application'),
    organizationId,
    animalId,
    personId,
    formVersion: 'dog-v1',
    status,
    // Mirrors the public form: stable camelCase keys + the form's option codes
    // (the admin UI translates them via the `form` i18n labels). Free-text answers
    // stay as prose.
    applicationData: {
      email: 'contato@example.com',
      city: 'Criciúma, SC',
      address: 'Rua Henrique Lage, 123 — Centro',
      housing: 'house-yard',
      ownership: 'own',
      household: ['partner'],
      agreement: 'yes',
      hasPets: 'no',
      hadPets: 'yes',
      petHistory: 'Tive uma cachorra, a Mel, por 14 anos — faleceu de causas naturais.',
      hoursAway: 'lt4',
      sleep: 'bed-room',
      vet: 'easy',
      motivation: 'Quero dar um lar cheio de amor.',
    },
    submittedAt: new Date(),
    statusChangedAt: new Date(),
  });
