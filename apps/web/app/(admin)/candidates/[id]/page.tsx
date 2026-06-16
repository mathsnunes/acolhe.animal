import Link from 'next/link';
import { ArrowLeft, ArrowRight, MessageCircle } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { formatCpf, formatPhoneBR, formatRelative } from '@acolhe-animal/shared';
import {
  countWaitingApplicationsByAnimal,
  getApplication,
  getAnimalByPk,
  getAnimalCovers,
  getPersonByPk,
  getPersonSignals,
  listEntityTimeline,
} from '@acolhe-animal/domain';
import { city, db, organizationMember, user, type TimelineEvent } from '@acolhe-animal/db';
import { and, eq, isNull } from 'drizzle-orm';

import { requireCtx } from '@/lib/auth-context';
import { cn } from '@/lib/utils';
import { ApplicationSections } from '@/components/candidates/application-sections';
import { AnimalSideCard } from '@/components/candidates/animal-side-card';
import { CandidateAlertsCard } from '@/components/candidates/candidate-alerts-card';
import { StatusControl } from '@/components/candidates/status-control';
import { AssignControl, type OrgMember } from '@/components/candidates/assign-control';
import { InternalNotes } from '@/components/candidates/internal-notes';
import { EntityTimeline } from '@/components/candidates/entity-timeline';
import { FinalizeAdoptionDialog } from '@/components/candidates/finalize-adoption-dialog';
import { STATUS_META, statusLabelKey } from '@/components/candidates/status-meta';
import { whatsappHref } from '@/components/candidates/whatsapp';

export const dynamic = 'force-dynamic';

const listOrgMembers = async (organizationId: number): Promise<OrgMember[]> =>
  db
    .select({ userId: organizationMember.userId, name: user.name })
    .from(organizationMember)
    .innerJoin(user, eq(organizationMember.userId, user.id))
    .where(
      and(
        eq(organizationMember.organizationId, organizationId),
        isNull(organizationMember.removedAt),
      ),
    );

