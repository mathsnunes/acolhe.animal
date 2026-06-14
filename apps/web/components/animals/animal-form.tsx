'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { X } from 'lucide-react';
import { toast } from 'sonner';

import type { Animal } from '@acolhe-animal/db';
import type { CreateAnimalInput } from '@acolhe-animal/domain';
import type { ActionResult } from '@acolhe-animal/shared';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { Translator } from '@/lib/i18n';
import {
  ENERGY_KEYS,
  NEUTERED_KEYS,
  SEX_KEYS,
  SIZE_KEYS,
  SOCIABILITY_KEYS,
  SPECIES_KEYS,
  energyLabel,
  neuteredLabel,
  sexLabel,
  sizeLabel,
  sociabilityLabel,
  speciesLabel,
} from './labels';

/**
 * Create/edit form for an animal. Local form state keeps every field as a
 * string (native inputs), then `buildInput()` shapes it into the domain's
 * `CreateAnimalInput` — the Server Action re-validates with `createAnimalSchema`
 * and surfaces field-level errors. Photos are out of scope (disabled note).
 */

type FormValues = {
  name: string;
  species: Animal['species'];
  sex: Animal['sex'];
  size: '' | NonNullable<Animal['size']>;
  estimatedBirthDate: string;
  ageMonthsAtIntake: string;
  neutered: Animal['neutered'];
  specialConditions: string[];
  hasClinicalCondition: boolean;
  clinicalType: NonNullable<Animal['clinicalCondition']>['type'];
  clinicalDescription: string;
  clinicalNeedsSpecialAdopter: boolean;
  energyLevel: '' | NonNullable<Animal['energyLevel']>;
  goodWithChildren: '' | NonNullable<Animal['goodWithChildren']>;
  goodWithDogs: '' | NonNullable<Animal['goodWithDogs']>;
  goodWithCats: '' | NonNullable<Animal['goodWithCats']>;
  shortStory: string;
  quirks: string;
  intakeDate: string;
  rescueLocation: string;
};

const toDateInput = (value: Date | string | null | undefined): string => {
  if (!value) return '';
  return new Date(value).toISOString().slice(0, 10);
};

const defaultsFor = (animal?: Animal): FormValues => ({
    name: animal?.name ?? '',
    species: animal?.species ?? 'dog',
    sex: animal?.sex ?? 'female',
    size: animal?.size ?? '',
    estimatedBirthDate: toDateInput(animal?.estimatedBirthDate),
    ageMonthsAtIntake:
      animal?.ageMonthsAtIntake != null ? String(animal.ageMonthsAtIntake) : '',
    neutered: animal?.neutered ?? 'no',
    specialConditions: animal?.specialConditions ?? [],
    hasClinicalCondition: animal?.clinicalCondition != null,
    clinicalType: animal?.clinicalCondition?.type ?? 'other',
    clinicalDescription: animal?.clinicalCondition?.description ?? '',
    clinicalNeedsSpecialAdopter: animal?.clinicalCondition?.needsSpecialAdopter ?? false,
    energyLevel: animal?.energyLevel ?? '',
    goodWithChildren: animal?.goodWithChildren ?? '',
    goodWithDogs: animal?.goodWithDogs ?? '',
    goodWithCats: animal?.goodWithCats ?? '',
    shortStory: animal?.shortStory ?? '',
    quirks: animal?.quirks ?? '',
    intakeDate: toDateInput(animal?.intakeDate) || toDateInput(new Date()),
    rescueLocation: animal?.rescueLocation ?? '',
  });

const buildInput = (values: FormValues): CreateAnimalInput => {
  const input: CreateAnimalInput = {
    name: values.name.trim(),
    species: values.species,
    sex: values.sex,
    neutered: values.neutered,
    specialConditions: values.specialConditions,
    intakeDate: new Date(values.intakeDate),
  };

  if (values.size) input.size = values.size;
  if (values.estimatedBirthDate) input.estimatedBirthDate = new Date(values.estimatedBirthDate);
  if (values.ageMonthsAtIntake) {
    input.ageMonthsAtIntake = Number(values.ageMonthsAtIntake);
  }
  if (values.energyLevel) input.energyLevel = values.energyLevel;
  if (values.goodWithChildren) input.goodWithChildren = values.goodWithChildren;
  if (values.goodWithDogs) input.goodWithDogs = values.goodWithDogs;
  if (values.goodWithCats) input.goodWithCats = values.goodWithCats;
  if (values.shortStory.trim()) input.shortStory = values.shortStory.trim();
  if (values.quirks.trim()) input.quirks = values.quirks.trim();
  if (values.rescueLocation.trim()) input.rescueLocation = values.rescueLocation.trim();

  if (values.hasClinicalCondition && values.clinicalDescription.trim()) {
    input.clinicalCondition = {
      type: values.clinicalType,
      description: values.clinicalDescription.trim(),
      needsSpecialAdopter: values.clinicalNeedsSpecialAdopter,
      expectedResolution: null,
    };
  }

  return input;
};

