import type { Animal } from '@acolhe-animal/db';

/** pt-BR display labels for animal attributes shown on the public portal. */

/** A translator for the `portal` namespace (e.g. from `useTranslations('portal')`). */
type Translator = (key: string) => string;

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

type AgeFields = Partial<Pick<Animal, 'estimatedBirthDate' | 'ageMonthsAtIntake' | 'ageReferenceDate'>>;

const ageInMonths = (a: AgeFields): number | null => {
  if (a.estimatedBirthDate) {
    const b = new Date(a.estimatedBirthDate);
    const now = new Date();
    const m = (now.getFullYear() - b.getFullYear()) * 12 + (now.getMonth() - b.getMonth());
    return m >= 0 ? m : null;
  }
  if (a.ageMonthsAtIntake != null) {
    const elapsed = a.ageReferenceDate
      ? Math.max(0, Math.floor((Date.now() - new Date(a.ageReferenceDate).getTime()) / (1000 * 60 * 60 * 24 * 30.44)))
      : 0;
    return a.ageMonthsAtIntake + elapsed;
  }
  return null;
};

/** "8 meses" / "2 anos" — pt-BR, or null when the age is unknown. */
export const ageLabel = (a: AgeFields): string | null => {
  const m = ageInMonths(a);
  if (m == null) return null;
  if (m < 12) return `${m} ${m === 1 ? 'mês' : 'meses'}`;
  const y = Math.floor(m / 12);
  return `${y} ${y === 1 ? 'ano' : 'anos'}`;
};

export type AgeGroup = 'baby' | 'adult' | 'senior';

/** Filhote (<1a), adulto (1–7a), idoso (7a+) — for the portal age filter. */
export const ageGroupOf = (a: AgeFields): AgeGroup | null => {
  const m = ageInMonths(a);
  if (m == null) return null;
  if (m < 12) return 'baby';
  if (m < 84) return 'adult';
  return 'senior';
};
