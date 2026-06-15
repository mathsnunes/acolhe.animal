import { useTranslations } from 'next-intl';

import { EmptyState } from '@/components/empty-state';

export default function SupportersPage() {
  const t = useTranslations('emptyStates.supporters');
  return <EmptyState eyebrow={t('eyebrow')} title={t('title')} description={t('description')} />;
}
