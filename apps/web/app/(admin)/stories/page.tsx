import { useTranslations } from 'next-intl';

import { EmptyState } from '@/components/empty-state';

export default function StoriesPage() {
  const t = useTranslations('emptyStates.stories');
  return <EmptyState eyebrow={t('eyebrow')} title={t('title')} description={t('description')} />;
}
