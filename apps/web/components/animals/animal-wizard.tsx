'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import type { Animal, AnimalPhoto } from '@acolhe-animal/db';
import type { AnimalDraftInput, CreateAnimalInput } from '@acolhe-animal/domain';

import { cn } from '@/lib/utils';
import type { Translator } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ENERGY_KEYS,
  NEUTERED_KEYS,
  SIZE_KEYS,
  energyLabel,
  neuteredLabel,
  sizeLabel,
  sociabilityLabel,
  speciesLabel,
} from './labels';
import {
  createAnimalDraftAction,
  autosaveAnimalAction,
  publishAnimalAction,
  listAnimalPhotosAction,
} from '@/app/(admin)/animals/actions';
import { AnimalMediaUploader } from '@/components/uploads/animal-media-uploader';
import { PortalAnimalCard } from '@/components/portal/portal-animal-card';
import { PortalAnimalHero } from '@/components/portal/portal-animal-hero';

/**
 * Six-step animal wizard with real server-side drafts.
 *
 * Flow: the first valid step creates a `draft` animal; subsequent edits autosave
 * (debounced) into it; the final step validates the full record and publishes
 * (draft → available). Editing an existing animal reuses the same wizard,
 * pre-filled, and the final step saves in place. Draft persistence + autosave
 * live in the domain (`createAnimalDraft` / `autosaveAnimal` / `publishAnimal`).
 */

type Sociability = 'yes' | 'no' | 'with-care' | 'unknown';
type Vaccine = { name: string; date: string };

type FormValues = {
  name: string;
  species: '' | 'dog' | 'cat';
  sex: '' | 'male' | 'female';
  size: '' | 'small' | 'medium' | 'large';
  predominantColor: string;
  weightKg: string;
  ageMode: 'birthdate' | 'estimate';
  estimatedBirthDate: string;
  ageMonthsAtIntake: string;
  intakeDate: string;
  rescueDate: string;
  rescueLocation: string;
  neutered: '' | 'yes' | 'no' | 'scheduled';
  vaccinations: Vaccine[];
  specialConditions: string[];
  hasClinicalCondition: boolean;
  clinicalType: '' | 'post-surgery-recovery' | 'chronic-treatment' | 'behavioral-rehabilitation' | 'other';
  clinicalDescription: string;
  clinicalExpectedResolution: string;
  clinicalNeedsSpecialAdopter: boolean;
  energyLevel: '' | 'calm' | 'balanced' | 'energetic';
  goodWithChildren: Sociability;
  goodWithDogs: Sociability;
  goodWithCats: Sociability;
  goodWithStrangers: Sociability;
  quirks: string;
  shortStory: string;
  visibleOnPortal: boolean;
  listedForAdoption: boolean;
};

const TOTAL_STEPS = 6;
const COMMON_VACCINES: Record<'dog' | 'cat', string[]> = {
  dog: ['V8', 'V10 (octavalente)', 'Antirrábica', 'Gripe canina', 'Giárdia'],
  cat: ['V3', 'V4', 'V5', 'Antirrábica', 'FeLV'],
};
const COMMON_CONDITIONS = ['FIV+', 'FeLV+', 'Três patas', 'Cego(a)', 'Surdo(a)', 'Epilepsia', 'Cardiopatia'];
const CLINICAL_TYPES = ['post-surgery-recovery', 'chronic-treatment', 'behavioral-rehabilitation', 'other'] as const;

const toDateInput = (value: Date | string | null | undefined): string =>
  value ? new Date(value).toISOString().slice(0, 10) : '';

const defaultsFor = (animal?: Animal): FormValues => ({
  name: animal?.name ?? '',
  species: animal?.species ?? '',
  sex: animal?.sex ?? '',
  size: animal?.size ?? '',
  predominantColor: animal?.predominantColor ?? '',
  weightKg: animal?.weightKg != null ? String(animal.weightKg) : '',
  ageMode: animal?.ageMonthsAtIntake != null && !animal?.estimatedBirthDate ? 'estimate' : 'birthdate',
  estimatedBirthDate: toDateInput(animal?.estimatedBirthDate),
  ageMonthsAtIntake: animal?.ageMonthsAtIntake != null ? String(animal.ageMonthsAtIntake) : '',
  intakeDate: toDateInput(animal?.intakeDate),
  rescueDate: toDateInput(animal?.rescueDate),
  rescueLocation: animal?.rescueLocation ?? '',
  neutered: animal?.neutered ?? '',
  vaccinations: (animal?.vaccinations ?? []).map((v) => ({ name: v.name, date: v.date })),
  specialConditions: animal?.specialConditions ?? [],
  hasClinicalCondition: animal?.clinicalCondition != null,
  clinicalType: animal?.clinicalCondition?.type ?? '',
  clinicalDescription: animal?.clinicalCondition?.description ?? '',
  clinicalExpectedResolution: animal?.clinicalCondition?.expectedResolution ?? '',
  clinicalNeedsSpecialAdopter: animal?.clinicalCondition?.needsSpecialAdopter ?? false,
  energyLevel: animal?.energyLevel ?? '',
  goodWithChildren: animal?.goodWithChildren ?? 'unknown',
  goodWithDogs: animal?.goodWithDogs ?? 'unknown',
  goodWithCats: animal?.goodWithCats ?? 'unknown',
  goodWithStrangers: animal?.goodWithStrangers ?? 'unknown',
  quirks: animal?.quirks ?? '',
  shortStory: animal?.shortStory ?? '',
  visibleOnPortal: animal?.visibleOnPortal ?? true,
  listedForAdoption: animal?.listedForAdoption ?? true,
});

