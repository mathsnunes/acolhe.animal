import { listAnimals } from '@acolhe-animal/domain';

import { requireCtx } from '@/lib/auth-context';
import { ManualCandidacyForm } from '@/components/candidates/manual-candidacy-form';

export const dynamic = 'force-dynamic';

export default async function NewCandidacyPage() {
  const ctx = await requireCtx();
  const animals = await listAnimals(ctx, { status: ['available', 'reserved'] });

  return (
    <div className="pt-7">
      <ManualCandidacyForm animals={animals.map((a) => ({ id: a.id, name: a.name }))} />
    </div>
  );
}
