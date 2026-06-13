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
 */

const DEMO_ORG_ID = 'org_angelifelice00000';
const ADMIN_USER_ID = 'user_matheus000000000';
const CRICIUMA = '4204608';
/** Dev login: phone +55 48 99999-0000 / password "acolhe123". */
const ADMIN_PHONE = '+5548999990000';
const ADMIN_PASSWORD = 'acolhe123';

export async function seedDev(): Promise<void> {
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
    await tx.insert(s.organization).values({
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
    });

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
      organizationId: DEMO_ORG_ID,
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
    ];
    const inserted = await tx.insert(s.animal).values(animals).returning({ id: s.animal.id });

    // ── Candidates for the triage kanban ──
    const fridaId = inserted[0]!.id;
    const bentoId = inserted[1]!.id;

    const maria = createId('person');
    const joao = createId('person');
    const ana = createId('person');
    await tx.insert(s.person).values([
      person(maria, 'Maria Silva', '+5548988887777'),
      person(joao, 'João Pereira', '+5548977776666'),
      person(ana, 'Ana Souza', '+5548966665555'),
    ]);

    await tx.insert(s.application).values([
      application(fridaId, maria, 'new'),
      application(fridaId, joao, 'in-progress'),
      application(bentoId, ana, 'approved'),
    ]);
  });
}

// ── helpers ──────────────────────────────────────────────────────────────────

function buildAnimal(
  name: string,
  species: 'dog' | 'cat',
  sex: 'male' | 'female',
  status: NewAnimal['status'],
  extra: Partial<NewAnimal>,
): NewAnimal {
  return {
    id: createId('animal'),
    organizationId: DEMO_ORG_ID,
    name,
    species,
    sex,
    status,
    neutered: 'yes',
    intakeDate: new Date('2024-06-01'),
    ageMonthsAtIntake: 24,
    ageReferenceDate: new Date('2024-06-01'),
    ...extra,
  };
}

function person(id: string, name: string, phone: string) {
  return {
    id,
    organizationId: DEMO_ORG_ID,
    name,
    phone,
    cityId: CRICIUMA,
  };
}

function application(animalId: string, personId: string, status: 'new' | 'in-progress' | 'approved') {
  return {
    id: createId('application'),
    organizationId: DEMO_ORG_ID,
    animalId,
    personId,
    formVersion: 'dog-v1',
    status,
    applicationData: {
      housing: 'casa com quintal',
      otherPets: 'não',
      motivation: 'Quero dar um lar cheio de amor.',
    },
    submittedAt: new Date(),
    statusChangedAt: new Date(),
  };
}
