import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { getAnimal } from '@acolhe-animal/domain';
import { isDomainError } from '@acolhe-animal/shared';

import { PageHeaderForm } from '@/components/page-header';
import { AnimalForm } from '@/components/animals/animal-form';
import { requireCtx } from '@/lib/auth-context';
import { updateAnimalAction } from '../../actions';

export const dynamic = 'force-dynamic';

export default async function EditarAnimalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await requireCtx();
  const t = await getTranslations('animals');
  const { id } = await params;

  let animal;
  try {
    animal = await getAnimal(ctx, id);
  } catch (err) {
    if (isDomainError(err)) notFound();
    throw err;
  }

  return (
    <div className="pb-10">
      <PageHeaderForm
        backHref={`/animais/${id}`}
        backLabel={t('editPage.backLabel', { name: animal.name })}
        eyebrow={t('editPage.eyebrow')}
        title={
          <>
            {t('editPage.titleBefore')}
            <em>{animal.name}</em>
          </>
        }
        description={t('editPage.description')}
      />
      <AnimalForm animal={animal} onUpdate={updateAnimalAction.bind(null, id)} />
    </div>
  );
}