/** Shape the form into the domain input, dropping empties so partial saves stay clean. */
const buildInput = (v: FormValues): AnimalDraftInput => {
  const input: AnimalDraftInput = {};
  if (v.name.trim()) input.name = v.name.trim();
  if (v.species) input.species = v.species;
  if (v.sex) input.sex = v.sex;
  if (v.size) input.size = v.size;
  if (v.predominantColor.trim()) input.predominantColor = v.predominantColor.trim();
  if (v.weightKg) input.weightKg = Number(v.weightKg);

  if (v.ageMode === 'birthdate' && v.estimatedBirthDate) {
    input.estimatedBirthDate = new Date(v.estimatedBirthDate);
  } else if (v.ageMode === 'estimate' && v.ageMonthsAtIntake) {
    input.ageMonthsAtIntake = Number(v.ageMonthsAtIntake);
  }

  if (v.intakeDate) input.intakeDate = new Date(v.intakeDate);
  if (v.rescueDate) input.rescueDate = new Date(v.rescueDate);
  if (v.rescueLocation.trim()) input.rescueLocation = v.rescueLocation.trim();

  if (v.neutered) input.neutered = v.neutered;
  const vaccines = v.vaccinations.filter((x) => x.name.trim());
  if (vaccines.length) input.vaccinations = vaccines;
  if (v.specialConditions.length) input.specialConditions = v.specialConditions;

  if (v.hasClinicalCondition && v.clinicalType && v.clinicalDescription.trim()) {
    input.clinicalCondition = {
      type: v.clinicalType,
      description: v.clinicalDescription.trim(),
      needsSpecialAdopter: v.clinicalNeedsSpecialAdopter,
      expectedResolution: v.clinicalExpectedResolution.trim() || null,
    };
  }

  if (v.energyLevel) input.energyLevel = v.energyLevel;
  input.goodWithChildren = v.goodWithChildren;
  input.goodWithDogs = v.goodWithDogs;
  input.goodWithCats = v.goodWithCats;
  input.goodWithStrangers = v.goodWithStrangers;
  if (v.quirks.trim()) input.quirks = v.quirks.trim();
  if (v.shortStory.trim()) input.shortStory = v.shortStory.trim();

  input.visibleOnPortal = v.visibleOnPortal;
  input.listedForAdoption = v.listedForAdoption;
  return input;
};

/** Per-step required-field validation, returns `{ field: messageKey }`. */
const validateStep = (step: number, v: FormValues): Record<string, string> => {
  const e: Record<string, string> = {};
  if (step === 1) {
    if (!v.name.trim()) e.name = 'errName';
    if (!v.species) e.species = 'errSpecies';
    if (!v.sex) e.sex = 'errSex';
    if (v.ageMode === 'birthdate' && !v.estimatedBirthDate) e.estimatedBirthDate = 'errAge';
    if (v.ageMode === 'estimate' && !v.ageMonthsAtIntake) e.ageMonthsAtIntake = 'errAge';
  }
  if (step === 3 && !v.neutered) e.neutered = 'errNeutered';
  return e;
};

const STEP_OF_FIELD: Record<string, number> = {
  name: 1,
  species: 1,
  sex: 1,
  estimatedBirthDate: 1,
  ageMonthsAtIntake: 1,
  neutered: 3,
};

/** "~8 meses" (birth date) or "~2 anos no resgate" (estimate at intake). */
const ageText = (t: Translator, v: FormValues): string => {
  const text = (months: number, rescue: boolean): string => {
    const base =
      months < 12
        ? `~${t('labels.ageMonths', { months })}`
        : `~${t('labels.ageYears', { years: Math.floor(months / 12) })}`;
    return rescue ? `${base} ${t('wizard.atRescue')}` : base;
  };
  if (v.ageMode === 'birthdate' && v.estimatedBirthDate) {
    const birth = new Date(v.estimatedBirthDate);
    const now = new Date();
    const months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
    return months < 0 ? '—' : text(months, false);
  }
  if (v.ageMode === 'estimate' && v.ageMonthsAtIntake) {
    const m = Number(v.ageMonthsAtIntake);
    return Number.isNaN(m) ? '—' : text(m, true);
  }
  return '';
};

/** Required fields still missing, for the review banner (each links to its step). */
const incompleteFields = (v: FormValues): { step: number; labelKey: string }[] => {
  const items: { step: number; labelKey: string }[] = [];
  if (!v.name.trim()) items.push({ step: 1, labelKey: 'form.nameLabel' });
  if (!v.species) items.push({ step: 1, labelKey: 'form.speciesLabel' });
  if (!v.sex) items.push({ step: 1, labelKey: 'form.sexLabel' });
  const hasAge = v.ageMode === 'birthdate' ? Boolean(v.estimatedBirthDate) : Boolean(v.ageMonthsAtIntake);
  if (!hasAge) items.push({ step: 1, labelKey: 'detail.factAge' });
  if (!v.neutered) items.push({ step: 3, labelKey: 'wizard.neuteredHeading' });
  return items;
};

