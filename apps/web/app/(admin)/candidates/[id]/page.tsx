import Link from 'next/link';
import { MessageCircle } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { formatPhoneBR, formatRelative } from '@acolhe-animal/shared';
import {
  getApplication,
  getAnimalByPk,
  getPersonByPk,
  listEntityTimeline,
} from '@acolhe-animal/domain';
import { db, organizationMember, user } from '@acolhe-animal/db';
import { and, eq, isNull } from 'drizzle-orm';

import { requireCtx } from '@/lib/auth-context';
import { cn } from '@/lib/utils';
import { DetailBreadcrumb } from '@/components/page-header';
import { ApplicationFacts } from '@/components/candidates/application-facts';
import { StatusControl } from '@/components/candidates/status-control';
import { AssignControl, type OrgMember } from '@/components/candidates/assign-control';
import { InternalNotes } from '@/components/candidates/internal-notes';
import { EntityTimeline } from '@/components/candidates/entity-timeline';
import { FinalizeAdoptionDialog } from '@/components/candidates/finalize-adoption-dialog';
import { STATUS_META, statusLabelKey } from '@/components/candidates/status-meta';
import { whatsappHref } from '@/components/candidates/whatsapp';

export const dynamic = 'force-dynamic';

const listOrgMembers = async (organizationId: number): Promise<OrgMember[]> => {
  const rows = await db
    .select({ userId: organizationMember.userId, name: user.name })
    .from(organizationMember)
    .innerJoin(user, eq(organizationMember.userId, user.id))
    .where(
      and(
        eq(organizationMember.organizationId, organizationId),
        isNull(organizationMember.removedAt),
      ),
    );
  return rows;
};

export default async function CandidatoDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireCtx();
  const t = await getTranslations('candidates');

  const application = await getApplication(ctx, id);
  const [person, animal, timeline, members] = await Promise.all([
    getPersonByPk(ctx, application.personId),
    getAnimalByPk(ctx, application.animalId),
    listEntityTimeline(ctx, 'application', id),
    listOrgMembers(ctx.organizationId),
  ]);

  const meta = STATUS_META[application.status];
  const firstName = person.name.split(' ')[0] ?? person.name;
  const statusLabel = t(`status.${statusLabelKey(application.status)}`);

  return (
    <div className="px-6 py-7 sm:px-10">
      <DetailBreadcrumb href="/candidatos" label={t('detail.breadcrumb')} />

      <header className="mt-5">
        <h1 className="display text-4xl text-ink sm:text-5xl">{person.name}</h1>
        <p className="mt-2 text-sm text-ink-soft">
          {t('detail.wantsToAdopt')} <span className="text-ink">{animal.name}</span>
          <span className="text-ink-mute"> · {t(`species.${animal.species}`)}</span>
        </p>
      </header>

      {/* Status banner — current state of the candidacy at a glance */}
      <div
        className={cn(
          'mt-6 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border border-line-soft px-4 py-3 text-[13px]',
          meta.chip,
        )}
      >
        <span className={cn('size-1.5 rounded-full', meta.dot, application.status === 'new' && 'animate-pulse-dot')} aria-hidden />
        <span className="font-medium">
          {t('detail.bannerStatus', {
            status: statusLabel,
            when: formatRelative(application.statusChangedAt),
          })}
        </span>
        <span className="opacity-70">· {t('detail.bannerForAnimal', { animalName: animal.name })}</span>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_360px]">
        {/* Left — the candidate's answers, internal notes, history */}
        <div className="flex flex-col gap-6">
          <section className="rounded-xl border border-line-soft bg-paper p-6 shadow-card sm:p-7">
            <div className="mb-4">
              <p className="eyebrow">{t('detail.answersEyebrow')}</p>
              <h2 className="display mt-1.5 text-[22px] text-ink">{t('detail.answersTitle')}</h2>
            </div>
            <ApplicationFacts data={application.applicationData} />
          </section>

          <section className="rounded-xl border border-line-soft bg-bg-2 p-6 shadow-card sm:p-7">
            <p className="eyebrow eyebrow-mute mb-3">{t('detail.notesEyebrow')}</p>
            <InternalNotes
              applicationId={application.id}
              initialNotes={application.internalNotes ?? ''}
            />
          </section>

          <section className="rounded-xl border border-line-soft bg-paper p-6 shadow-card sm:p-7">
            <div className="mb-4">
              <p className="eyebrow">{t('detail.historyEyebrow')}</p>
              <h2 className="display mt-1.5 text-[22px] text-ink">{t('detail.historyTitle')}</h2>
            </div>
            <EntityTimeline events={timeline} />
          </section>
        </div>

        {/* Right — the conversation + the ONG's controls */}
        <aside className="flex flex-col gap-3.5">
          {/* The conversation — the real channel is WhatsApp */}
          <div className="rounded-xl bg-ink p-5 text-paper">
            <p className="eyebrow text-gold">{t('detail.contactEyebrow')}</p>
            <h2 className="display mt-1.5 text-[22px] text-paper">{t('detail.contactTitle')}</h2>
            <p className="mt-1 text-xs text-paper/60">{formatPhoneBR(person.phone)}</p>
            <a
              href={whatsappHref(
                person.phone,
                t('detail.whatsappMessage', { firstName, animalName: animal.name }),
              )}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full border border-green-soft/50 bg-green-soft/25 px-4 py-2.5 text-[13px] font-medium text-paper transition hover:bg-green-soft/40"
            >
              <MessageCircle className="size-4" /> {t('detail.whatsappCta', { firstName })}
            </a>
          </div>

          {/* Animal of interest */}
          <div className="rounded-xl border border-line-soft bg-paper p-5 shadow-card">
            <p className="eyebrow mb-2 flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-green-soft" aria-hidden />
              {t('detail.animalEyebrow')}
            </p>
            <p className="display text-[26px] leading-none text-ink">{animal.name}</p>
            <p className="mt-2 text-[13px] text-ink-soft">{t(`species.${animal.species}`)}</p>
            <Link
              href={`/animais/${animal.id}`}
              className="mt-3 inline-flex items-center gap-1 text-xs text-terra hover:underline"
            >
              {t('detail.animalLink')} →
            </Link>
          </div>

          {application.status === 'approved' && (
            <div className="rounded-xl border border-line-soft bg-paper p-5 shadow-card">
              <p className="eyebrow mb-3">{t('detail.nextStepEyebrow')}</p>
              <FinalizeAdoptionDialog
                applicationId={application.id}
                adopterName={person.name}
                animalName={animal.name}
              />
            </div>
          )}

          {/* State: status control + who is responsible */}
          <div className="rounded-xl border border-line-soft bg-paper p-5 shadow-card">
            <p className="eyebrow eyebrow-mute mb-3">{t('detail.moveEyebrow')}</p>
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium',
                meta.chip,
              )}
            >
              <span className={cn('size-1.5 rounded-full', meta.dot)} aria-hidden />
              {statusLabel}
            </span>
            <div className="mt-4">
              <StatusControl applicationId={application.id} status={application.status} />
            </div>

            <div className="mt-4 border-t border-line-soft pt-4">
              <p className="eyebrow eyebrow-mute mb-2 text-[10px]">{t('detail.whoCaresEyebrow')}</p>
              <AssignControl
                applicationId={application.id}
                members={members}
                assignedToUserId={application.assignedToUserId}
              />
            </div>
          </div>
        </aside>
      </div>

      <p className="mt-12 text-center text-xs text-ink-mute">
        <Link href="/candidatos" className="hover:text-ink">
          {t('detail.backToAll')}
        </Link>
      </p>
    </div>
  );
}
