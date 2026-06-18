/**
 * Animal age derivation — shared by the admin listings and the public portal so
 * the "how old is this animal / which bucket" rule has a single source of truth.
 * Operates on plain data (no `db` dependency, keeping this package isomorphic).
 */

/** The age-bearing fields of an animal, as plain data. */
export type AgeInput = {
  estimatedBirthDate?: Date | string | null;
  ageMonthsAtIntake?: number | null;
  ageReferenceDate?: Date | string | null;
};

export type AgeGroup = 'baby' | 'adult' | 'senior';

const MS_PER_MONTH = 1000 * 60 * 60 * 24 * 30.44;

/** Current age in whole months, from a birth date or months-at-intake; null if unknown. */
export const ageInMonths = (a: AgeInput): number | null => {
  if (a.estimatedBirthDate) {
    const birth = new Date(a.estimatedBirthDate);
    const now = new Date();
    const months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
    return months >= 0 ? months : null;
  }
  if (a.ageMonthsAtIntake != null) {
    const elapsed = a.ageReferenceDate
      ? Math.max(0, Math.floor((Date.now() - new Date(a.ageReferenceDate).getTime()) / MS_PER_MONTH))
      : 0;
    const months = a.ageMonthsAtIntake + elapsed;
    return months >= 0 ? months : null;
  }
  return null;
};

/** Bucket for age filters: filhote (<1y), adulto (1–7y), idoso (7y+). */
export const ageGroupOf = (a: AgeInput): AgeGroup | null => {
  const months = ageInMonths(a);
  if (months == null) return null;
  if (months < 12) return 'baby';
  if (months < 84) return 'adult';
  return 'senior';
};
