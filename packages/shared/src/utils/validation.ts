import { onlyDigits } from './string';

/**
 * CPF / CNPJ check-digit validation.
 *
 * Documents are stored as digits only (no mask) — see `modelagem-dados.md`.
 * Validation runs at input time in the application layer. These implement the
 * standard Receita Federal modulo-11 algorithms.
 */

export const isValidCpf = (value: string): boolean => {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11) return false;
  // Reject known invalid sequences (all same digit).
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  const digits = cpf.split('').map(Number);

  const checkDigit = (length: number): number => {
    let sum = 0;
    for (let i = 0; i < length; i++) {
      sum += digits[i]! * (length + 1 - i);
    }
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };

  return checkDigit(9) === digits[9] && checkDigit(10) === digits[10];
};

export const isValidCnpj = (value: string): boolean => {
  const cnpj = onlyDigits(value);
  if (cnpj.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cnpj)) return false;

  const digits = cnpj.split('').map(Number);

  const checkDigit = (length: number): number => {
    const weights =
      length === 12
        ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
        : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let sum = 0;
    for (let i = 0; i < length; i++) {
      sum += digits[i]! * weights[i]!;
    }
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };

  return checkDigit(12) === digits[12] && checkDigit(13) === digits[13];
};

/** Validate a document against the declared type. */
export const isValidDocument = (value: string, type: 'cpf' | 'cnpj'): boolean => type === 'cpf' ? isValidCpf(value) : isValidCnpj(value);