export const AnimalWizard = ({ animal }: { animal?: Animal }) => {
  const t = useTranslations('animals');
  const router = useRouter();
  const [values, setValues] = useState<FormValues>(() => defaultsFor(animal));
  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');
  const [isPublishing, startPublish] = useTransition();

  const idRef = useRef<string | null>(animal?.id ?? null);
  const creatingRef = useRef(false);
  const skipNextSave = useRef(true);
  const valuesRef = useRef(values);
  valuesRef.current = values;

  const startedAsDraft = !animal || animal.status === 'draft';

  const set = useCallback(<K extends keyof FormValues>(key: K, value: FormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  // ── Autosave (debounced) ────────────────────────────────────────────────
  const persist = useCallback(async (vals: FormValues): Promise<string | null> => {
    const input = buildInput(vals);
    if (!input.name || !input.species || !input.sex) return idRef.current; // too little to save
    setSaveStatus('saving');
    try {
      if (!idRef.current) {
        if (creatingRef.current) return idRef.current;
        creatingRef.current = true;
        const res = await createAnimalDraftAction(input);
        creatingRef.current = false;
        if (res.ok) {
          idRef.current = res.data.id;
          window.history.replaceState(null, '', `/animais/${res.data.id}/editar`);
        }
      } else {
        await autosaveAnimalAction(idRef.current, input);
      }
    } finally {
      setSaveStatus('saved');
    }
    return idRef.current;
  }, []);

  useEffect(() => {
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }
    const timer = setTimeout(() => void persist(valuesRef.current), 800);
    return () => clearTimeout(timer);
  }, [values, persist]);

  // Reset scroll to the top of the page when the step changes — AFTER the new
  // step renders. A synchronous scroll (inside the click handler) gets cancelled
  // by the layout shift of swapping a tall step in, which is why navigating on
  // mobile left you stuck mid-form.
  const didMountRef = useRef(false);
  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  // Media uploads need a persisted animal to attach to; ensure the draft exists
  // (creating it if identity is filled) and hand back its id.
  const ensureOwnerId = useCallback(
    async (): Promise<string | null> => idRef.current ?? (await persist(valuesRef.current)),
    [persist],
  );

  // ── Navigation ──────────────────────────────────────────────────────────
  // Free navigation (stepper + arrows + picker) — drafts let you roam; only
  // "Continuar" and "Publicar" enforce the per-step requirements.
  const jumpToStep = (target: number) => {
    setErrors({});
    setStep(Math.min(TOTAL_STEPS, Math.max(1, target)));
  };

  const nextStep = () => {
    const stepErrors = validateStep(step, values);
    if (Object.keys(stepErrors).length) {
      setErrors((prev) => ({ ...prev, ...stepErrors }));
      return;
    }
    jumpToStep(step + 1);
  };

  const onSaveAndExit = () => {
    startPublish(async () => {
      const savedId = (await persist(valuesRef.current)) ?? idRef.current;
      // Editing an existing animal returns to its page; a brand-new draft goes to the listing.
      if (!startedAsDraft && savedId) {
        router.push(`/animais/${savedId}`);
      } else {
        router.push('/animais');
      }
      router.refresh();
    });
  };

  const onPublish = () => {
    const allErrors: Record<string, string> = {
      ...validateStep(1, values),
      ...validateStep(3, values),
    };
    if (Object.keys(allErrors).length) {
      setErrors(allErrors);
      const firstField = Object.keys(allErrors)[0]!;
      setStep(STEP_OF_FIELD[firstField] ?? 1);
      toast.error(t('wizard.fixErrors'));
      return;
    }

    startPublish(async () => {
      const id = await persist(valuesRef.current);
      if (!id) {
        toast.error(t('wizard.fixErrors'));
        return;
      }
      const res = await publishAnimalAction(id, buildInput(values) as CreateAnimalInput);
      if (res.ok) {
        toast.success(startedAsDraft ? t('toasts.created', { name: res.data.name }) : t('toasts.updated'));
        router.push(`/animais/${res.data.id}`);
        router.refresh();
        return;
      }
      const fields = res.error.fields;
      if (fields) {
        setErrors(fields);
        const firstField = Object.keys(fields)[0];
        if (firstField && STEP_OF_FIELD[firstField]) setStep(STEP_OF_FIELD[firstField]!);
      }
      toast.error(res.error.message);
    });
  };

  const stepErrorSet = new Set(
    Object.keys(errors).map((f) => STEP_OF_FIELD[f]).filter((s): s is number => s != null),
  );

  return (
    <div className="mx-auto max-w-3xl px-6 pb-24">
      <button
        type="button"
        onClick={() => router.push('/animais')}
        className="mb-6 inline-flex items-center gap-2 text-sm text-ink-mute transition hover:text-ink"
      >
        <ChevronLeft className="size-4" />
        {t('wizard.back')}
      </button>

      <div className="mb-8">
        <p className="eyebrow">— {startedAsDraft ? t('new.eyebrow') : t('editPage.eyebrow')}</p>
        <h1 className="display mt-2 text-[32px] text-ink sm:text-[40px]">
          {t.rich(`wizard.titles.${step}`, { em: (c) => <em>{c}</em> })}
        </h1>
        <p className="mt-3 max-w-xl text-ink-soft">{t(`wizard.subtitles.${step}`)}</p>
      </div>

      <Stepper t={t} step={step} errorSteps={stepErrorSet} onJump={jumpToStep} />

      <div className="mt-6 rounded-2xl border border-line-soft bg-paper p-6 shadow-card sm:p-8">
        {step === 1 && <StepIdentity t={t} v={values} set={set} errors={errors} />}
        {step === 2 && <StepEntry t={t} v={values} set={set} />}
        {step === 3 && <StepHealth t={t} v={values} set={set} errors={errors} />}
        {step === 4 && <StepBehavior t={t} v={values} set={set} />}
        {step === 5 && (
          <StepStory t={t} v={values} set={set} animalId={idRef.current} resolveOwnerId={ensureOwnerId} />
        )}
        {step === 6 && <StepReview t={t} v={values} onEdit={setStep} animalId={idRef.current} />}

        <div className="mt-8 flex flex-col gap-4 border-t border-line-soft pt-5 sm:flex-row sm:items-center sm:justify-between">
          <span
            className={cn(
              'inline-flex items-center gap-2 text-xs text-ink-mute',
              saveStatus === 'saving' && 'text-terra',
            )}
          >
            <span className={cn('size-1.5 rounded-full', saveStatus === 'saving' ? 'bg-terra' : 'bg-green')} />
            {saveStatus === 'saving' ? t('wizard.saving') : t('wizard.saveAuto')}
          </span>

          <div className="flex items-center justify-end gap-2">
            {step > 1 && (
              <Button type="button" variant="ghost" onClick={() => jumpToStep(step - 1)}>
                <ChevronLeft className="size-4" />
                {t('wizard.previous')}
              </Button>
            )}
            {step < TOTAL_STEPS ? (
              <>
                <Button type="button" variant="outline" onClick={onSaveAndExit} pending={isPublishing}>
                  {t('wizard.saveAndExit')}
                </Button>
                <Button type="button" onClick={nextStep}>
                  {t('wizard.continue')}
                  <ChevronRight className="size-4" />
                </Button>
              </>
            ) : (
              <>
                <Button type="button" variant="outline" onClick={onSaveAndExit} pending={isPublishing}>
                  {startedAsDraft ? t('wizard.saveDraft') : t('wizard.saveAndExit')}
                </Button>
                <Button type="button" onClick={onPublish} pending={isPublishing}>
                  <Check className="size-4" />
                  {startedAsDraft ? t('wizard.publish') : t('wizard.saveChanges')}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ── Stepper ──────────────────────────────────────────────────────────────── */

const STEP_KEYS = ['identification', 'entry', 'health', 'behavior', 'story', 'review'] as const;

const Stepper = ({
  t,
  step,
  errorSteps,
  onJump,
}: {
  t: Translator;
  step: number;
  errorSteps: Set<number>;
  onJump: (s: number) => void;
}) => {
  const [pickerOpen, setPickerOpen] = useState(false);

  // Lock background scroll while the bottom-sheet step picker is open so the page
  // behind doesn't scroll under it (mobile scroll-bleed).
  useEffect(() => {
    if (!pickerOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [pickerOpen]);

  return (
    <>
      {/* Desktop: evenly-spaced horizontal stepper. Each step is an equal-width
          column with a centered dot; the connector is an absolute line through
          the dot row, drawn behind the (opaque) dots. */}
      <nav className="hidden items-start sm:flex" aria-label={t('wizard.stepperAria')}>
        {STEP_KEYS.map((key, i) => {
          const s = i + 1;
          const complete = s < step;
          const current = s === step;
          const error = errorSteps.has(s) && !current && !complete;
          return (
            <div key={key} className="relative flex flex-1 flex-col items-center">
              {i > 0 && (
                <span
                  className={cn(
                    'absolute right-1/2 top-4 h-0.5 w-full -translate-y-1/2',
                    i < step ? 'bg-green' : 'bg-line',
                  )}
                  aria-hidden
                />
              )}
              <button
                type="button"
                onClick={() => onJump(s)}
                aria-current={current ? 'step' : undefined}
                className="relative z-10 flex flex-col items-center gap-2"
              >
                <span
                  className={cn(
                    'flex size-8 items-center justify-center rounded-full border text-xs font-semibold transition',
                    current && 'border-terra bg-terra text-paper',
                    complete && 'border-green bg-green text-paper',
                    !current && !complete && 'border-line bg-bg text-ink-mute',
                    error && 'border-rose text-rose',
                  )}
                >
                  {complete ? <Check className="size-4" /> : s}
                </span>
                <span className={cn('text-center text-xs', current ? 'font-medium text-ink' : 'text-ink-mute')}>
                  {t(`wizard.steps.${key}`)}
                </span>
              </button>
            </div>
          );
        })}
      </nav>

      {/* Mobile: compact bar whose center opens a step picker (bottom sheet). */}
      <div className="flex items-center gap-1 rounded-xl border border-line-soft bg-paper px-1.5 py-1.5 sm:hidden">
        <button
          type="button"
          onClick={() => onJump(step - 1)}
          disabled={step === 1}
          aria-label={t('wizard.previous')}
          className="p-2 disabled:opacity-30"
        >
          <ChevronLeft className="size-5 text-ink-soft" />
        </button>
        <button type="button" onClick={() => setPickerOpen(true)} className="flex flex-1 flex-col items-center">
          <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-ink-mute">
            {t('wizard.stepCounter', { step, total: TOTAL_STEPS })}
          </span>
          <span className="flex items-center gap-1 text-sm font-medium text-ink">
            {t(`wizard.steps.${STEP_KEYS[step - 1]}`)}
            <ChevronDown className="size-3.5 text-ink-mute" />
          </span>
        </button>
        <button
          type="button"
          onClick={() => onJump(step + 1)}
          disabled={step === TOTAL_STEPS}
          aria-label={t('wizard.continue')}
          className="p-2 disabled:opacity-30"
        >
          <ChevronRight className="size-5 text-ink-soft" />
        </button>
      </div>

      {pickerOpen && (
        // Keep the mobile bottom nav (z-50) visible and tappable: the sheet sits
        // just BELOW it (z-40, still above content + header) and the panel is
        // lifted above the nav, so the last step (Revisão) clears it.
        <div
          className="fixed inset-0 z-40 flex flex-col justify-end pb-[var(--spacing-bottom-nav)] sm:hidden"
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            aria-label={t('wizard.close')}
            className="absolute inset-0 bg-ink/40"
            onClick={() => setPickerOpen(false)}
          />
          <div className="relative max-h-[80vh] overflow-auto rounded-t-2xl bg-paper p-5 pb-8 shadow-elevated">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-line" aria-hidden />
            <p className="eyebrow eyebrow-mute mb-3">— {t('wizard.pickStep')}</p>
            <ul className="space-y-1">
              {STEP_KEYS.map((key, i) => {
                const s = i + 1;
                const current = s === step;
                const complete = s < step;
                return (
                  <li key={key}>
                    <button
                      type="button"
                      onClick={() => {
                        onJump(s);
                        setPickerOpen(false);
                      }}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition',
                        current ? 'bg-terra-bg' : 'hover:bg-bg-2',
                      )}
                    >
                      <span
                        className={cn(
                          'flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold',
                          current && 'border-terra bg-terra text-paper',
                          complete && 'border-green bg-green text-paper',
                          !current && !complete && 'border-line text-ink-mute',
                        )}
                      >
                        {complete ? <Check className="size-3.5" /> : s}
                      </span>
                      <span>
                        <span className={cn('block text-sm font-medium', current ? 'text-terra' : 'text-ink')}>
                          {t(`wizard.steps.${key}`)}
                        </span>
                        <span className="block text-xs text-ink-mute">{t(`wizard.hints.${key}`)}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </>
  );
};

/* ── Steps ────────────────────────────────────────────────────────────────── */

type StepProps = {
  t: Translator;
  v: FormValues;
  set: <K extends keyof FormValues>(key: K, value: FormValues[K]) => void;
  errors?: Record<string, string>;
};

const StepIdentity = ({ t, v, set, errors = {} }: StepProps) => (
  <div className="space-y-6">
    <SectionHeading title={t('wizard.identityHeading')} sub={t('wizard.identitySub')} />

    <Field label={t('form.nameLabel')} required error={errors.name && t('form.nameRequired')}>
      <Input value={v.name} onChange={(e) => set('name', e.target.value)} placeholder={t('form.namePlaceholder')} />
    </Field>

    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
      <Field label={t('form.speciesLabel')} required error={errors.species && t('wizard.errSpecies')}>
        <PillGroup
          value={v.species}
          onChange={(val) => set('species', val as FormValues['species'])}
          options={[
            { value: 'dog', label: `🐕 ${t('labels.species.dog')}` },
            { value: 'cat', label: `🐈 ${t('labels.species.cat')}` },
          ]}
        />
      </Field>
      <Field label={t('form.sexLabel')} required error={errors.sex && t('wizard.errSex')}>
        <PillGroup
          value={v.sex}
          onChange={(val) => set('sex', val as FormValues['sex'])}
          options={[
            { value: 'female', label: t('labels.sex.female') },
            { value: 'male', label: t('labels.sex.male') },
          ]}
        />
      </Field>
    </div>

    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
      <Field label={t('form.sizeLabel')} optional>
        <FormSelect
          value={v.size}
          onChange={(val) => set('size', val as FormValues['size'])}
          placeholder={t('form.notInformed')}
          options={SIZE_KEYS.map((k) => ({ value: k, label: sizeLabel(t, k) }))}
        />
      </Field>
      <Field label={t('wizard.weightLabel')} optional hint={t('wizard.weightHint')}>
        <Input
          type="number"
          min={0}
          step="0.1"
          value={v.weightKg}
          onChange={(e) => set('weightKg', e.target.value)}
          placeholder={t('wizard.weightPlaceholder')}
        />
      </Field>
    </div>

    <Field label={t('wizard.colorLabel')} optional>
      <Input
        value={v.predominantColor}
        onChange={(e) => set('predominantColor', e.target.value)}
        placeholder={t('wizard.colorPlaceholder')}
      />
    </Field>

    <div className="border-t border-line-soft pt-6">
      <SectionHeading title={t('wizard.ageHeading')} sub={t('wizard.ageSub')} />
      <div className="mt-4">
        <PillGroup
          value={v.ageMode}
          onChange={(val) => set('ageMode', val as FormValues['ageMode'])}
          options={[
            { value: 'birthdate', label: t('wizard.ageModeKnown') },
            { value: 'estimate', label: t('wizard.ageModeEstimate') },
          ]}
        />
      </div>
      <div className="mt-4">
        {v.ageMode === 'birthdate' ? (
          <Field label={t('form.birthDateLabel')} required error={errors.estimatedBirthDate && t('wizard.errAge')}>
            <Input type="date" value={v.estimatedBirthDate} onChange={(e) => set('estimatedBirthDate', e.target.value)} />
          </Field>
        ) : (
          <Field label={t('form.ageAtIntakeLabel')} required error={errors.ageMonthsAtIntake && t('wizard.errAge')}>
            <Input
              type="number"
              min={0}
              value={v.ageMonthsAtIntake}
              onChange={(e) => set('ageMonthsAtIntake', e.target.value)}
              placeholder={t('form.ageAtIntakePlaceholder')}
            />
          </Field>
        )}
      </div>
    </div>
  </div>
);

const StepEntry = ({ t, v, set }: StepProps) => (
  <div className="space-y-6">
    <SectionHeading title={t('wizard.entryHeading')} sub={t('wizard.entrySub')} />
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
      <Field label={t('wizard.intakeDateLabel')} optional hint={t('wizard.intakeDateHint')}>
        <Input type="date" value={v.intakeDate} onChange={(e) => set('intakeDate', e.target.value)} />
      </Field>
      <Field label={t('wizard.rescueDateLabel')} optional hint={t('wizard.rescueDateHint')}>
        <Input type="date" value={v.rescueDate} onChange={(e) => set('rescueDate', e.target.value)} />
      </Field>
    </div>
    <Field label={t('form.rescueLocationLabel')} optional hint={t('wizard.rescueLocationHint')}>
      <Input
        value={v.rescueLocation}
        onChange={(e) => set('rescueLocation', e.target.value)}
        placeholder={t('form.rescueLocationPlaceholder')}
      />
    </Field>
  </div>
);

const StepHealth = ({ t, v, set, errors = {} }: StepProps) => {
  const [conditionDraft, setConditionDraft] = useState('');
  const suggestions = v.species ? COMMON_VACCINES[v.species] : [];
  const usedVaccines = new Set(v.vaccinations.map((x) => x.name.toLowerCase()));

  const addVaccine = () => set('vaccinations', [...v.vaccinations, { name: '', date: '' }]);
  const addVaccineNamed = (name: string) => set('vaccinations', [...v.vaccinations, { name, date: '' }]);
  const updateVaccine = (i: number, patch: Partial<Vaccine>) =>
    set('vaccinations', v.vaccinations.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const removeVaccine = (i: number) => set('vaccinations', v.vaccinations.filter((_, j) => j !== i));

  const addCondition = (value: string) => {
    const val = value.trim();
    if (!val || v.specialConditions.some((c) => c.toLowerCase() === val.toLowerCase())) return;
    set('specialConditions', [...v.specialConditions, val]);
  };
  const removeCondition = (i: number) =>
    set('specialConditions', v.specialConditions.filter((_, j) => j !== i));

  return (
    <div className="space-y-8">
      <div>
        <SectionHeading title={t('wizard.neuteredHeading')} sub={t('wizard.neuteredSub')} />
        <div className="mt-4">
          <PillGroup
            value={v.neutered}
            onChange={(val) => set('neutered', val as FormValues['neutered'])}
            options={NEUTERED_KEYS.map((k) => ({ value: k, label: neuteredLabel(t, k) }))}
          />
          {errors.neutered && <p className="mt-2 text-xs text-rose">{t('wizard.errNeutered')}</p>}
        </div>
      </div>

      <div className="border-t border-line-soft pt-6">
        <SectionHeading title={t('wizard.vaccinesHeading')} sub={t('wizard.vaccinesSub')} />
        {v.vaccinations.length > 0 && (
          <div className="mt-4 space-y-2">
            {v.vaccinations.map((vac, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  value={vac.name}
                  onChange={(e) => updateVaccine(i, { name: e.target.value })}
                  placeholder={t('wizard.vaccineNamePlaceholder')}
                  className="flex-1"
                />
                <Input
                  type="date"
                  value={vac.date}
                  onChange={(e) => updateVaccine(i, { date: e.target.value })}
                  className="w-44"
                />
                <button
                  type="button"
                  onClick={() => removeVaccine(i)}
                  aria-label={t('wizard.removeVaccine')}
                  className="p-2 text-ink-mute hover:text-rose"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>
        )}
        <button
          type="button"
          onClick={addVaccine}
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-terra hover:text-terra/80"
        >
          <Plus className="size-4" />
          {t('wizard.addVaccine')}
        </button>
        {v.species ? (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-xs text-ink-mute">{t('wizard.suggestions')}</span>
            {suggestions.map((sug) => (
              <SuggestionChip
                key={sug}
                label={sug}
                disabled={usedVaccines.has(sug.toLowerCase())}
                onClick={() => addVaccineNamed(sug)}
              />
            ))}
          </div>
        ) : (
          <p className="mt-3 text-xs text-ink-mute">{t('wizard.vaccinesSpeciesHint')}</p>
        )}
      </div>

      <div className="border-t border-line-soft pt-6">
        <SectionHeading title={t('wizard.specialConditionsHeading')} sub={t('wizard.specialConditionsSub')} />
        <div
          className="mt-3 flex flex-wrap gap-1.5 rounded-md border border-line bg-bg px-3 py-2.5 focus-within:border-terra"
          onClick={() => document.getElementById('cond-input')?.focus()}
        >
          {v.specialConditions.map((c, i) => (
            <span
              key={c}
              className="inline-flex items-center gap-1 rounded-full bg-terra-bg px-2.5 py-1 text-xs font-medium text-terra"
            >
              {c}
              <button
                type="button"
                onClick={() => removeCondition(i)}
                aria-label={t('form.removeTag', { tag: c })}
                className="text-terra/70 hover:text-terra"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
          <input
            id="cond-input"
            value={conditionDraft}
            onChange={(e) => setConditionDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault();
                addCondition(conditionDraft);
                setConditionDraft('');
              }
            }}
            onBlur={() => {
              if (conditionDraft.trim()) {
                addCondition(conditionDraft);
                setConditionDraft('');
              }
            }}
            placeholder={v.specialConditions.length ? '' : t('wizard.conditionPlaceholder')}
            className="min-w-[140px] flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-mute"
          />
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {COMMON_CONDITIONS.map((c) => (
            <SuggestionChip
              key={c}
              label={c}
              disabled={v.specialConditions.some((x) => x.toLowerCase() === c.toLowerCase())}
              onClick={() => addCondition(c)}
            />
          ))}
        </div>
      </div>

      <div className="border-t border-line-soft pt-6">
        <SectionHeading title={t('wizard.clinicalHeading')} sub={t('wizard.clinicalSub')} optional />
        <div className="mt-3 overflow-hidden rounded-xl border border-line-soft">
          <button
            type="button"
            onClick={() => set('hasClinicalCondition', !v.hasClinicalCondition)}
            aria-expanded={v.hasClinicalCondition}
            className="flex w-full items-center justify-between gap-3 bg-bg-2/40 px-4 py-3 text-left transition hover:bg-bg-2/70"
          >
            <span>
              <span className="block text-sm font-medium text-ink">
                {v.hasClinicalCondition ? t('wizard.clinicalOngoing') : t('wizard.clinicalAdd')}
              </span>
              <span className="block text-xs text-ink-mute">{t('wizard.clinicalAccordionHint')}</span>
            </span>
            <ChevronDown
              className={cn('size-4 shrink-0 text-ink-mute transition', v.hasClinicalCondition && 'rotate-180')}
            />
          </button>
          {v.hasClinicalCondition && (
            <div className="space-y-4 border-t border-line-soft p-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label={t('form.clinicalTypeLabel')}>
                  <FormSelect
                    value={v.clinicalType}
                    onChange={(val) => set('clinicalType', val as FormValues['clinicalType'])}
                    placeholder={t('wizard.select')}
                    options={CLINICAL_TYPES.map((ct) => ({
                      value: ct,
                      label: t(`labels.clinicalType.${ct}`),
                    }))}
                  />
                </Field>
                <Field label={t('wizard.clinicalExpectedResolutionLabel')} optional>
                  <Input
                    type="date"
                    value={v.clinicalExpectedResolution}
                    onChange={(e) => set('clinicalExpectedResolution', e.target.value)}
                  />
                </Field>
              </div>
              <Field label={t('wizard.clinicalDescriptionLabel')}>
                <Textarea
                  value={v.clinicalDescription}
                  onChange={(e) => set('clinicalDescription', e.target.value)}
                  placeholder={t('form.clinicalDescriptionPlaceholder')}
                />
              </Field>
              <Toggle
                label={t('wizard.needsAttentiveAdopter')}
                hint={t('wizard.needsAttentiveAdopterHint')}
                checked={v.clinicalNeedsSpecialAdopter}
                onChange={(val) => set('clinicalNeedsSpecialAdopter', val)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const StepBehavior = ({ t, v, set }: StepProps) => (
  <div className="space-y-8">
    <div>
      <SectionHeading title={t('wizard.energyHeading')} sub={t('wizard.energySub')} />
      <div className="mt-4">
        <PillGroup
          value={v.energyLevel}
          onChange={(val) => set('energyLevel', val as FormValues['energyLevel'])}
          options={ENERGY_KEYS.map((k) => ({ value: k, label: energyLabel(t, k) }))}
        />
      </div>
    </div>

    <div className="border-t border-line-soft pt-6">
      <SectionHeading title={t('wizard.sociabilityHeading')} sub={t('wizard.sociabilitySub')} />
      <div className="mt-4 space-y-5">
        <SociabilityRow t={t} label={t('form.goodWithChildren')} value={v.goodWithChildren} onChange={(x) => set('goodWithChildren', x)} />
        <SociabilityRow t={t} label={t('form.goodWithDogs')} value={v.goodWithDogs} onChange={(x) => set('goodWithDogs', x)} />
        <SociabilityRow t={t} label={t('form.goodWithCats')} value={v.goodWithCats} onChange={(x) => set('goodWithCats', x)} />
        <SociabilityRow t={t} label={t('wizard.goodWithStrangers')} value={v.goodWithStrangers} onChange={(x) => set('goodWithStrangers', x)} />
      </div>
    </div>

    <div className="border-t border-line-soft pt-6">
      <SectionHeading title={t('wizard.particularitiesHeading')} sub={t('wizard.particularitiesSub')} />
      <Textarea
        className="mt-4"
        value={v.quirks}
        onChange={(e) => set('quirks', e.target.value)}
        placeholder={t('wizard.particularitiesPlaceholder')}
        rows={3}
      />
    </div>
  </div>
);

const StepStory = ({
  t,
  v,
  set,
  animalId,
  resolveOwnerId,
}: StepProps & { animalId: string | null; resolveOwnerId: () => Promise<string | null> }) => (
  <div className="space-y-8">
    <div>
      <SectionHeading title={t('wizard.storyHeading')} sub={t('wizard.storySub')} />
      <Textarea
        className="mt-4"
        value={v.shortStory}
        onChange={(e) => set('shortStory', e.target.value)}
        placeholder={t('wizard.storyPlaceholder')}
        rows={5}
      />
    </div>

    <div className="border-t border-line-soft pt-6">
      <SectionHeading title={t('wizard.visibilityHeading')} sub={t('wizard.visibilitySub')} />
      <div className="mt-4 space-y-4">
        <Toggle
          label={t('wizard.visibleOnPortalLabel')}
          hint={t('wizard.visibleOnPortalHint')}
          checked={v.visibleOnPortal}
          onChange={(val) => set('visibleOnPortal', val)}
        />
        <Toggle
          label={t('wizard.listedForAdoptionLabel')}
          hint={t('wizard.listedForAdoptionHint')}
          checked={v.listedForAdoption}
          onChange={(val) => set('listedForAdoption', val)}
        />
      </div>
    </div>

    <div className="border-t border-line-soft pt-6">
      <SectionHeading title={t('wizard.photosHeading')} sub={t('wizard.photosSub')} optional />
      <AnimalMediaUploader animalId={animalId} resolveOwnerId={resolveOwnerId} />
    </div>
  </div>
);

const StepReview = ({
  t,
  v,
  onEdit,
  animalId,
}: {
  t: Translator;
  v: FormValues;
  onEdit: (s: number) => void;
  animalId: string | null;
}) => {
  // Pull the chosen cover so the previews match what'll be published.
  const [cover, setCover] = useState<AnimalPhoto | null>(null);
  useEffect(() => {
    if (!animalId) return;
    let active = true;
    void listAnimalPhotosAction(animalId).then((res) => {
      if (active && res.ok) setCover(res.data.find((p) => p.isPrimary) ?? res.data[0] ?? null);
    });
    return () => {
      active = false;
    };
  }, [animalId]);

  const dash = t('detail.empty');
  const missing = incompleteFields(v);
  const age = ageText(t, v);
  const size = v.size ? sizeLabel(t, v.size) : '';
  const namedVaccines = v.vaccinations.filter((x) => x.name.trim());

  // Render the previews with the real portal components so they match exactly.
  // Coerce the form's possibly-empty values to the saved enum shape they expect.
  const previewAnimal = {
    id: animalId ?? 'preview',
    name: v.name || t('wizard.noName'),
    species: v.species === 'cat' ? 'cat' : 'dog',
    sex: v.sex === 'male' ? 'male' : 'female',
    size: v.size === 'small' || v.size === 'medium' || v.size === 'large' ? v.size : null,
    shortStory: v.shortStory,
    quirks: v.quirks,
  } as const;
  const sociabilityLine = [
    `${t('form.goodWithChildren')}: ${sociabilityLabel(t, v.goodWithChildren)}`,
    `${t('form.goodWithDogs')}: ${sociabilityLabel(t, v.goodWithDogs)}`,
    `${t('form.goodWithCats')}: ${sociabilityLabel(t, v.goodWithCats)}`,
    `${t('wizard.goodWithStrangers')}: ${sociabilityLabel(t, v.goodWithStrangers)}`,
  ].join(' · ');

  return (
    <div className="space-y-7">
      {/* Missing-required banner (or all-clear) */}
      {missing.length > 0 ? (
        <div className="flex items-start gap-3 rounded-xl bg-terra-bg px-5 py-4">
          <AlertTriangle className="mt-0.5 size-[18px] shrink-0 text-terra" strokeWidth={2} />
          <div>
            <p className="text-sm font-medium text-terra">{t('wizard.missingTitle', { count: missing.length })}</p>
            <p className="mt-1 text-sm text-terra/90">
              {missing.map((m, i) => (
                <span key={m.labelKey}>
                  {i > 0 && ' · '}
                  <button
                    type="button"
                    onClick={() => onEdit(m.step)}
                    className="underline decoration-terra/30 underline-offset-2 hover:decoration-terra"
                  >
                    {t(m.labelKey)}
                  </button>
                </span>
              ))}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-xl bg-green/10 px-5 py-4">
          <Check className="size-[18px] shrink-0 text-green" strokeWidth={2.5} />
          <p className="text-sm text-green">{t('wizard.readyToPublish')}</p>
        </div>
      )}

      {/* Preview: card in the listing */}
      <div>
        <h3 className="font-display text-lg text-ink">{t('wizard.previewCardTitle')}</h3>
        <p className="mt-1 hint">{t('wizard.previewCardHint')}</p>
        <div className="mt-4 rounded-xl border border-dashed border-line bg-bg-2/30 p-6">
          <p className="eyebrow eyebrow-mute mb-3">— {t('wizard.portalPublic')}</p>
          <div className="mx-auto max-w-[280px]">
            <PortalAnimalCard preview slug="" animal={previewAnimal} photoUrl={cover?.mediumUrl} />
          </div>
        </div>
      </div>

      {/* Preview: the animal's public page (top) */}
      <div>
        <h3 className="font-display text-lg text-ink">{t('wizard.previewDetailTitle')}</h3>
        <p className="mt-1 hint">{t('wizard.previewDetailHint')}</p>
        <div className="mt-4 rounded-xl border border-dashed border-line bg-bg-2/30 p-6">
          <p className="eyebrow eyebrow-mute mb-3">— {t('wizard.animalPage')}</p>
          <PortalAnimalHero preview slug="" animal={previewAnimal} photoUrl={cover?.mediumUrl} />
        </div>
      </div>

      {/* Technical details (field-by-field, with edit shortcuts) */}
      <div className="border-t border-line-soft pt-6">
        <h3 className="font-display text-lg text-ink">{t('wizard.technicalTitle')}</h3>
        <p className="mt-1 hint">{t('wizard.technicalHint')}</p>
        <div className="mt-4 space-y-3">
          <ReviewBlock title={t('wizard.steps.identification')} onEdit={() => onEdit(1)} editLabel={t('detail.edit')}>
            <ReviewRow label={t('form.nameLabel')} value={v.name || dash} />
            <ReviewRow label={t('form.speciesLabel')} value={v.species ? speciesLabel(t, v.species) : dash} />
            <ReviewRow label={t('form.sexLabel')} value={v.sex ? t(`labels.sex.${v.sex}`) : dash} />
            <ReviewRow label={t('form.sizeLabel')} value={size || dash} />
            <ReviewRow label={t('wizard.colorLabel')} value={v.predominantColor || dash} />
            <ReviewRow label={t('wizard.weightLabel')} value={v.weightKg ? `${v.weightKg} kg` : dash} />
            <ReviewRow label={t('detail.factAge')} value={age || dash} />
          </ReviewBlock>

          <ReviewBlock title={t('wizard.steps.entry')} onEdit={() => onEdit(2)} editLabel={t('detail.edit')}>
            <ReviewRow label={t('wizard.intakeDateLabel')} value={v.intakeDate || t('wizard.today')} />
            <ReviewRow label={t('wizard.rescueDateLabel')} value={v.rescueDate || dash} />
            <ReviewRow label={t('form.rescueLocationLabel')} value={v.rescueLocation || dash} />
          </ReviewBlock>

          <ReviewBlock title={t('wizard.steps.health')} onEdit={() => onEdit(3)} editLabel={t('detail.edit')}>
            <ReviewRow label={t('detail.factNeutered')} value={v.neutered ? neuteredLabel(t, v.neutered) : dash} />
            <ReviewRow label={t('wizard.vaccinesHeading')} value={namedVaccines.map((x) => x.name).join(', ') || dash} />
            <ReviewRow label={t('wizard.specialConditionsHeading')} value={v.specialConditions.join(', ') || dash} />
          </ReviewBlock>

          <ReviewBlock title={t('wizard.steps.behavior')} onEdit={() => onEdit(4)} editLabel={t('detail.edit')}>
            <ReviewRow label={t('detail.factEnergy')} value={v.energyLevel ? energyLabel(t, v.energyLevel) : dash} />
            <ReviewRow label={t('wizard.sociabilityHeading')} value={sociabilityLine} />
          </ReviewBlock>

          <ReviewBlock title={t('wizard.steps.story')} onEdit={() => onEdit(5)} editLabel={t('detail.edit')}>
            <ReviewRow label={t('wizard.storyHeading')} value={v.shortStory || dash} />
            <ReviewRow label={t('wizard.visibleOnPortalLabel')} value={v.visibleOnPortal ? t('wizard.yes') : t('wizard.no')} />
            <ReviewRow label={t('wizard.listedForAdoptionLabel')} value={v.listedForAdoption ? t('wizard.yes') : t('wizard.no')} />
          </ReviewBlock>
        </div>
      </div>
    </div>
  );
};

/* ── Presentational helpers ───────────────────────────────────────────────── */

const SectionHeading = ({ title, sub, optional }: { title: string; sub?: string; optional?: boolean }) => (
  <div>
    <h2 className="font-display text-xl text-ink">
      {title}
      {optional && <span className="ml-2 text-xs font-normal text-ink-mute">(opcional)</span>}
    </h2>
    {sub && <p className="mt-1 hint">{sub}</p>}
  </div>
);

const Field = ({
  label,
  required,
  optional,
  hint,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  optional?: boolean;
  hint?: string;
  error?: string | false;
  children: React.ReactNode;
}) => (
  <div className="space-y-[7px]">
    <Label>
      {label}
      {required && <span className="ml-1 text-terra">•</span>}
      {optional && <span className="ml-1.5 text-xs font-normal text-ink-mute">(opcional)</span>}
    </Label>
    {children}
    {hint && !error && <p className="hint">{hint}</p>}
    {error && <p className="text-xs text-rose">{error}</p>}
  </div>
);

/** A small pill suggesting a value to add; greys out (and disables) once used. */
const SuggestionChip = ({
  label,
  disabled,
  onClick,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    disabled={disabled}
    onClick={onClick}
    className={cn(
      'rounded-full border px-2.5 py-1 text-xs font-medium transition',
      disabled
        ? 'cursor-default border-line-soft bg-bg-2 text-ink-mute/60'
        : 'border-line bg-bg text-ink-soft hover:border-terra/40 hover:text-terra',
    )}
  >
    {label}
  </button>
);

const PillGroup = <T extends string>({
  value,
  onChange,
  options,
}: {
  value: T | '';
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
}) => (
  <div className="flex flex-wrap gap-2">
    {options.map((opt) => (
      <button
        key={opt.value}
        type="button"
        onClick={() => onChange(opt.value)}
        className={cn(
          'rounded-full border px-4 py-2 text-sm font-medium transition',
          value === opt.value
            ? 'border-terra bg-terra-bg text-terra'
            : 'border-line bg-bg text-ink-soft hover:border-terra/40',
        )}
      >
        {opt.label}
      </button>
    ))}
  </div>
);

const SOCIABILITY_ORDER = ['yes', 'with-care', 'no', 'unknown'] as const;

const SociabilityRow = ({
  t,
  label,
  value,
  onChange,
}: {
  t: Translator;
  label: string;
  value: Sociability;
  onChange: (value: Sociability) => void;
}) => (
  <div>
    <p className="mb-2 text-sm font-medium text-ink">{label}</p>
    <PillGroup
      value={value}
      onChange={onChange}
      options={SOCIABILITY_ORDER.map((k) => ({ value: k, label: sociabilityLabel(t, k) }))}
    />
  </div>
);

const Toggle = ({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) => (
  <div className="flex items-start justify-between gap-4">
    <div>
      <p className="text-sm font-medium text-ink">{label}</p>
      {hint && <p className="mt-0.5 hint">{hint}</p>}
    </div>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-6 w-11 shrink-0 rounded-full transition',
        checked ? 'bg-terra' : 'bg-line',
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 size-5 rounded-full bg-paper shadow-sm transition',
          checked ? 'left-[22px]' : 'left-0.5',
        )}
      />
    </button>
  </div>
);

const ReviewBlock = ({
  title,
  editLabel,
  onEdit,
  children,
}: {
  title: string;
  editLabel: string;
  onEdit: () => void;
  children: React.ReactNode;
}) => (
  <div className="rounded-xl border border-line-soft bg-bg-2/30 p-4">
    <div className="mb-3 flex items-center justify-between">
      <p className="eyebrow eyebrow-mute">— {title}</p>
      <button type="button" onClick={onEdit} className="text-xs font-medium text-terra hover:text-terra/80">
        {editLabel}
      </button>
    </div>
    <dl className="space-y-1.5">{children}</dl>
  </div>
);

const ReviewRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex gap-3 text-sm">
    <dt className="w-32 shrink-0 text-ink-mute">{label}</dt>
    <dd className="text-ink">{value}</dd>
  </div>
);

/** Design-system dropdown (Radix Select). Use this — never a raw `<select>`. */
const FormSelect = ({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  options: { value: string; label: string }[];
}) => (
  <Select value={value || undefined} onValueChange={onChange}>
    <SelectTrigger>
      <SelectValue placeholder={placeholder} />
    </SelectTrigger>
    <SelectContent>
      {options.map((o) => (
        <SelectItem key={o.value} value={o.value}>
          {o.label}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);
