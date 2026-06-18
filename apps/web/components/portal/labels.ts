import { ageInMonths, ageGroupOf, type AgeGroup, type AgeInput } from '@acolhe-animal/shared';
import type { Animal } from '@acolhe-animal/db';

// Age derivation is shared with the admin (single source of truth); re-exported
// so the portal browser can keep importing it from here.
export { ageGroupOf, type AgeGroup };

/** pt-BR display labels for animal attributes shown on the public portal. */

/** A translator for the `portal` namespace (e.g. from `useTranslations('portal')`). */
type Translator = (key: string, values?: Record<string, string | number>) => string;

export const speciesLabel = (t: Translator, species: Animal['species']): string => species === 'dog' ? t('labels.speciesDog') : t('labels.speciesCat');

export const sexLabel = (t: Translator, sex: Animal['sex']): string => sex === 'male' ? t('labels.sexMale') : t('labels.sexFemale');

/** Trait labels for the public detail page, read from the `portal.detail.*` keys. */
export const neuteredLabel = (t: Translator, value: NonNullable<Animal['neutered']>): string => t(`detail.neutered.${value}`);

export const energyLabel = (t: Translator, value: NonNullable<Animal['energyLevel']>): string => t(`detail.energy.${value}`);

export const sociabilityLabel = (t: Translator, value: NonNullable<Animal['goodWithChildren']>): string => t(`detail.sociability.${value}`);

export const sizeLabel = (t: Translator, size: Animal['size']): string | null => {
  switch (size) {
    case 'small':
      return t('labels.sizeSmall');
    case 'medium':
      return t('labels.sizeMedium');
    case 'large':
      return t('labels.sizeLarge');
    default:
      return null;
  }
};

/** A short "Cão · Fêmea · Médio porte" meta string, skipping absent values. */
export const animalMeta = (t: Translator, animal: Pick<Animal, 'species' | 'sex' | 'size'>): string[] => {
  const parts: string[] = [speciesLabel(t, animal.species), sexLabel(t, animal.sex)];
  const size = sizeLabel(t, animal.size);
  if (size) parts.push(size);
  return parts;
};

/** "8 meses" / "2 anos" via next-intl plurals, or null when the age is unknown. */
export const ageLabel = (t: Translator, a: AgeInput): string | null => {
  const m = ageInMonths(a);
  if (m == null) return null;
  return m < 12 ? t('labels.ageMonths', { months: m }) : t('labels.ageYears', { years: Math.floor(m / 12) });
};