export const AnimalForm = ({
  animal,
  onCreate,
  onUpdate,
}: {
  animal?: Animal;
  onCreate?: (input: CreateAnimalInput) => Promise<ActionResult<Animal>>;
  onUpdate?: (input: CreateAnimalInput) => Promise<ActionResult<Animal>>;
}) => {
  const t = useTranslations('animals');
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [tagDraft, setTagDraft] = useState('');
  const isEdit = Boolean(animal);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    formState: { errors },
  } = useForm<FormValues>({ defaultValues: defaultsFor(animal) });

  const specialConditions = watch('specialConditions');
  const hasClinicalCondition = watch('hasClinicalCondition');

  const addTag = () => {
    const value = tagDraft.trim();
    if (!value || specialConditions.includes(value)) {
      setTagDraft('');
      return;
    }
    setValue('specialConditions', [...specialConditions, value]);
    setTagDraft('');
  };

  const removeTag = (tag: string) => {
    setValue(
      'specialConditions',
      specialConditions.filter((t) => t !== tag),
    );
  };

  const onSubmit: SubmitHandler<FormValues> = (values) => {
    const input = buildInput(values);
    const runner = isEdit ? onUpdate : onCreate;
    if (!runner) return;

    startTransition(async () => {
      const result = await runner(input);
      if (result.ok) {
        toast.success(
          isEdit ? t('toasts.updated') : t('toasts.created', { name: result.data.name }),
        );
        router.push(`/animais/${result.data.id}`);
        router.refresh();
        return;
      }

      const fields = result.error.fields;
      if (fields) {
        for (const [key, message] of Object.entries(fields)) {
          if (key in defaultsFor()) {
            setError(key as keyof FormValues, { message });
          }
        }
      }
      toast.error(result.error.message);
    });
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="mx-auto max-w-[680px] space-y-10 px-6 pb-20"
    >
      {/* ── Básico ─────────────────────────────────────────── */}
      <Section eyebrow={t('form.sectionBasic')} hint={t('form.sectionBasicHint')}>
        <Field label={t('form.nameLabel')} required error={errors.name?.message}>
          <Input
            {...register('name', { required: t('form.nameRequired') })}
            placeholder={t('form.namePlaceholder')}
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label={t('form.speciesLabel')} required>
            <NativeSelect {...register('species')}>
              {SPECIES_KEYS.map((key) => (
                <option key={key} value={key}>
                  {speciesLabel(t, key)}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label={t('form.sexLabel')} required>
            <NativeSelect {...register('sex')}>
              {SEX_KEYS.map((key) => (
                <option key={key} value={key}>
                  {sexLabel(t, key)}
                </option>
              ))}
            </NativeSelect>
          </Field>
        </div>

        <Field label={t('form.sizeLabel')}>
          <NativeSelect {...register('size')}>
            <option value="">{t('form.notInformed')}</option>
            {SIZE_KEYS.map((key) => (
              <option key={key} value={key}>
                {sizeLabel(t, key)}
              </option>
            ))}
          </NativeSelect>
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field
            label={t('form.birthDateLabel')}
            error={errors.estimatedBirthDate?.message}
          >
            <Input type="date" {...register('estimatedBirthDate')} />
          </Field>
          <Field
            label={t('form.ageAtIntakeLabel')}
            error={errors.ageMonthsAtIntake?.message}
          >
            <Input
              type="number"
              min={0}
              {...register('ageMonthsAtIntake')}
              placeholder={t('form.ageAtIntakePlaceholder')}
            />
          </Field>
        </div>
        <p className="text-xs text-ink-mute">
          {t.rich('form.ageHint', { em: (c) => <em>{c}</em> })}
        </p>
      </Section>

      {/* ── Saúde ──────────────────────────────────────────── */}
      <Section eyebrow={t('form.sectionHealth')} hint={t('form.sectionHealthHint')}>
        <Field label={t('form.neuteredLabel')} required>
          <NativeSelect {...register('neutered')}>
            {NEUTERED_KEYS.map((key) => (
              <option key={key} value={key}>
                {neuteredLabel(t, key)}
              </option>
            ))}
          </NativeSelect>
        </Field>

        <Field label={t('form.specialConditionsLabel')}>
          <div className="flex flex-wrap gap-1.5">
            {specialConditions.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-full bg-terra-bg px-2.5 py-1 text-xs font-medium text-terra"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  aria-label={t('form.removeTag', { tag })}
                  className="text-terra/70 hover:text-terra"
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}
          </div>
          <Input
            value={tagDraft}
            onChange={(e) => setTagDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault();
                addTag();
              }
            }}
            onBlur={addTag}
            placeholder={t('form.specialConditionsPlaceholder')}
          />
        </Field>

        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            {...register('hasClinicalCondition')}
            className="size-4 accent-terra"
          />
          {t('form.hasClinicalCondition')}
        </label>

        {hasClinicalCondition && (
          <div className="space-y-4 rounded-lg border border-line-soft bg-bg-2/40 p-4">
            <Field label={t('form.clinicalTypeLabel')}>
              <NativeSelect {...register('clinicalType')}>
                <option value="post-surgery-recovery">
                  {t('labels.clinicalType.post-surgery-recovery')}
                </option>
                <option value="chronic-treatment">
                  {t('labels.clinicalType.chronic-treatment')}
                </option>
                <option value="behavioral-rehabilitation">
                  {t('labels.clinicalType.behavioral-rehabilitation')}
                </option>
                <option value="other">{t('form.clinicalTypeOther')}</option>
              </NativeSelect>
            </Field>
            <Field
              label={t('form.clinicalDescriptionLabel')}
              error={errors.clinicalDescription?.message}
            >
              <Textarea
                {...register('clinicalDescription')}
                placeholder={t('form.clinicalDescriptionPlaceholder')}
              />
            </Field>
            <label className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                {...register('clinicalNeedsSpecialAdopter')}
                className="size-4 accent-terra"
              />
              {t('form.clinicalNeedsSpecialAdopter')}
            </label>
          </div>
        )}
      </Section>

      {/* ── Comportamento ──────────────────────────────────── */}
      <Section eyebrow={t('form.sectionBehavior')} hint={t('form.sectionBehaviorHint')}>
        <Field label={t('form.energyLabel')}>
          <NativeSelect {...register('energyLevel')}>
            <option value="">{t('form.notInformed')}</option>
            {ENERGY_KEYS.map((key) => (
              <option key={key} value={key}>
                {energyLabel(t, key)}
              </option>
            ))}
          </NativeSelect>
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label={t('form.goodWithChildren')}>
            <SociabilitySelect t={t} {...register('goodWithChildren')} />
          </Field>
          <Field label={t('form.goodWithDogs')}>
            <SociabilitySelect t={t} {...register('goodWithDogs')} />
          </Field>
          <Field label={t('form.goodWithCats')}>
            <SociabilitySelect t={t} {...register('goodWithCats')} />
          </Field>
        </div>
      </Section>

      {/* ── História ───────────────────────────────────────── */}
      <Section eyebrow={t('form.sectionStory')} hint={t('form.sectionStoryHint')}>
        <Field label={t('form.shortStoryLabel')}>
          <Textarea
            {...register('shortStory')}
            placeholder={t('form.shortStoryPlaceholder')}
          />
        </Field>
        <Field label={t('form.quirksLabel')}>
          <Textarea
            {...register('quirks')}
            placeholder={t('form.quirksPlaceholder')}
          />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label={t('form.intakeDateLabel')} required error={errors.intakeDate?.message}>
            <Input type="date" {...register('intakeDate', { required: true })} />
          </Field>
          <Field label={t('form.rescueLocationLabel')}>
            <Input
              {...register('rescueLocation')}
              placeholder={t('form.rescueLocationPlaceholder')}
            />
          </Field>
        </div>
      </Section>

      {/* ── Fotos (em breve) ───────────────────────────────── */}
      <Section eyebrow={t('form.sectionPhotos')} hint={t('form.sectionPhotosHint')}>
        <div className="rounded-lg border border-dashed border-line bg-bg-2/40 px-6 py-8 text-center text-sm text-ink-mute">
          {t('form.photosSoon')}
        </div>
      </Section>

      <div className="flex items-center justify-end gap-3 border-t border-line-soft pt-6">
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          {t('form.cancel')}
        </Button>
        <Button type="submit" pending={isPending}>
          {isEdit ? t('form.saveChanges') : t('form.create')}
        </Button>
      </div>
    </form>
  );
};