export default async function CandidatoDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireCtx();
  const t = await getTranslations('candidates');

  const application = await getApplication(ctx, id);
  const [person, animal, timeline, members, covers, waitingByAnimal, signals] = await Promise.all([
    getPersonByPk(ctx, application.personId),
    getAnimalByPk(ctx, application.animalId),
    listEntityTimeline(ctx, 'application', id),
    listOrgMembers(ctx.organizationId),
    getAnimalCovers(ctx, [application.animalId]),
    countWaitingApplicationsByAnimal(ctx),
    getPersonSignals(ctx, application.personId, application.pk),
  ]);

  const meta = STATUS_META[application.status];
  const nameParts = person.name.trim().split(/\s+/);
  const firstName = nameParts[0] ?? person.name;
  const surname = nameParts.slice(1).join(' ');
  const statusLabel = t(`status.${statusLabelKey(application.status)}`);
  const isApproved = application.status === 'approved';
  const isAdopted = application.status === 'adopted';
  const currentUserId = ctx.actor.type === 'user' ? ctx.actor.userId : null;

  // Pre-fill the finalize form from the candidacy's Person, so the term data
  // collected when the candidacy was created isn't re-typed.
  const personCity =
    isApproved && person.cityId
      ? (
          await db
            .select({ name: city.name, uf: city.stateCode })
            .from(city)
            .where(eq(city.id, person.cityId))
            .limit(1)
        )[0]
      : undefined;
  const finalizeInitial = isApproved
    ? {
        document: person.cpf ? formatCpf(person.cpf) : '',
        street: person.streetAddress ?? '',
        number: person.addressNumber ?? '',
        complement: person.addressComplement ?? '',
        neighborhood: person.addressNeighborhood ?? '',
        postalCode: person.postalCode ?? '',
        city: personCity?.name ?? '',
        state: personCity?.uf ?? '',
        cityText: personCity ? `${personCity.name}, ${personCity.uf}` : '',
      }
    : undefined;

  // "Quem é" composite rows, from the form answers (falling back to the person record).
  const answers = (application.applicationData ?? {}) as Record<string, unknown>;
  const answer = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null);
  const contato = [formatPhoneBR(person.phone), answer(answers.email) ?? person.email]
    .filter(Boolean)
    .join(' · ');
  const ondeMora = [answer(answers.city), answer(answers.address)].filter(Boolean).join(' · ');

  // Resolve who triggered each timeline event: a member by id, or the candidate
  // for public-form events.
  const memberNames = Object.fromEntries(members.map((m) => [m.userId, m.name]));
  const actorName = (event: TimelineEvent): string | null => {
    if (event.actorUserId && memberNames[event.actorUserId]) return memberNames[event.actorUserId]!;
    const actorCtx = event.actorContext as { source?: string } | null;
    if (actorCtx?.source === 'public_form') return firstName;
    return null;
  };

  return (
    <div className="px-6 pt-7 pb-7 max-lg:pb-20 sm:px-10">
      {/* Page header — back eyebrow + name (mirrors the mockup's topbar context) */}
      <Link
        href="/candidatos"
        className="inline-flex items-center gap-1.5 text-[10.5px] font-medium uppercase tracking-[0.18em] text-terra hover:opacity-80"
      >
        <ArrowLeft className="size-3" strokeWidth={2} />
        {t('detail.backEyebrow')}
      </Link>
      <h1 className="display mt-2 text-4xl text-ink sm:text-5xl">{person.name}</h1>

      {/* Status banner — current state + the triage actions */}
      <div
        className={cn(
          'mt-6 flex flex-col gap-3 rounded-xl border border-line-soft px-4 py-3 sm:flex-row sm:items-center sm:justify-between',
          meta.chip,
        )}
      >
        <p className="text-[13px] leading-snug">
          <span
            className={cn('mr-2 inline-block size-1.5 rounded-full align-middle', meta.dot, application.status === 'new' && 'animate-pulse-dot')}
            aria-hidden
          />
          <span className="font-medium">
            {t('detail.bannerStatus', { status: statusLabel, when: formatRelative(application.statusChangedAt) })}
          </span>{' '}
          <span className="opacity-70">· {t('detail.bannerForAnimal', { animalName: animal.name })}</span>
        </p>
        {/* Triage actions live in the banner on desktop; on mobile they move to the
            sticky bottom bar (rendered once, below) so they stay thumb-reachable. */}
        <div className="hidden lg:block">
          <StatusControl applicationId={application.id} status={application.status} />
        </div>
      </div>

      {/* Two columns on desktop; on mobile the side cards come first */}
      <div className="mt-7 flex flex-col gap-6 lg:grid lg:grid-cols-[1fr_360px] lg:items-start lg:gap-8">
        {/* Left — who they are, their answers, notes, history */}
        <div className="order-2 flex flex-col gap-6 lg:order-1">
          {/* Quem é — identity card with the candidate's name + grouped contact/location */}
          <section className="section-card p-6 sm:p-7">
            <div className="mb-4">
              <p className="eyebrow">{t('detail.sections.whoEyebrow')}</p>
              <h2 className="display mt-1.5 text-[22px] text-ink">
                {firstName} {surname && <em>{surname}</em>}
              </h2>
            </div>
            <dl className="divide-y divide-line-soft">
              <div className="py-3 first:pt-0 last:pb-0">
                <dt className="mb-1 text-[10.5px] font-medium uppercase tracking-wide text-ink-mute">
                  {t('detail.contato')}
                </dt>
                <dd className="text-[13.5px] leading-relaxed text-ink">{contato}</dd>
              </div>
              {ondeMora && (
                <div className="py-3 first:pt-0 last:pb-0">
                  <dt className="mb-1 text-[10.5px] font-medium uppercase tracking-wide text-ink-mute">
                    {t('detail.ondeMora')}
                  </dt>
                  <dd className="text-[13.5px] leading-relaxed text-ink">{ondeMora}</dd>
                </div>
              )}
            </dl>
          </section>

          <ApplicationSections data={application.applicationData} animalName={animal.name} />

          <InternalNotes applicationId={application.id} initialNotes={application.internalNotes ?? ''} />

          <section className="section-card p-6 sm:p-7">
            <div className="mb-4">
              <p className="eyebrow">{t('detail.historyEyebrow')}</p>
              <h2 className="display mt-1.5 text-[22px] text-ink">{t('detail.historyTitle')}</h2>
            </div>
            <EntityTimeline events={timeline} actorName={actorName} />
          </section>
        </div>

        {/* Right — conversation, animal, signals, state */}
        <aside className="order-1 flex flex-col gap-3.5 lg:order-2">
          {/* The conversation — the real channel is WhatsApp */}
          <div className="rounded-xl bg-ink p-5 text-paper">
            <p className="eyebrow text-gold">{t('detail.contactEyebrow')}</p>
            <h2 className="display mt-1.5 text-[22px] text-paper">{t('detail.contactTitle')}</h2>
            <p className="mt-1 text-xs text-paper/60">{formatPhoneBR(person.phone)}</p>
            <a
              href={whatsappHref(person.phone, t('detail.whatsappMessage', { firstName, animalName: animal.name }))}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full border border-green-soft/50 bg-green-soft/25 px-4 py-2.5 text-[13px] font-medium text-paper transition hover:bg-green-soft/40"
            >
              <MessageCircle className="size-4" /> {t('detail.whatsappCta', { firstName })}
            </a>
          </div>

          <AnimalSideCard animal={animal} coverUrl={covers[animal.id]?.thumbUrl ?? null} waiting={waitingByAnimal[animal.id] ?? 0} />

          <CandidateAlertsCard signals={signals} />

          {/* State: status pill + who is responsible */}
          <div className="section-card p-[18px]">
            <p className="eyebrow eyebrow-mute mb-3">{t('detail.moveEyebrow')}</p>
            <span className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium', meta.chip)}>
              <span className={cn('size-1.5 rounded-full', meta.dot)} aria-hidden />
              {statusLabel}
            </span>
            <p className="mt-2 text-[11.5px] text-ink-mute">
              {t('detail.stateAgo', { when: formatRelative(application.statusChangedAt) })}
            </p>
            <div className="mt-4 border-t border-line-soft pt-4">
              <p className="eyebrow eyebrow-mute mb-2 text-[10px]">{t('detail.whoCaresEyebrow')}</p>
              <AssignControl
                applicationId={application.id}
                members={members}
                assignedToUserId={application.assignedToUserId}
                currentUserId={currentUserId}
              />
            </div>
          </div>

          {isApproved && (
            <div className="section-card p-[18px]">
              <p className="eyebrow mb-3">{t('detail.nextStepEyebrow')}</p>
              <FinalizeAdoptionDialog
                applicationId={application.id}
                animalId={animal.id}
                adopterName={person.name}
                animalName={animal.name}
                initial={finalizeInitial}
              />
            </div>
          )}

          {isAdopted && (
            <div className="section-card p-[18px]">
              <p className="eyebrow mb-3">{t('detail.adoptionDoneEyebrow')}</p>
              <Link
                href={`/animais/${animal.id}`}
                className="flex items-center justify-between gap-2 text-[13.5px] font-medium text-ink transition hover:text-terra"
              >
                {t('detail.adoptionDoneText')}
                <span className="inline-flex items-center gap-1 text-terra">
                  {t('detail.viewAdoption')} <ArrowRight className="size-4" />
                </span>
              </Link>
            </div>
          )}
        </aside>
      </div>

      {/* Mobile sticky action bar — sits just above the global bottom tab nav.
          Hidden when the candidacy is terminal (no transitions left). */}
      {application.status !== 'adopted' && (
        <div className="fixed inset-x-0 bottom-[var(--spacing-bottom-nav)] z-40 flex border-t border-line-soft bg-paper/95 px-4 py-3 backdrop-blur lg:hidden">
          <StatusControl applicationId={application.id} status={application.status} fill />
        </div>
      )}
    </div>
  );
}
