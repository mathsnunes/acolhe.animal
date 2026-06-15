import Link from 'next/link';
import { FileText } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { formatDateBR } from '@acolhe-animal/shared';
import { listAnimals } from '@acolhe-animal/domain';
import { db, adoption, animal } from '@acolhe-animal/db';
import { desc, eq } from 'drizzle-orm';

import { requireCtx } from '@/lib/auth-context';
import { cn } from '@/lib/utils';
import { PageHeaderHero } from '@/components/page-header';
import { EmptyState } from '@/components/empty-state';
import {
  OfflineAdoptionForm,
  type AdoptableAnimal,
} from '@/components/candidates/offline-adoption-form';

export const dynamic = 'force-dynamic';

interface AdoptionRow {
  id: string;
  source: 'digital' | 'offline';
  adopterName: string;
  termPdfUrl: string;
  adoptedAt: Date;
  cancelledAt: Date | null;
  animalName: string;
}

const listAdoptions = async (organizationId: number): Promise<AdoptionRow[]> => {
  const rows = await db
    .select({
      id: adoption.id,
      source: adoption.source,
      adopterName: adoption.adopterName,
      termPdfUrl: adoption.termPdfUrl,
      adoptedAt: adoption.adoptedAt,
      cancelledAt: adoption.cancelledAt,
      animalName: animal.name,
    })
    .from(adoption)
    .innerJoin(animal, eq(adoption.animalId, animal.pk))
    .where(eq(adoption.organizationId, organizationId))
    .orderBy(desc(adoption.adoptedAt));
  return rows as AdoptionRow[];
};

export default async function AdocoesPage() {
  const ctx = await requireCtx();
  const t = await getTranslations('adoptions');

  const [adoptions, animals] = await Promise.all([
    listAdoptions(ctx.organizationId),
    listAnimals(ctx, { status: ['available', 'reserved'] }),
  ]);

  const adoptableAnimals: AdoptableAnimal[] = animals.map((a) => ({ id: a.id, name: a.name }));
  const active = adoptions.filter((a) => a.cancelledAt === null).length;

  return (
    <div>
      <PageHeaderHero
        title={t('page.title')}
        description={t('page.description')}
        metric={{ value: active, label: t('page.metricLabel') }}
        actions={<OfflineAdoptionForm animals={adoptableAnimals} />}
      />

      {adoptions.length === 0 ? (
        <EmptyState
          eyebrow={t('empty.eyebrow')}
          title={t('empty.title')}
          description={t('empty.description')}
          actionHref="/candidatos"
          actionLabel={t('empty.actionLabel')}
        />
      ) : (
        <div className="px-6 pb-16 sm:px-10">
          <ul className="divide-y divide-line-soft overflow-hidden rounded-lg border border-line bg-paper shadow-card">
            {adoptions.map((row) => (
              <AdoptionListItem
                key={row.id}
                row={row}
                labels={{
                  adoptedBy: t('list.adoptedBy', { adopterName: row.adopterName }),
                  sourceDigital: t('list.sourceDigital'),
                  sourceOffline: t('list.sourceOffline'),
                  cancelled: t('list.cancelled'),
                  term: t('list.term'),
                }}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

const AdoptionListItem = ({
  row,
  labels,
}: {
  row: AdoptionRow;
  labels: {
    adoptedBy: string;
    sourceDigital: string;
    sourceOffline: string;
    cancelled: string;
    term: string;
  };
}) => {
  const cancelled = row.cancelledAt !== null;
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4">
      <Link href={`/adocoes/${row.id}`} className="min-w-0 flex-1 group">
        <p className={cn('font-medium text-ink group-hover:text-terra', cancelled && 'line-through text-ink-mute')}>
          {row.animalName}
        </p>
        <p className="text-sm text-ink-soft">{labels.adoptedBy}</p>
      </Link>

      <span
        className={cn(
          'rounded-full px-2.5 py-0.5 text-xs font-medium',
          row.source === 'digital' ? 'bg-terra-bg text-terra' : 'bg-bg-2 text-ink-soft',
        )}
      >
        {row.source === 'digital' ? labels.sourceDigital : labels.sourceOffline}
      </span>

      {cancelled && (
        <span className="rounded-full bg-rose/15 px-2.5 py-0.5 text-xs font-medium text-rose">
          {labels.cancelled}
        </span>
      )}

      <span className="text-sm text-ink-mute">{formatDateBR(row.adoptedAt)}</span>

      <a
        href={row.termPdfUrl}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1.5 text-sm text-terra hover:underline"
        onClick={(e) => e.stopPropagation()}
      >
        <FileText className="size-4" /> {labels.term}
      </a>
    </li>
  );
};
