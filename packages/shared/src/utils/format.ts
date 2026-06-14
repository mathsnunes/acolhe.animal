import { format as formatDate, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { onlyDigits } from './string';

/** Format a value in reais as Brazilian currency: 1234.5 → "R$ 1.234,50". */
export const formatBRL = (amount: number | string): string => {
  const value = typeof amount === 'string' ? Number(amount) : amount;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number.isFinite(value) ? value : 0);
};

/** Format an E.164 BR phone for display: "+5548999998888" → "(48) 99999-8888". */
export const formatPhoneBR = (e164: string): string => {
  const digits = onlyDigits(e164).replace(/^55/, '');
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return e164;
};

/** Format CPF digits for display: "12345678901" → "123.456.789-01". */
export const formatCpf = (value: string): string => {
  const d = onlyDigits(value);
  if (d.length !== 11) return value;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
};

/** Format CNPJ digits for display: "12345678000190" → "12.345.678/0001-90". */
export const formatCnpj = (value: string): string => {
  const d = onlyDigits(value);
  if (d.length !== 14) return value;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
};

/** Mask a CPF/CNPJ for display where the full value must not be shown. */
export const maskDocument = (value: string): string => {
  const d = onlyDigits(value);
  if (d.length < 4) return '***';
  return `***.***.***-${d.slice(-2)}`;
};

/** Format CEP digits: "88801010" → "88801-010". */
export const formatCep = (value: string): string => {
  const d = onlyDigits(value);
  if (d.length !== 8) return value;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
};

/** Short date: "13/06/2026". */
export const formatDateBR = (date: Date | string | number): string => formatDate(new Date(date), 'dd/MM/yyyy', { locale: ptBR });

/** Relative time: "há 3 dias". */
export const formatRelative = (date: Date | string | number): string => formatDistanceToNow(new Date(date), { locale: ptBR, addSuffix: true });
