import type { ReactNode } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { AlertTriangle, ArrowRight, FileText, Pencil } from 'lucide-react';

import {
  countWaitingApplicationsByAnimal,
  getAdoptionByAnimal,
  getAnimal,
  getApprovedApplicationForAnimal,
  listAnimalPhotos,
  listAnimalVideos,
  listEntityTimeline,
  listInstagramArt,
  listResponsibleMembers,
} from '@acolhe-animal/domain';
import { formatCep, formatCpf, formatDateBR, formatPhoneBR, formatRelative, isDomainError } from '@acolhe-animal/shared';
import type { Animal, TimelineEvent } from '@acolhe-animal/db';

import { DetailBreadcrumb } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { StatusPill } from '@/components/animals/status-pill';
import { AnimalActionsMenu } from '@/components/animals/animal-actions-menu';
import { AnimalGallery } from '@/components/animals/animal-gallery';
import {
  clinicalTypeLabel,
  energyLabel,
  formatAge,
  neuteredLabel,
  sizeLabel,
  sociabilityLabel,
  speciesNounLabel,
} from '@/components/animals/labels';
import type { Translator } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { requireCtx } from '@/lib/auth-context';
import { whatsappHref } from '@/components/candidates/whatsapp';
import { FinalizeAdoptionDialog } from '@/components/candidates/finalize-adoption-dialog';
import { ReturnAdoptionDialog } from '@/components/adoptions/return-adoption-dialog';
import { EditAdoptionDialog } from '@/components/adoptions/edit-adoption-dialog';
import { OpenCandidaciesNote } from '@/components/animals/open-candidacies-note';
import { InstagramArtDialog } from '@/components/animals/instagram-art-dialog';
import { archiveAnimalAction, unarchiveAnimalAction } from '../actions';

export const dynamic = 'force-dynamic';

/** Timeline event types known to this view → their `detail.events.*` message key
 *  (next-intl forbids "." in keys, so eventType ids are mapped to camelCase). */
const EVENT_LABEL_KEY: Record<string, string> = {
  'animal.created': 'animalCreated',
  'animal.archived': 'animalArchived',
  'animal.unarchived': 'animalUnarchived',
};

/** Dot color per sociability value (mirrors the prototype's `.dot-*`). */
const SOCIABILITY_DOT: Record<NonNullable<Animal['goodWithChildren']>, string> = {
  yes: 'bg-green',
  'with-care': 'bg-gold',
  no: 'bg-rose',
  unknown: 'bg-ink-mute',
};

/** "abr · 2024" — short month + year for the intake quick-stat. */
const monthYear = (date: Date | string): string => {
  const d = new Date(date);
  const month = new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(d).replace('.', '');
  return `${month} · ${d.getFullYear()}`;
};

/** Vaccine dates are stored as `YYYY-MM-DD`; anchor to local midnight to avoid a tz
 *  shift, and fall back to the raw value when it isn't a parseable date. */
const formatVaccineDate = (date: string): string => {
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(`${date}T00:00:00`) : new Date(date);
  return Number.isNaN(parsed.getTime()) ? date : formatDateBR(parsed);
};

