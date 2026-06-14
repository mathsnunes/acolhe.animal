'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { isValidPhoneBR } from '@acolhe-animal/shared';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { AnimalPhoto } from './animal-photo';
import {
  saveDraftAction,
  startApplicationAction,
  submitApplicationAction,
} from '@/app/[slug]/actions';
import {
  agreementOptions,
  hadPetsOptions,
  hasPetsOptions,
  hoursAwayOptions,
  householdOptions,
  housingOptions,
  ownershipOptions,
  sleepOptions,
  valueLabels,
  vetOptions,
} from './adoption-form-options';
import {
  CheckList,
  Field,
  FieldExplanation,
  PhoneInput,
  RadioCards,
  SectionTitle,
} from './form-controls';

const TOTAL_STEPS = 6;
const STEP_NAME_KEYS = [
  'steps.identification',
  'steps.aboutYou',
  'steps.housing',
  'steps.pets',
  'steps.routine',
  'steps.review',
] as const;

type FormData = Record<string, unknown>;
type SaveState = 'idle' | 'saving' | 'saved';

export const AdoptionForm = ({
  slug,
  animalId,
  animalName,
  animalSpecies,
  animalPhotoUrl,
  animalMeta,
  animalStory,
}: {
  slug: string;
  animalId: string;
  animalName: string;
  animalSpecies: 'dog' | 'cat';
  animalPhotoUrl?: string | null;
  animalMeta?: string;
  animalStory?: string | null;
}) => {
  const t = useTranslations('form');
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<FormData>({});
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('idle');

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const str = (key: string): string =>
    typeof data[key] === 'string' ? (data[key] as string) : '';
  const arr = (key: string): string[] =>
    Array.isArray(data[key]) ? (data[key] as string[]) : [];

  const set = useCallback((key: string, value: unknown) => {
    setData((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: '' } : prev));
  }, []);

  // ── Debounced autosave (only once a draft exists) ─────────────
  useEffect(() => {
    if (!applicationId) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaveState('saving');
    saveTimer.current = setTimeout(async () => {
      const res = await saveDraftAction(slug, applicationId, data);
      setSaveState(res.ok ? 'saved' : 'idle');
    }, 900);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [data, applicationId, slug]);

  const goTo = (next: number) => {
    setStep(next);
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ── Per-step validation ───────────────────────────────────────
  const validateStep = (current: number): boolean => {
    const next: Record<string, string> = {};
    if (current === 1) {
      if (!str('name').trim()) next.name = t('validation.name');
      if (!str('phone').trim()) next.phone = t('validation.phoneRequired');
      else if (!isValidPhoneBR(str('phone'))) next.phone = t('validation.phoneInvalid');
    }
    if (current === 3) {
      if (!str('housing')) next.housing = t('validation.housing');
      if (!str('ownership')) next.ownership = t('validation.ownership');
      if (!str('agreement')) next.agreement = t('validation.agreement');
    }
    if (current === 5) {
      if (!str('hoursAway')) next.hoursAway = t('validation.hoursAway');
      if (!str('sleep')) next.sleep = t('validation.sleep', { animalName });
      if (!str('vet')) next.vet = t('validation.vet');
    }
    if (current === 6) {
      if (!str('motivation').trim()) next.motivation = t('validation.motivation', { animalName });
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  // ── Step 1 creates/resumes the draft, then advances ───────────
  const handleContinue = async () => {
    if (!validateStep(step)) return;

    if (step === 1 && !applicationId) {
      setBusy(true);
      const res = await startApplicationAction(slug, {
        animalId,
        name: str('name'),
        phone: str('phone'),
      });
      setBusy(false);
      if (!res.ok) {
        if (res.error.fields?.phone) setErrors((p) => ({ ...p, phone: res.error.fields!.phone! }));
        toast.error(res.error.message);
        return;
      }
      setApplicationId(res.data.id);
    }

    if (step < TOTAL_STEPS) goTo(step + 1);
  };

  const handleSubmit = async () => {
    if (!validateStep(6)) return;
    if (!applicationId) {
      toast.error(t('errors.lostState'));
      return;
    }
    setBusy(true);
    // Flush the latest answers before submitting.
    await saveDraftAction(slug, applicationId, data);
    const res = await submitApplicationAction(slug, applicationId);
    setBusy(false);
    if (!res.ok) {
      toast.error(res.error.message);
      return;
    }
    router.push(`/${slug}/adotar/${animalId}/enviada`);
  };

  const progress = (step / TOTAL_STEPS) * 100;

  return (
    <div className="mx-auto max-w-2xl px-5 pb-24 pt-6 sm:px-6 sm:pt-8">
      {/* ── Animal hero (editorial reminder of who you're applying for) ─ */}
      <section className="mb-5 overflow-hidden rounded-2xl border border-line-soft bg-paper shadow-card sm:mb-6">
        <div className="aspect-[16/11] overflow-hidden bg-bg-2 sm:aspect-[16/9]">
          <AnimalPhoto src={animalPhotoUrl} name={animalName} rounded="rounded-none" />
        </div>
        <div className="p-5 sm:p-6">
          <p className="eyebrow eyebrow-mute mb-2 flex items-center gap-2 text-[10px]">
            <span className="h-px w-3.5 bg-terra" />
            {t('header.applicationFor')}
          </p>
          <h2 className="display text-4xl text-ink sm:text-5xl">{animalName}</h2>
          {animalMeta && <p className="mt-2 text-sm text-ink-soft">{animalMeta}</p>}
          {animalStory && (
            <p className="mt-3 border-t border-line-soft pt-3 font-display text-[15px] italic leading-relaxed text-ink-soft before:mr-1 before:align-[-0.2em] before:text-lg before:text-terra before:content-['“']">
              {animalStory}
            </p>
          )}
        </div>
      </section>

      {/* ── Progress ───────────────────────────────────────────── */}
      <div className="mb-6">
        <div className="h-1 w-full overflow-hidden rounded-full bg-bg-2">
          <div
            className="h-full rounded-full bg-terra transition-[width] duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-ink-mute">
            {t.rich('progress.step', {
              step,
              total: TOTAL_STEPS,
              strong: (chunks) => <strong className="font-medium text-terra">{chunks}</strong>,
            })}
          </span>
          <span className="flex items-center gap-3">
            <span
              className={cn(
                'inline-flex items-center gap-1.5 font-mono text-[11px] tracking-wide transition',
                saveState === 'saved' ? 'text-green-soft' : 'text-ink-mute',
              )}
            >
              {saveState !== 'idle' && (
                <>
                  <span
                    className={cn(
                      'size-1.5 rounded-full',
                      saveState === 'saving' ? 'bg-ink-mute' : 'bg-green',
                    )}
                  />
                  {saveState === 'saving' ? t('autosave.saving') : t('autosave.saved')}
                </>
              )}
            </span>
            <span className="font-display text-sm italic text-ink">{t(STEP_NAME_KEYS[step - 1])}</span>
          </span>
        </div>
      </div>

      {/* ── Step body ──────────────────────────────────────────── */}
      <article className="rounded-2xl border border-line-soft bg-paper p-6 sm:p-9">
        <p className="eyebrow mb-3 flex items-center gap-2.5">
          <span className="h-px w-4 bg-terra" />{t('progress.stepEyebrow', { step, total: TOTAL_STEPS })}
        </p>

        {step === 1 && <StepIdentification name={str('name')} phone={str('phone')} errors={errors} set={set} animalName={animalName} />}
        {step === 2 && <StepAboutYou str={str} set={set} />}
        {step === 3 && <StepHousing str={str} arr={arr} set={set} errors={errors} animalName={animalName} />}
        {step === 4 && <StepPets str={str} set={set} animalSpecies={animalSpecies} />}
        {step === 5 && <StepRoutine str={str} set={set} errors={errors} animalName={animalName} />}
        {step === 6 && <StepReview data={data} str={str} arr={arr} set={set} errors={errors} animalName={animalName} onEdit={goTo} />}

        {/* ── Nav ──────────────────────────────────────────────── */}
        <div className="mt-8 flex flex-col-reverse gap-3 border-t border-line-soft pt-7 sm:flex-row sm:items-center sm:justify-between">
          {step === 1 ? (
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link href={`/${slug}/animais/${animalId}`}>{t('nav.cancel')}</Link>
            </Button>
          ) : (
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => goTo(step - 1)}
              disabled={busy}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              {t('nav.back')}
            </Button>
          )}

          {step < TOTAL_STEPS ? (
            <Button size="lg" className="w-full sm:w-auto" onClick={handleContinue} pending={busy}>
              {t('nav.continue')}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </Button>
          ) : (
            <Button variant="secondary" size="lg" className="w-full sm:w-auto" onClick={handleSubmit} pending={busy}>
              {t('nav.submit')}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </Button>
          )}
        </div>
      </article>

      <p className="mt-8 text-center text-xs text-ink-mute">
        {t('privacy')}
      </p>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────
   Steps — small, focused components
   ───────────────────────────────────────────────────────────────── */

type Setter = (key: string, value: unknown) => void;

const StepHeading = ({ title, em, lede }: { title: string; em?: string; lede: string }) => <>
      <h2 className="display mb-3 text-3xl text-ink sm:text-4xl">
        {title} {em && <em>{em}</em>}
      </h2>
      <p className="mb-8 max-w-xl text-[15px] leading-relaxed text-ink-soft">{lede}</p>
    </>;

const StepIdentification = ({
  name,
  phone,
  errors,
  set,
  animalName,
}: {
  name: string;
  phone: string;
  errors: Record<string, string>;
  set: Setter;
  animalName: string;
}) => {
  const t = useTranslations('form');
  return (
    <>
      <StepHeading
        title={t('identification.title')}
        em={t('identification.em')}
        lede={t('identification.lede', { animalName })}
      />
      <SectionTitle>{t('identification.sectionTitle')}</SectionTitle>
      <div className="flex flex-col gap-6">
        <Field label={t('identification.nameLabel')} required error={errors.name}>
          <Input
            value={name}
            onChange={(e) => set('name', e.target.value)}
            placeholder={t('identification.namePlaceholder')}
            className="h-12 text-base"
          />
        </Field>
        <Field
          label={t('identification.phoneLabel')}
          required
          error={errors.phone}
          hint={t('identification.phoneHint')}
        >
          <PhoneInput value={phone} onChange={(v) => set('phone', v)} error={errors.phone} />
        </Field>
      </div>
    </>
  );
};

const StepAboutYou = ({ str, set }: { str: (k: string) => string; set: Setter }) => {
  const t = useTranslations('form');
  return (
    <>
      <StepHeading
        title={t('aboutYou.title')}
        em={t('aboutYou.em')}
        lede={t('aboutYou.lede')}
      />
      <SectionTitle>{t('aboutYou.sectionTitle')}</SectionTitle>
      <div className="flex flex-col gap-6">
        <Field label={t('aboutYou.emailLabel')} hint={t('aboutYou.emailHint')}>
          <Input
            type="email"
            value={str('email')}
            onChange={(e) => set('email', e.target.value)}
            placeholder={t('aboutYou.emailPlaceholder')}
            className="h-12 text-base"
          />
        </Field>
        <Field label={t('aboutYou.cityLabel')} hint={t('aboutYou.cityHint')}>
          <Input
            value={str('city')}
            onChange={(e) => set('city', e.target.value)}
            placeholder={t('aboutYou.cityPlaceholder')}
            className="h-12 text-base"
          />
        </Field>
        <Field
          label={t('aboutYou.addressLabel')}
          hint={t('aboutYou.addressHint')}
        >
          <Input
            value={str('address')}
            onChange={(e) => set('address', e.target.value)}
            placeholder={t('aboutYou.addressPlaceholder')}
            className="h-12 text-base"
          />
        </Field>
      </div>
    </>
  );
};

const StepHousing = ({
  str,
  arr,
  set,
  errors,
  animalName,
}: {
  str: (k: string) => string;
  arr: (k: string) => string[];
  set: Setter;
  errors: Record<string, string>;
  animalName: string;
}) => {
  const t = useTranslations('form');
  return (
    <>
      <StepHeading
        title={t('housing.title', { animalName })}
        em={t('housing.em')}
        lede={t('housing.lede')}
      />
      <SectionTitle>{t('housing.sectionTitle')}</SectionTitle>
      <div className="flex flex-col gap-6">
        <Field label={t('housing.housingLabel')} required error={errors.housing}>
          <RadioCards name="housing" options={housingOptions(t)} value={str('housing')} onChange={(v) => set('housing', v)} />
        </Field>
        <Field label={t('housing.ownershipLabel')} required error={errors.ownership}>
          <RadioCards name="ownership" options={ownershipOptions(t)} value={str('ownership')} onChange={(v) => set('ownership', v)} />
          <FieldExplanation title={t('housing.ownershipExplanationTitle')}>
            {t('housing.ownershipExplanationBody')}
          </FieldExplanation>
        </Field>
      </div>

      <div className="mt-9 border-t border-line-soft pt-9">
        <SectionTitle>{t('housing.householdSectionTitle')}</SectionTitle>
        <div className="flex flex-col gap-6">
          <Field label={t('housing.householdLabel')}>
            <CheckList options={householdOptions(t)} values={arr('household')} onChange={(v) => set('household', v)} />
          </Field>
          <Field label={t('housing.agreementLabel')} required error={errors.agreement}>
            <RadioCards name="agreement" options={agreementOptions(t)} value={str('agreement')} onChange={(v) => set('agreement', v)} />
          </Field>
        </div>
      </div>
    </>
  );
};

const StepPets = ({
  str,
  set,
  animalSpecies,
}: {
  str: (k: string) => string;
  set: Setter;
  animalSpecies: 'dog' | 'cat';
}) => {
  const t = useTranslations('form');
  const species = animalSpecies === 'dog' ? t('pets.speciesDog') : t('pets.speciesCat');
  return (
    <>
      <StepHeading
        title={t('pets.title')}
        em={t('pets.em')}
        lede={t('pets.lede')}
      />
      <SectionTitle>{t('pets.todaySectionTitle')}</SectionTitle>
      <div className="flex flex-col gap-6">
        <Field label={t('pets.hasPetsLabel')}>
          <RadioCards name="hasPets" options={hasPetsOptions(t)} value={str('hasPets')} onChange={(v) => set('hasPets', v)} />
        </Field>
        {str('hasPets') === 'yes' && (
          <Field
            label={t('pets.currentPetsLabel')}
            hint={t('pets.currentPetsHint', { species })}
          >
            <Textarea
              value={str('currentPets')}
              onChange={(e) => set('currentPets', e.target.value)}
              placeholder={t('pets.currentPetsPlaceholder')}
              className="min-h-24 text-base"
            />
          </Field>
        )}
      </div>

      <div className="mt-9 border-t border-line-soft pt-9">
        <SectionTitle>{t('pets.historySectionTitle')}</SectionTitle>
        <div className="flex flex-col gap-6">
          <Field label={t('pets.hadPetsLabel')}>
            <RadioCards name="hadPets" options={hadPetsOptions(t)} value={str('hadPets')} onChange={(v) => set('hadPets', v)} />
          </Field>
          {str('hadPets') === 'yes' && (
            <Field
              label={t('pets.petHistoryLabel')}
              hint={t('pets.petHistoryHint')}
            >
              <Textarea
                value={str('petHistory')}
                onChange={(e) => set('petHistory', e.target.value)}
                placeholder={t('pets.petHistoryPlaceholder')}
                className="min-h-24 text-base"
              />
            </Field>
          )}
        </div>
      </div>
    </>
  );
};

const StepRoutine = ({
  str,
  set,
  errors,
  animalName,
}: {
  str: (k: string) => string;
  set: Setter;
  errors: Record<string, string>;
  animalName: string;
}) => {
  const t = useTranslations('form');
  return (
    <>
      <StepHeading
        title={t('routine.title', { animalName })}
        em={t('routine.em')}
        lede={t('routine.lede')}
      />
      <SectionTitle>{t('routine.sectionTitle')}</SectionTitle>
      <div className="flex flex-col gap-6">
        <Field label={t('routine.hoursAwayLabel')} required error={errors.hoursAway}>
          <RadioCards name="hoursAway" options={hoursAwayOptions(t)} value={str('hoursAway')} onChange={(v) => set('hoursAway', v)} />
        </Field>
        <Field label={t('routine.travelLabel')}>
          <Textarea
            value={str('travel')}
            onChange={(e) => set('travel', e.target.value)}
            placeholder={t('routine.travelPlaceholder')}
            className="min-h-24 text-base"
          />
        </Field>
      </div>

      <div className="mt-9 border-t border-line-soft pt-9">
        <SectionTitle>{t('routine.careSectionTitle', { animalName })}</SectionTitle>
        <div className="flex flex-col gap-6">
          <Field label={t('routine.sleepLabel', { animalName })} required error={errors.sleep}>
            <RadioCards name="sleep" options={sleepOptions(t)} value={str('sleep')} onChange={(v) => set('sleep', v)} />
          </Field>
          <Field label={t('routine.vetLabel')} required error={errors.vet}>
            <RadioCards name="vet" options={vetOptions(t)} value={str('vet')} onChange={(v) => set('vet', v)} />
            <FieldExplanation title={t('routine.vetExplanationTitle')}>
              {t('routine.vetExplanationBody')}
            </FieldExplanation>
          </Field>
        </div>
      </div>
    </>
  );
};

const StepReview = ({
  data,
  str,
  arr,
  set,
  errors,
  animalName,
  onEdit,
}: {
  data: FormData;
  str: (k: string) => string;
  arr: (k: string) => string[];
  set: Setter;
  errors: Record<string, string>;
  animalName: string;
  onEdit: (step: number) => void;
}) => {
  const t = useTranslations('form');
  const labels = valueLabels(t);
  const label = (v: string) => labels[v] ?? v;
  const empty = t('review.empty');
  const household = arr('household').map(label).join(', ') || empty;

  return (
    <>
      <StepHeading
        title={t('review.title')}
        em={t('review.em')}
        lede={t('review.lede', { animalName })}
      />

      <SectionTitle>{t('review.aboutSectionTitle', { animalName })}</SectionTitle>
      <div className="flex flex-col gap-6">
        <Field
          label={t('review.motivationLabel', { animalName })}
          required
          error={errors.motivation}
          hint={t('review.motivationHint')}
        >
          <Textarea
            value={str('motivation')}
            onChange={(e) => set('motivation', e.target.value)}
            placeholder={t('review.motivationPlaceholder')}
            className="min-h-28 text-base"
          />
        </Field>
        <Field label={t('review.questionsLabel')} hint={t('review.questionsHint')}>
          <Textarea
            value={str('questions')}
            onChange={(e) => set('questions', e.target.value)}
            placeholder={t('review.questionsPlaceholder')}
            className="min-h-20 text-base"
          />
        </Field>
      </div>

      <div className="mt-9 border-t border-line-soft pt-9">
        <SectionTitle>{t('review.reviewSectionTitle')}</SectionTitle>
        <div className="flex flex-col gap-3">
          <ReviewBlock num="01" title={t('review.block1Title')} onEdit={() => onEdit(1)}>
            <ReviewRow label={t('review.rowName')} value={str('name') || empty} strong />
            <ReviewRow label={t('review.rowPhone')} value={str('phone') || empty} />
          </ReviewBlock>
          <ReviewBlock num="02" title={t('review.block2Title')} onEdit={() => onEdit(2)}>
            <ReviewRow label={t('review.rowEmail')} value={str('email') || empty} />
            <ReviewRow label={t('review.rowCity')} value={str('city') || empty} strong />
            <ReviewRow label={t('review.rowAddress')} value={str('address') || empty} />
          </ReviewBlock>
          <ReviewBlock num="03" title={t('review.block3Title')} onEdit={() => onEdit(3)}>
            <ReviewRow label={t('review.rowHousing')} value={label(str('housing')) || empty} />
            <ReviewRow label={t('review.rowOwnership')} value={label(str('ownership')) || empty} />
            <ReviewRow label={t('review.rowHousehold')} value={household} />
            <ReviewRow label={t('review.rowAgreement')} value={label(str('agreement')) || empty} />
          </ReviewBlock>
          <ReviewBlock num="04" title={t('review.block4Title')} onEdit={() => onEdit(4)}>
            <ReviewRow label={t('review.rowPetsToday')} value={str('hasPets') === 'yes' ? str('currentPets') || t('review.yes') : t('review.no')} />
            {str('petHistory') && <ReviewRow label={t('review.rowHistory')} value={str('petHistory')} italic />}
          </ReviewBlock>
          <ReviewBlock num="05" title={t('review.block5Title')} onEdit={() => onEdit(5)}>
            <ReviewRow label={t('review.rowHoursAway')} value={label(str('hoursAway')) || empty} />
            {str('travel') && <ReviewRow label={t('review.rowTravel')} value={str('travel')} italic />}
            <ReviewRow label={t('review.rowSleep', { animalName })} value={label(str('sleep')) || empty} />
            <ReviewRow label={t('review.rowVet')} value={label(str('vet')) || empty} />
          </ReviewBlock>
        </div>
        {/* keep `data` referenced for future-proofing of the review */}
        <span className="sr-only">{t('review.answersCount', { count: Object.keys(data).length })}</span>
      </div>
    </>
  );
};

const ReviewBlock = ({
  num,
  title,
  onEdit,
  children,
}: {
  num: string;
  title: string;
  onEdit: () => void;
  children: React.ReactNode;
}) => {
  const t = useTranslations('form');
  return (
    <div className="rounded-xl border border-line-soft bg-bg px-5 py-5">
      <div className="mb-4 flex items-center justify-between border-b border-line-soft pb-3">
        <span className="flex items-center gap-2.5 font-display text-base text-ink">
          <span className="rounded bg-terra-bg px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-terra">
            {num}
          </span>
          {title}
        </span>
        <button
          type="button"
          onClick={onEdit}
          className="border-b border-current pb-px text-xs text-terra transition hover:opacity-70"
        >
          {t('review.edit')}
        </button>
      </div>
      <div className="flex flex-col gap-2.5">{children}</div>
    </div>
  );
};

const ReviewRow = ({
  label,
  value,
  strong,
  italic,
}: {
  label: string;
  value: string;
  strong?: boolean;
  italic?: boolean;
}) => <div className="grid grid-cols-1 gap-1 text-sm sm:grid-cols-[130px_1fr] sm:gap-4">
      <span className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-ink-mute">{label}</span>
      <span className={cn('leading-relaxed text-ink-soft', strong && 'font-medium text-ink', italic && 'italic')}>
        {value}
      </span>
    </div>;
