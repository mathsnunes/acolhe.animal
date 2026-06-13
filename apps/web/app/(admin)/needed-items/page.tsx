import { useTranslations } from 'next-intl';

import { EmptyState } from '@/components/empty-state';

export default function NeededItemsPage() {
  const t = useTranslations('emptyStates.neededItems');
  return <EmptyState eyebrow={t('eyebrow')} title={t('title')} description={t('description')} />;
}