export default async function AnimalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await requireCtx();
  const t = await getTranslations('animals');
  const tA = await getTranslations('adoptions');
  const { id } = await params;

  let animal: Animal;
  try {
    animal = await getAnimal(ctx, id);
  } catch (err) {
    if (isDomainError(err)) notFound();
    throw err;
  }

  const [timeline, photos, videos, waitingCounts, adoption, approvedApp, instagramArt] = await Promise.all([
    listEntityTimeline(ctx, 'animal', id),
    listAnimalPhotos(ctx, id),
    listAnimalVideos(ctx, id),
    countWaitingApplicationsByAnimal(ctx),
    animal.status === 'adopted' ? getAdoptionByAnimal(ctx, id) : Promise.resolve(null),
    animal.status === 'reserved' ? getApprovedApplicationForAnimal(ctx, id) : Promise.resolve(null),
    listInstagramArt(ctx, id),
  ]);

  const responsibleMembers =
    animal.status === 'reserved' || animal.status === 'adopted' ? await listResponsibleMembers(ctx) : [];
  const currentUserId = ctx.actor.type === 'user' ? ctx.actor.userId : null;

  const archived = animal.archivedAt != null;
  const candidates = waitingCounts[id] ?? 0;
  const adoptionRecord = adoption?.adoption ?? null;
  const isAdopted = animal.status === 'adopted';

  // One narrative field today: short phrases live as the hero tagline, written-out
  // multi-paragraph stories render as the "história" section below. (Splitting into
  // a dedicated `story` column is a follow-up.)
  const story = animal.shortStory?.trim() ?? '';
  const longStory = story.length > 140 || story.includes('\n');
  const storyParagraphs = story
    .split(/\n{2,}|\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const weight = animal.weightKg ? `${Number(animal.weightKg)}kg` : null;
  const porte =
    [animal.size ? sizeLabel(t, animal.size) : null, weight].filter(Boolean).join(' · ') ||
    t('detail.empty');

  const behaviorItems = [
    { label: t('detail.sociability.children'), value: animal.goodWithChildren ?? 'unknown' },
    { label: t('detail.sociability.dogs'), value: animal.goodWithDogs ?? 'unknown' },
    { label: t('detail.sociability.cats'), value: animal.goodWithCats ?? 'unknown' },
    { label: t('detail.sociability.strangers'), value: animal.goodWithStrangers ?? 'unknown' },
  ] satisfies { label: string; value: NonNullable<Animal['goodWithChildren']> }[];

  const hasBehavior =
    animal.energyLevel != null ||
    (animal.quirks?.trim().length ?? 0) > 0 ||
    behaviorItems.some((b) => b.value !== 'unknown');

  return (
    <div className="mx-auto max-w-[1120px] px-6 pb-20 pt-7 sm:px-7">
      <DetailBreadcrumb href="/animais" label={t('detail.breadcrumb')} />

      {/* Hero — gallery + identity */}
      <div className="mt-4 grid grid-cols-1 gap-9 lg:grid-cols-[minmax(0,460px)_1fr]">
        <AnimalGallery photos={photos} videos={videos} name={animal.name} />

        <div>
          <div className="flex flex-wrap items-center gap-2">
            {animal.status === 'available' && !archived ? (
              <span className="inline-flex items-center gap-2 rounded-full bg-green/10 px-3.5 py-1.5 text-xs font-medium text-green">
                <span className="size-1.5 rounded-full bg-green" aria-hidden />
                {t('detail.availableForAdoption')}
              </span>
            ) : (
              <StatusPill status={animal.status} className="px-3.5 py-1.5 text-[12px]" />
            )}
            {archived && (
              <span className="rounded-full bg-bg-2 px-3 py-1 text-xs font-medium text-ink-mute">
                {t('detail.archivedAt', { date: formatRelative(animal.archivedAt!) })}
              </span>
            )}
          </div>

          <h1 className="display mt-4 text-[44px] leading-none text-ink sm:text-[56px]">
            {animal.name}
          </h1>
          {story && !longStory && (
            <p className="mt-2 max-w-xl font-display text-xl italic text-terra">{story}</p>
          )}

          {/* Quick-stats strip — bordered top + bottom (prototype `.detail-info__quick`). */}
          <dl className="my-6 flex flex-wrap gap-x-8 gap-y-5 border-y border-line py-5">
            <QuickStat
              label={t('detail.factSpecies')}
              value={speciesNounLabel(t, animal.species, animal.sex)}
            />
            <QuickStat label={t('detail.factAge')} value={formatAge(t, animal) ?? t('detail.empty')} />
            <QuickStat label={t('detail.factSize')} value={porte} />
            <QuickStat label={t('detail.factIntake')} value={monthYear(animal.intakeDate)} />
            {animal.microchipCode && (
              <QuickStat label={t('detail.factMicrochip')} value={animal.microchipCode} />
            )}
          </dl>

          <div className="mt-4 flex flex-wrap gap-2.5">
            <Button asChild>
              <Link href={`/animais/${id}/editar`}>
                <Pencil /> {t('detail.editFicha')}
              </Link>
            </Button>
            <InstagramArtDialog
              animalId={id}
              animalName={animal.name}
              photos={photos.map((p) => ({ id: p.id, thumbUrl: p.thumbUrl, isPrimary: p.isPrimary }))}
              initialArt={instagramArt.map((a) => ({
                type: a.type,
                imageUrl: a.imageUrl,
                caption: a.caption,
                generatedAt: new Date(a.generatedAt).toISOString(),
              }))}
            />
            <AnimalActionsMenu
              archived={archived}
              action={
                archived
                  ? unarchiveAnimalAction.bind(null, id)
                  : archiveAnimalAction.bind(null, id)
              }
            />
          </div>
        </div>
      </div>

      {/* Reserved — an approved candidacy is holding this animal: offer the
          "formalizar adoção" shortcut right here, no detour to the candidate. */}
      {approvedApp && (
        <section className="mt-9 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-terra/30 bg-terra-bg/40 px-6 py-5">
          <div className="min-w-0">
            <p className="eyebrow text-terra">{t('detail.approvedEyebrow')}</p>
            <p className="mt-1 text-[14px] text-ink">
              {t('detail.approvedReadyToFinalize', { adopterName: approvedApp.adopterName })}
            </p>
          </div>
          <FinalizeAdoptionDialog
            applicationId={approvedApp.applicationId}
            animalId={id}
            adopterName={approvedApp.adopterName}
            animalName={animal.name}
            triggerClassName="shrink-0"
            responsibleMembers={responsibleMembers}
            currentUserId={currentUserId}
          />
        </section>
      )}

      {/* Adoption — the full record now lives on the animal once it's adopted:
          adopter, term, origin and the return action, all in one place. */}
      {adoptionRecord && (
        <section className="mt-9 rounded-2xl border border-line bg-paper px-6 py-5">
          <div className="mb-4 flex items-center justify-between gap-2">
            <p className="eyebrow">{t('detail.adoptionEyebrow')}</p>
            <span
              className={cn(
                'rounded-full px-3 py-1 text-xs font-medium',
                adoptionRecord.source === 'digital'
                  ? 'bg-terra-bg text-terra'
                  : 'bg-bg-2 text-ink-soft',
              )}
            >
              {adoptionRecord.source === 'digital'
                ? tA('detail.sourceDigital')
                : tA('detail.sourceOffline')}
            </span>
          </div>

          <dl className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
            <Fact label={tA('detail.nameLabel')} value={adoptionRecord.adopterName} />
            <Fact label={tA('detail.cpfLabel')} value={formatCpf(adoptionRecord.adopterDocument)} />
            <Fact
              label={tA('detail.phoneLabel')}
              value={
                <a
                  href={whatsappHref(adoptionRecord.adopterPhone)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-terra hover:underline"
                >
                  {formatPhoneBR(adoptionRecord.adopterPhone)}
                </a>
              }
            />
            <Fact label={tA('detail.adoptedAtLabel')} value={formatDateBR(adoptionRecord.adoptedAt)} />
            <div className="sm:col-span-2">
              <Fact
                label={tA('detail.addressLabel')}
                value={[
                  `${adoptionRecord.adopterAddress.street}, ${adoptionRecord.adopterAddress.number}`,
                  adoptionRecord.adopterAddress.complement,
                  `${adoptionRecord.adopterAddress.city}/${adoptionRecord.adopterAddress.state}`,
                  adoptionRecord.adopterAddress.postalCode,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              />
            </div>
          </dl>

          {adoption?.originApplicationId && (
            <div className="mt-4 border-t border-line-soft pt-3">
              <Link
                href={`/candidatos/${adoption.originApplicationId}`}
                className="group inline-flex flex-wrap items-center gap-1.5 text-[13px] text-ink"
              >
                {tA('detail.originCandidacy', { adopterName: adoptionRecord.adopterName })}
                <span className="text-terra group-hover:underline">
                  · {tA('detail.originView')} ›
                </span>
              </Link>
            </div>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-2.5">
            <a
              href={adoptionRecord.termPdfUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-line bg-paper px-5 py-2.5 text-sm font-medium text-ink shadow-card transition hover:border-terra/40 hover:-translate-y-0.5"
            >
              <FileText className="size-4" /> {tA('detail.openTerm')}
            </a>
            {adoptionRecord.source === 'digital' && (
              <EditAdoptionDialog
                adoptionId={adoptionRecord.id}
                animalId={id}
                responsibleMembers={responsibleMembers}
                initialResponsibleUserId={
                  responsibleMembers.find((m) => m.phone === adoptionRecord.responsiblePhone)?.userId ??
                  currentUserId
                }
                initial={{
                  adopterName: adoptionRecord.adopterName,
                  document: formatCpf(adoptionRecord.adopterDocument),
                  phone: formatPhoneBR(adoptionRecord.adopterPhone),
                  street: adoptionRecord.adopterAddress.street ?? '',
                  number: adoptionRecord.adopterAddress.number ?? '',
                  complement: adoptionRecord.adopterAddress.complement ?? '',
                  neighborhood: adoptionRecord.adopterAddress.neighborhood ?? '',
                  city: adoptionRecord.adopterAddress.city ?? '',
                  state: adoptionRecord.adopterAddress.state ?? '',
                  postalCode: adoptionRecord.adopterAddress.postalCode
                    ? formatCep(adoptionRecord.adopterAddress.postalCode)
                    : '',
                  cityText:
                    adoptionRecord.adopterAddress.city && adoptionRecord.adopterAddress.state
                      ? `${adoptionRecord.adopterAddress.city}, ${adoptionRecord.adopterAddress.state}`
                      : '',
                  extraClauses: adoptionRecord.extraClauses ?? '',
                }}
              />
            )}
            <ReturnAdoptionDialog adoptionId={adoptionRecord.id} animalName={animal.name} />
          </div>
        </section>
      )}

      {/* Candidates — prominent while the animal is in process; once adopted the
          still-open candidacies drop to a quiet note (kept for record / returns). */}
      {candidates > 0 &&
        (isAdopted ? (
          <OpenCandidaciesNote
            animalId={id}
            count={candidates}
            viewHref={`/candidatos?animal=${id}`}
          />
        ) : (
          <div className="mt-9 flex flex-wrap items-center justify-between gap-5 rounded-2xl border border-line bg-paper px-6 py-5">
            <div className="flex items-center gap-4">
              <span className="font-display text-[40px] font-light leading-none text-terra">
                {candidates}
              </span>
              <p className="text-[13.5px] text-ink">
                {t('detail.candidatesWaiting', { count: candidates })}
              </p>
            </div>
            <Button asChild>
              <Link href={`/candidatos?animal=${id}`}>
                {t('detail.viewCandidates')} <ArrowRight />
              </Link>
            </Button>
          </div>
        ))}

      {/* Clinical banner — temporary health state that the adopter must know. */}
      {animal.clinicalCondition && (
        <div className="mt-6 flex items-start gap-3.5 rounded-xl bg-terra-bg px-5 py-4">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-terra" aria-hidden />
          <div>
            <p className="text-[13px] font-semibold text-terra">
              {clinicalTypeLabel(t, animal.clinicalCondition.type)}
            </p>
            <p className="mt-1 text-[13px] leading-relaxed text-ink">
              {animal.clinicalCondition.description}
              {animal.clinicalCondition.expectedResolution && (
                <span className="text-ink-soft">
                  {' '}
                  {t('detail.clinicalExpectedResolution', {
                    value: animal.clinicalCondition.expectedResolution,
                  })}
                </span>
              )}
            </p>
            {animal.clinicalCondition.needsSpecialAdopter && (
              <p className="mt-1.5 text-xs text-terra">{t('detail.needsSpecialAdopter')}</p>
            )}
          </div>
        </div>
      )}

      {/* Health + vaccines */}
      <div className="mt-9 grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <CardTitle>{t('detail.healthTitle')}</CardTitle>
          <dl className="grid grid-cols-[130px_1fr] gap-x-4 gap-y-2.5 text-[13px]">
            <dt className="text-ink-mute">{t('detail.factNeutered')}</dt>
            <dd className="font-medium text-ink">
              {animal.neutered ? neuteredLabel(t, animal.neutered) : t('detail.empty')}
            </dd>
            <dt className="text-ink-mute">{t('detail.dewormingsTitle')}</dt>
            <dd className="font-medium text-ink">
              {animal.dewormings.length > 0
                ? animal.dewormings.map((d) => d.product || formatVaccineDate(d.date)).join(', ')
                : t('detail.dewormingsEmpty')}
            </dd>
            <dt className="text-ink-mute">{t('detail.healthSpecialConditions')}</dt>
            <dd className="font-medium text-ink">
              {animal.specialConditions.length > 0
                ? animal.specialConditions.join(', ')
                : t('detail.healthNoSpecialConditions')}
            </dd>
          </dl>
        </Card>

        <Card>
          <CardTitle>{t('detail.vaccinesTitle')}</CardTitle>
          {animal.vaccinations.length > 0 ? (
            <div className="mt-2.5 flex flex-col gap-2.5">
              {animal.vaccinations.map((v, i) => (
                <div
                  key={`${v.name}-${i}`}
                  className="flex items-center justify-between gap-3 rounded-[10px] bg-bg px-3.5 py-2.5 text-[13px]"
                >
                  <span className="font-medium text-ink">{v.name}</span>
                  <span className="shrink-0 text-[11.5px] text-ink-mute">
                    {formatVaccineDate(v.date)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="hint">{t('detail.vaccinesEmpty')}</p>
          )}
        </Card>
      </div>

      {/* Behavior */}
      {hasBehavior && (
        <section className="mt-9">
          <div className="mb-4 flex items-baseline justify-between gap-3">
            <h2 className="font-display text-[22px] leading-tight tracking-[-0.02em] text-ink">
              {t('detail.behaviorTitle')}
            </h2>
            <span className="eyebrow eyebrow-mute">{t('detail.behaviorEyebrow')}</span>
          </div>

          <Card>
            <dl className="grid grid-cols-[160px_1fr] gap-x-4 gap-y-2.5 text-[13px]">
              {animal.energyLevel && (
                <>
                  <dt className="text-ink-mute">{t('detail.behaviorEnergy')}</dt>
                  <dd className="font-medium text-ink">{energyLabel(t, animal.energyLevel)}</dd>
                </>
              )}
              {animal.quirks?.trim() && (
                <>
                  <dt className="text-ink-mute">{t('detail.behaviorQuirks')}</dt>
                  <dd className="font-medium text-ink">{animal.quirks}</dd>
                </>
              )}
            </dl>

            <div className="divider-soft my-[18px]" />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {behaviorItems.map((item) => (
                <div key={item.label} className="rounded-[10px] bg-bg px-3.5 py-3 text-[12.5px]">
                  <div className="mb-1 text-ink-mute">{item.label}</div>
                  <div className="flex items-center gap-1.5 font-medium text-ink">
                    <span
                      className={`size-2 rounded-full ${SOCIABILITY_DOT[item.value]}`}
                      aria-hidden
                    />
                    {sociabilityLabel(t, item.value)}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </section>
      )}

      {/* Story — the long-form narrative shown on the portal. */}
      {longStory && storyParagraphs.length > 0 && (
        <section className="mt-9">
          <div className="mb-4 flex items-baseline justify-between gap-3">
            <h2 className="font-display text-[22px] leading-tight tracking-[-0.02em] text-ink">
              {t('detail.storyTitle', { name: animal.name })}
            </h2>
            <span className="eyebrow eyebrow-mute">{t('detail.storyEyebrow')}</span>
          </div>
          <Card>
            <div className="space-y-3.5 text-sm leading-[1.7] text-ink-soft">
              {storyParagraphs.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </Card>
        </section>
      )}

      {/* Timeline */}
      <div className="divider my-10" />
      <p className="eyebrow mb-4">{t('detail.timelineTitle')}</p>
      <Timeline events={timeline} t={t} />
    </div>
  );
}

/** The white, hairline-bordered content card used across the detail sections. */
const Card = ({ children }: { children: ReactNode }) => (
  <div className="rounded-[14px] border border-line bg-paper p-6">{children}</div>
);

const CardTitle = ({ children }: { children: ReactNode }) => (
  <h3 className="mb-3.5 font-display text-[22px] tracking-[-0.02em] text-ink">{children}</h3>
);

/** Label/value row in the adoption card: uppercase mute label, plain value. */
const Fact = ({ label, value }: { label: string; value: ReactNode }) => (
  <div>
    <dt className="mb-1 text-[10px] font-medium uppercase tracking-[0.07em] text-ink-mute">
      {label}
    </dt>
    <dd className="text-sm leading-relaxed text-ink">{value}</dd>
  </div>
);

/** Quick-stat cell in the detail hero strip: uppercase mute label, Fraunces value. */
const QuickStat = ({ label, value }: { label: string; value: string }) => (
  <div className="min-w-0">
    <dt className="mb-1 whitespace-nowrap text-[10.5px] font-medium uppercase tracking-[0.18em] text-ink-mute">
      — {label}
    </dt>
    <dd className="font-display text-lg leading-snug text-ink">{value}</dd>
  </div>
);

const Timeline = ({ events, t }: { events: TimelineEvent[]; t: Translator }) => {
  if (events.length === 0) {
    return <p className="text-sm text-ink-soft">{t('detail.timelineEmpty')}</p>;
  }
  return (
    <ul className="space-y-3">
      {events.map((event) => {
        const labelKey = EVENT_LABEL_KEY[event.eventType];
        return (
          <li key={event.id} className="flex items-baseline gap-3 text-sm">
            <span className="size-1.5 shrink-0 translate-y-1.5 rounded-full bg-terra" />
            <span className="text-ink">
              {labelKey ? t(`detail.events.${labelKey}`) : event.eventType}
            </span>
            <span className="ml-auto shrink-0 text-xs text-ink-mute">
              {formatRelative(event.occurredAt)}
            </span>
          </li>
        );
      })}
    </ul>
  );
};
