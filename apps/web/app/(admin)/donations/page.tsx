import { useTranslations } from 'next-intl';

import { EmptyState } from '@/components/empty-state';

export default function DonationsPage() {
  const t = useTranslations('emptyStates.donations');
  return (
    <EmptyState
      eyebrow={t('eyebrow')}
      title={t('title')}
      description={t('description')}
      actionHref="/config"
      actionLabel={t('action')}
    />
  );
}
