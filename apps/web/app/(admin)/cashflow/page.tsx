import { useTranslations } from 'next-intl';

import { EmptyState } from '@/components/empty-state';

export default function CashflowPage() {
  const t = useTranslations('emptyStates.cashflow');
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
