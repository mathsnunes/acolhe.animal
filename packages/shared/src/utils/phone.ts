import { onlyDigits } from './string';

/**
 * Normalize a Brazilian phone number to E.164 (`+5548999998888`).
 *
 * Phone is the product's primary identifier (see `stack-arquitetura.md`), so
 * normalization happens at the boundary, once, and the canonical E.164 form is
 * what gets stored and matched. Accepts masked input, with or without country
 * code. Returns `null` when the input cannot be a valid BR mobile/landline.
 */
export function normalizePhoneBR(input: string): string | null {
  let digits = onlyDigits(input);

  // Drop a leading country code if present.
  if (digits.length === 12 || digits.length === 13) {
    if (digits.startsWith('55')) digits = digits.slice(2);
  }

  // Expect 10 (landline) or 11 (mobile) digits: DDD + number.
  if (digits.length !== 10 && digits.length !== 11) return null;

  return `+55${digits}`;
}

export function isValidPhoneBR(input: string): boolean {
  return normalizePhoneBR(input) !== null;
}
