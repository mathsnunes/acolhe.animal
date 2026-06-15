import { useTranslations } from 'next-intl';

import { EmptyState } from '@/components/empty-state';

export default function CampaignsPage() {
  const t = useTranslations('emptyStates.campaigns');
  return <EmptyState eyebrow={t('eyebrow')} title={t('title')} description={t('description')} />;
}
