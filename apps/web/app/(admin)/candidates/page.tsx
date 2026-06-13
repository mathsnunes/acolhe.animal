import { getTranslations } from 'next-intl/server';

import { listApplications } from '@acolhe-animal/domain';

import { requireCtx } from '@/lib/auth-context';
import { PageHeaderHero } from '@/components/page-header';
import { EmptyState } from '@/components/empty-state';
import { Kanban } from '@/components/candidates/kanban';

export const dynamic = 'force-dynamic';

export default async function CandidatosPage() {
  const ctx = await requireCtx();
  const t = await getTranslations('candidates');
  const applications = await listApplications(ctx);

  const waiting = applications.filter(
    (a) => a.status === 'new' || a.status === 'in-progress',
  ).length;

  return (
    <div>
      <PageHeaderHero
        title={t('page.title')}
        description={t('page.description')}
        metric={{ value: waiting, label: t('page.metricLabel') }}
      />

      {applications.length === 0 ? (
        <EmptyState
          eyebrow={t('empty.eyebrow')}
          title={t('empty.title')}
          description={t('empty.description')}
          actionHref="/animais"
          actionLabel={t('empty.actionLabel')}
        />
      ) : (
        <Kanban applications={applications} />
      )}
    </div>
  );
}
