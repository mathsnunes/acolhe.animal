/**
 * Progressive input masks for the auth forms. Unlike the display formatters in
 * `@acolhe-animal/shared` (which format a *complete* value), these format
 * partial input as the user types. Pure string → string; the canonical
 * normalization (E.164, digits-only) still happens in the Zod schemas.
 */

const digits = (value: string): string => value.replace(/\D/g, '');

/** "(48) 99999-0000" — mobile (11) or landline (10) BR phone, as typed. */
export const maskPhoneBR = (value: string): string => {
  const d = digits(value).slice(0, 11);
  if (d.length > 10) return d.replace(/^(\d{2})(\d{5})(\d{0,4}).*/, '($1) $2-$3');
  if (d.length > 6) return d.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, '($1) $2-$3');
  if (d.length > 2) return d.replace(/^(\d{2})(\d{0,5}).*/, '($1) $2');
  if (d.length > 0) return d.replace(/^(\d{0,2})/, '($1');
  return '';
};

/** "000.000.000-00" — CPF, as typed. */
export const maskCpf = (value: string): string => {
  const d = digits(value).slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1-$2');
};

/** "00.000.000/0000-00" — CNPJ, as typed. */
export const maskCnpj = (value: string): string => {
  const d = digits(value).slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
};

/** Six numeric digits, nothing else — for OTP inputs. */
export const maskOtp = (value: string): string => digits(value).slice(0, 6);
