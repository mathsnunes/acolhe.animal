import { ageInMonths, ageGroupOf, type AgeGroup } from '@acolhe-animal/shared';
import type { Animal } from '@acolhe-animal/db';

import type { Translator } from '@/lib/i18n';

// Re-exported so existing `@/components/animals/labels` imports keep working.
export { ageInMonths, ageGroupOf, type AgeGroup };

/**
 * Portuguese display labels for the animal enums + a couple of derived helpers
 * (age, meta line). Shared by the card and the detail page so the copy stays
 * consistent. Labels are resolved from the `animals` i18n namespace via a
 * translator passed in by the call site (`useTranslations('animals')` in
 * client/sync-server components, `getTranslations('animals')` in async ones).
 */

type Sociability = NonNullable<Animal['goodWithChildren']>;

export const speciesLabel = (t: Translator, value: Animal['species']): string => t(`labels.species.${value}`);

/** Gendered noun for the hero (Cadela / Cachorro / Gata / Gato), from species + sex. */
export const speciesNounLabel = (
  t: Translator,
  species: Animal['species'],
  sex: Animal['sex'],
): string => {
  const key =
    species === 'dog'
      ? sex === 'female'
        ? 'dogFemale'
        : 'dogMale'
      : sex === 'female'
        ? 'catFemale'
        : 'catMale';
  return t(`wizard.speciesNoun.${key}`);
};

export const sexLabel = (t: Translator, value: Animal['sex']): string => t(`labels.sex.${value}`);

export const sizeLabel = (t: Translator, value: NonNullable<Animal['size']>): string => t(`labels.size.${value}`);

export const neuteredLabel = (t: Translator, value: NonNullable<Animal['neutered']>): string => t(`labels.neutered.${value}`);

export const energyLabel = (t: Translator, value: NonNullable<Animal['energyLevel']>): string => t(`labels.energy.${value}`);

export const sociabilityLabel = (t: Translator, value: Sociability): string => t(`labels.sociability.${value}`);

export const clinicalTypeLabel = (t: Translator, value: NonNullable<Animal['clinicalCondition']>['type']): string => t(`labels.clinicalType.${value}`);

/** The enum keys, exposed so forms can iterate over the available options. */
export const SPECIES_KEYS: Animal['species'][] = ['dog', 'cat'];
export const SEX_KEYS: Animal['sex'][] = ['male', 'female'];
export const SIZE_KEYS: NonNullable<Animal['size']>[] = ['small', 'medium', 'large'];
export const NEUTERED_KEYS: NonNullable<Animal['neutered']>[] = ['yes', 'no', 'scheduled'];
export const ENERGY_KEYS: NonNullable<Animal['energyLevel']>[] = [
  'calm',
  'balanced',
  'energetic',
];
export const SOCIABILITY_KEYS: Sociability[] = ['yes', 'no', 'with-care', 'unknown'];

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

/**
 * Tags shown under an animal's name in the listings (card + list): permanent
 * conditions (e.g. FIV+), the "baby" age, and sociability wins ("Bom com cães"),
 * capped so rows/cards stay tidy. Shared so both listing views match.
 */
export const animalListTags = (
  t: Translator,
  animal: Animal,
  max = 3,
): { text: string; tone: 'terra' | 'green' }[] => {
  const tags: { text: string; tone: 'terra' | 'green' }[] = [];
  for (const condition of animal.specialConditions) tags.push({ text: condition, tone: 'terra' });
  if (ageGroupOf(animal) === 'baby') tags.push({ text: t('filters.ageBaby'), tone: 'terra' });
  if (animal.goodWithChildren === 'yes') tags.push({ text: t('wizard.goodTagChildren'), tone: 'green' });
  if (animal.goodWithDogs === 'yes') tags.push({ text: t('wizard.goodTagDogs'), tone: 'green' });
  if (animal.goodWithCats === 'yes') tags.push({ text: t('wizard.goodTagCats'), tone: 'green' });
  return tags.slice(0, max);
};