/* ── Small presentational helpers ────────────────────────── */

const Section = ({
  eyebrow,
  hint,
  children,
}: {
  eyebrow: string;
  hint?: string;
  children: React.ReactNode;
}) => <section className="space-y-4">
      <div>
        <p className="eyebrow">— {eyebrow}</p>
        {hint && <p className="mt-1 text-xs text-ink-mute">{hint}</p>}
      </div>
      {children}
    </section>;

const Field = ({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) => <div className="space-y-1.5">
      <Label>
        {label}
        {required && <span className="ml-1 text-terra">•</span>}
      </Label>
      {children}
      {error && <p className="text-xs text-rose">{error}</p>}
    </div>;

const NativeSelect = ({
  className,
  ...props
}: React.ComponentProps<'select'>) => <select
      className={cn(
        'flex h-10 w-full rounded-md border border-line bg-bg px-3 text-sm text-ink shadow-sm',
        'focus-visible:border-terra focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30',
        className,
      )}
      {...props}
    />;

const SociabilitySelect = ({
  t,
  ...props
}: React.ComponentProps<'select'> & { t: Translator }) => <NativeSelect {...props}>
      <option value="">{t('form.sociabilityUnknown')}</option>
      {SOCIABILITY_KEYS.map((key) => (
        <option key={key} value={key}>
          {sociabilityLabel(t, key)}
        </option>
      ))}
    </NativeSelect>;
