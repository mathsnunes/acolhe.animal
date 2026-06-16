import { eq } from 'drizzle-orm';

import { getApplication, getPersonByPk, listAnimals } from '@acolhe-animal/domain';
import { animal, city, db } from '@acolhe-animal/db';
import { formatCpf, formatPhoneBR, isDomainError } from '@acolhe-animal/shared';

import { requireCtx } from '@/lib/auth-context';
import {
  ManualCandidacyForm,
  type ManualCandidacyInitial,
} from '@/components/candidates/manual-candidacy-form';

export const dynamic = 'force-dynamic';

const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const strArr = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);

export default async function NewCandidacyPage({
  searchParams,
}: {
  searchParams: Promise<{ rascunho?: string }>;
}) {
  const ctx = await requireCtx();
  const { rascunho } = await searchParams;
  const animals = await listAnimals(ctx, { status: ['available', 'reserved'] });

  // Resume an existing draft (autosave landing). Ignore anything that isn't a
  // still-open draft of this org.
  let draftId: string | undefined;
  let initial: ManualCandidacyInitial | undefined;
  if (rascunho) {
    try {
      const app = await getApplication(ctx, rascunho);
      if (app.status === 'draft') {
        const [person, [animalRow]] = await Promise.all([
          getPersonByPk(ctx, app.personId),
          db.select({ id: animal.id }).from(animal).where(eq(animal.pk, app.animalId)).limit(1),
        ]);
        const cityRow = person.cityId
          ? (await db.select({ name: city.name, uf: city.stateCode }).from(city).where(eq(city.id, person.cityId)).limit(1))[0]
          : undefined;
        const a = (app.applicationData ?? {}) as Record<string, unknown>;
        draftId = app.id;
        initial = {
          animalId: animalRow?.id ?? '',
          name: person.name,
          phone: formatPhoneBR(person.phone),
          email: person.email ?? '',
          cpf: person.cpf ? formatCpf(person.cpf) : '',
          cityId: person.cityId ?? null,
          cityText: cityRow ? `${cityRow.name}, ${cityRow.uf}` : '',
          street: person.streetAddress ?? '',
          number: person.addressNumber ?? '',
          complement: person.addressComplement ?? '',
          neighborhood: person.addressNeighborhood ?? '',
          postalCode: person.postalCode ?? '',
          housing: str(a.housing),
          ownership: str(a.ownership),
          household: strArr(a.household),
          agreement: str(a.agreement),
          hasPets: str(a.hasPets),
          currentPets: str(a.currentPets),
          hadPets: str(a.hadPets),
          petHistory: str(a.petHistory),
          hoursAway: str(a.hoursAway),
          travel: str(a.travel),
          sleep: str(a.sleep),
          vet: str(a.vet),
          motivation: str(a.motivation),
          questions: str(a.questions),
        };
      }
    } catch (err) {
      if (!isDomainError(err)) throw err; // unknown draft → just start fresh
    }
  }

  return (
    <div className="pt-7">
      <ManualCandidacyForm
        animals={animals.map((a) => ({ id: a.id, name: a.name }))}
        draftId={draftId}
        initial={initial}
      />
    </div>
  );
}
