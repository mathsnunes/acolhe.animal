import type { Animal } from '@acolhe-animal/db';

/** pt-BR display labels for animal attributes shown on the public portal. */

/** A translator for the `portal` namespace (e.g. from `useTranslations('portal')`). */
type Translator = (key: string) => string;

export function speciesLabel(t: Translator, species: Animal['species']): string {
  return species === 'dog' ? t('labels.speciesDog') : t('labels.speciesCat');
}

export function sexLabel(t: Translator, sex: Animal['sex']): string {
  return sex === 'male' ? t('labels.sexMale') : t('labels.sexFemale');
}

export function sizeLabel(t: Translator, size: Animal['size']): string | null {
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
}

/** A short "Cão · Fêmea · Médio porte" meta string, skipping absent values. */
export function animalMeta(
  t: Translator,
  animal: Pick<Animal, 'species' | 'sex' | 'size'>,
): string[] {
  const parts: string[] = [speciesLabel(t, animal.species), sexLabel(t, animal.sex)];
  const size = sizeLabel(t, animal.size);
  if (size) parts.push(size);
  return parts;
}
