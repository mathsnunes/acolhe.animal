import type { Animal } from '@acolhe-animal/db';

import type { Translator } from '@/lib/i18n';

/**
 * Portuguese display labels for the animal enums + a couple of derived helpers
 * (age, meta line). Shared by the card and the detail page so the copy stays
 * consistent. Labels are resolved from the `animals` i18n namespace via a
 * translator passed in by the call site (`useTranslations('animals')` in
 * client/sync-server components, `getTranslations('animals')` in async ones).
 */

type Sociability = NonNullable<Animal['goodWithChildren']>;

export const speciesLabel = (t: Translator, value: Animal['species']): string => t(`labels.species.${value}`);

export const sexLabel = (t: Translator, value: Animal['sex']): string => t(`labels.sex.${value}`);

export const sizeLabel = (t: Translator, value: NonNullable<Animal['size']>): string => t(`labels.size.${value}`);

export const neuteredLabel = (t: Translator, value: Animal['neutered']): string => t(`labels.neutered.${value}`);

export const energyLabel = (t: Translator, value: NonNullable<Animal['energyLevel']>): string => t(`labels.energy.${value}`);

export const sociabilityLabel = (t: Translator, value: Sociability): string => t(`labels.sociability.${value}`);

export const clinicalTypeLabel = (t: Translator, value: NonNullable<Animal['clinicalCondition']>['type']): string => t(`labels.clinicalType.${value}`);

/** The enum keys, exposed so forms can iterate over the available options. */
export const SPECIES_KEYS: Animal['species'][] = ['dog', 'cat'];
export const SEX_KEYS: Animal['sex'][] = ['male', 'female'];
export const SIZE_KEYS: NonNullable<Animal['size']>[] = ['small', 'medium', 'large'];
export const NEUTERED_KEYS: Animal['neutered'][] = ['yes', 'no', 'scheduled'];
export const ENERGY_KEYS: NonNullable<Animal['energyLevel']>[] = [
  'calm',
  'balanced',
  'energetic',
];
export const SOCIABILITY_KEYS: Sociability[] = ['yes', 'no', 'with-care', 'unknown'];

/** The animal's current age in months, derived from birth date or months-at-intake. */
export const ageInMonths = (animal: Animal): number | null => {
  let months: number | null = null;

  if (animal.estimatedBirthDate) {
    const birth = new Date(animal.estimatedBirthDate);
    const now = new Date();
    months =
      (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
  } else if (animal.ageMonthsAtIntake != null) {
    const elapsed = animal.ageReferenceDate
      ? Math.floor(
          (Date.now() - new Date(animal.ageReferenceDate).getTime()) /
            (1000 * 60 * 60 * 24 * 30.44),
        )
      : 0;
    months = animal.ageMonthsAtIntake + Math.max(0, elapsed);
  }

  return months != null && months >= 0 ? months : null;
};

export type AgeGroup = 'baby' | 'adult' | 'senior';

/** Bucket for the age filter: filhote (<1y), adulto (1–7y), idoso (7y+). */
export const ageGroupOf = (animal: Animal): AgeGroup | null => {
  const months = ageInMonths(animal);
  if (months == null) return null;
  if (months < 12) return 'baby';
  if (months < 84) return 'adult';
  return 'senior';
};

/** "2 anos", "8 meses" — derived from birth date or months-at-intake. */
export const formatAge = (t: Translator, animal: Animal): string | null => {
  const months = ageInMonths(animal);
  if (months == null) return null;
  if (months < 12) return t('labels.ageMonths', { months });
  const years = Math.floor(months / 12);
  return t('labels.ageYears', { years });
};

/** "Cachorro · Fêmea · Médio" — the compact meta line shown under the name. */
export const formatMetaLine = (t: Translator, animal: Animal): string => [
    speciesLabel(t, animal.species),
    sexLabel(t, animal.sex),
    formatAge(t, animal),
    animal.size ? sizeLabel(t, animal.size) : null,
  ]
    .filter(Boolean)
    .join(' · ');
