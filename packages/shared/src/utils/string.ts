// Combining diacritical marks (U+0300–U+036F), stripped after NFD normalization.
const DIACRITICS = new RegExp('[\\u0300-\\u036f]', 'g');

/**
 * Remove diacritics (accents) and lowercase — the canonical form used for
 * search/matching across the product (city autocomplete, special-conditions
 * tags, etc.). "Criciúma" → "criciuma".
 */
export const normalizeForSearch = (input: string): string => input
    .normalize('NFD')
    .replace(DIACRITICS, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');

/** Turn a free-text name into a URL-safe kebab-case slug. */
export const slugify = (input: string): string => input
    .normalize('NFD')
    .replace(DIACRITICS, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/** Keep only digits — used to strip masks from phone, CPF, CNPJ, CEP. */
export const onlyDigits = (input: string): string => input.replace(/\D+/g, '');

/** Initials for avatar fallbacks: "Maria Silva" → "MS". */
export const initials = (name: string, max = 2): string => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0]!.slice(0, max).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
};
