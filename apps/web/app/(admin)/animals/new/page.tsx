import { useTranslations } from 'next-intl';

import { PageHeaderForm } from '@/components/page-header';
import { AnimalForm } from '@/components/animals/animal-form';
import { createAnimalAction } from '../actions';

export const dynamic = 'force-dynamic';

export default function NovoAnimalPage() {
  const t = useTranslations('animals');
  return (
    <div className="pb-10">
      <PageHeaderForm
        backHref="/animais"
        backLabel={t('new.backLabel')}
        eyebrow={t('new.eyebrow')}
        title={
          <>
            {t('new.titleBefore')}
            <em>{t('new.titleEm')}</em>
          </>
        }
        description={t('new.description')}
      />
      <AnimalForm onCreate={createAnimalAction} />
    </div>
  );
}
