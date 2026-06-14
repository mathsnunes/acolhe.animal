import { notFound } from 'next/navigation';

import { getAnimal } from '@acolhe-animal/domain';
import { isDomainError } from '@acolhe-animal/shared';

import { AnimalWizard } from '@/components/animals/animal-wizard';
import { requireCtx } from '@/lib/auth-context';

export const dynamic = 'force-dynamic';

const EditarAnimalPage = async ({ params }: { params: Promise<{ id: string }> }) => {
  const ctx = await requireCtx();
  const { id } = await params;

  let animal;
  try {
    animal = await getAnimal(ctx, id);
  } catch (err) {
    if (isDomainError(err)) notFound();
    throw err;
  }

  return (
    <div className="py-8">
      <AnimalWizard animal={animal} />
    </div>
  );
};

export default EditarAnimalPage;
