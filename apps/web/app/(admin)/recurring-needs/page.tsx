import { useTranslations } from 'next-intl';

import { EmptyState } from '@/components/empty-state';

export default function RecurringNeedsPage() {
  const t = useTranslations('emptyStates.recurringNeeds');
  return <EmptyState eyebrow={t('eyebrow')} title={t('title')} description={t('description')} />;
}
