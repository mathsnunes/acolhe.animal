import { notFound } from 'next/navigation';
import { FileText } from 'lucide-react';
import type { ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';

import { formatDateBR, formatPhoneBR, formatCpf } from '@acolhe-animal/shared';
import { listEntityTimeline } from '@acolhe-animal/domain';
import { db, adoption, animal } from '@acolhe-animal/db';
import { and, eq } from 'drizzle-orm';

import { requireCtx } from '@/lib/auth-context';
import { cn } from '@/lib/utils';
import { DetailBreadcrumb } from '@/components/page-header';
import { EntityTimeline } from '@/components/candidates/entity-timeline';
import { whatsappHref } from '@/components/candidates/whatsapp';

export const dynamic = 'force-dynamic';

export default async function AdocaoDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireCtx();
  const t = await getTranslations('adoptions');

  const [row] = await db
    .select({
      adoption,
      animalName: animal.name,
      animalSpecies: animal.species,
    })
    .from(adoption)
    .innerJoin(animal, eq(adoption.animalId, animal.id))
    .where(and(eq(adoption.id, id), eq(adoption.organizationId, ctx.organizationId)))
    .limit(1);

  if (!row) notFound();

  const a = row.adoption;
  const timeline = await listEntityTimeline(ctx, 'adoption', id);
  const addr = a.adopterAddress;
  const cancelled = a.cancelledAt !== null;
  const speciesLabel =
    row.animalSpecies === 'dog' || row.animalSpecies === 'cat'
      ? t(`species.${row.animalSpecies}`)
      : row.animalSpecies;

  return (
    <div className="px-6 py-7 sm:px-10">
      <DetailBreadcrumb href="/adocoes" label={t('detail.breadcrumb')} />

      <header className="mt-5">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'rounded-full px-3 py-1 text-xs font-medium',
              a.source === 'digital' ? 'bg-terra-bg text-terra' : 'bg-bg-2 text-ink-soft',
            )}
          >
            {a.source === 'digital' ? t('detail.sourceDigital') : t('detail.sourceOffline')}
          </span>
          {cancelled && (
            <span className="rounded-full bg-rose/15 px-3 py-1 text-xs font-medium text-rose">
              {t('detail.cancelled')}
            </span>
          )}
        </div>
        <h1 className="display mt-3 text-4xl text-ink sm:text-5xl">
          {t('detail.foundHome', { animalName: row.animalName })}
        </h1>
        <p className="mt-2 text-sm text-ink-soft">
          {speciesLabel} · {t('detail.adoptedOn', { date: formatDateBR(a.adoptedAt) })}
        </p>
      </header>

      <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_360px]">
        <div className="space-y-8">
          <section>
            <p className="eyebrow mb-3">{t('detail.adopterEyebrow')}</p>
            <dl className="divide-y divide-line-soft">
              <Fact label={t('detail.nameLabel')} value={a.adopterName} />
              <Fact label={t('detail.cpfLabel')} value={formatCpf(a.adopterDocument)} />
              <Fact
                label={t('detail.phoneLabel')}
                value={
                  <a
                    href={whatsappHref(a.adopterPhone)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-terra hover:underline"
                  >
                    {formatPhoneBR(a.adopterPhone)}
                  </a>
                }
              />
              <Fact
                label={t('detail.addressLabel')}
                value={[
                  `${addr.street}, ${addr.number}`,
                  addr.complement,
                  `${addr.city}/${addr.state}`,
                  addr.postalCode,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              />
            </dl>
          </section>

          {a.extraClauses && (
            <section>
              <p className="eyebrow mb-3">{t('detail.extraClausesEyebrow')}</p>
              <p className="whitespace-pre-line text-sm leading-relaxed text-ink">
                {a.extraClauses}
              </p>
            </section>
          )}

          {cancelled && a.cancellationReason && (
            <section>
              <p className="eyebrow mb-3">{t('detail.cancellationReasonEyebrow')}</p>
              <p className="text-sm leading-relaxed text-ink">{a.cancellationReason}</p>
            </section>
          )}
        </div>

        <aside className="space-y-8">
          <section>
            <p className="eyebrow mb-3">{t('detail.termEyebrow')}</p>
            <a
              href={a.termPdfUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-line bg-paper px-5 py-3 text-sm font-medium text-ink shadow-card transition hover:border-terra/40 hover:-translate-y-0.5"
            >
              <FileText className="size-4" /> {t('detail.openTerm')}
            </a>
          </section>

          <section>
            <p className="eyebrow mb-3">{t('detail.historyEyebrow')}</p>
            <EntityTimeline events={timeline} />
          </section>
        </aside>
      </div>
    </div>
  );
}

const Fact = ({ label, value }: { label: string; value: ReactNode }) => <div className="grid grid-cols-1 gap-1 py-3 sm:grid-cols-[120px_1fr] sm:gap-4">
      <dt className="text-xs font-medium uppercase tracking-wide text-ink-mute">{label}</dt>
      <dd className="text-sm leading-relaxed text-ink">{value}</dd>
    </div>;
