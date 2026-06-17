import { z } from 'zod';

import { isValidCnpj, isValidCpf } from '../utils/validation';
import { normalizePhoneBR } from '../utils/phone';
import { onlyDigits } from '../utils/string';

/**
 * Reusable field-level Zod schemas, shared between frontend and backend (same
 * definition validates the form and the Server Action / domain input). Error
 * messages are end-user pt-BR copy — see `stack-arquitetura.md` › "Validação".
 */

/** E.164 Brazilian phone. Normalizes masked input to `+55...` or fails. */
export const phoneSchema = z
  .string()
  .trim()
  .min(1, 'Informe um telefone.')
  .transform((value, ctx) => {
    const normalized = normalizePhoneBR(value);
    if (!normalized) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Telefone inválido.' });
      return z.NEVER;
    }
    return normalized;
  });

/**
 * Account password. Minimum 8 characters is the only hard rule — we favor strong
 * passwords through a non-blocking strength meter (see `passwordStrength`), not
 * by rejecting average ones. Reused by signup, recovery and invite acceptance.
 */
export const passwordSchema = z.string().min(8, 'A senha precisa ter ao menos 8 caracteres.');

/** Optional email — empty string becomes undefined. */
export const optionalEmailSchema = z
  .string()
  .trim()
  .email('E-mail inválido.')
  .optional()
  .or(z.literal('').transform(() => undefined));

export const cpfSchema = z
  .string()
  .trim()
  .transform(onlyDigits)
  .refine(isValidCpf, 'CPF inválido.');

export const cnpjSchema = z
  .string()
  .trim()
  .transform(onlyDigits)
  .refine(isValidCnpj, 'CNPJ inválido.');

/** A document tagged with its declared type (matches `organization.documentType`). */
export const documentSchema = z
  .object({
    documentType: z.enum(['cpf', 'cnpj']),
    document: z.string().trim().transform(onlyDigits),
  })
  .superRefine((val, ctx) => {
    const ok = val.documentType === 'cpf' ? isValidCpf(val.document) : isValidCnpj(val.document);
    if (!ok) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['document'],
        message: val.documentType === 'cpf' ? 'CPF inválido.' : 'CNPJ inválido.',
      });
    }
  });

/** CEP — 8 digits, no mask. */
export const postalCodeSchema = z
  .string()
  .trim()
  .transform(onlyDigits)
  .refine((d) => d.length === 8, 'CEP deve ter 8 dígitos.');

/** Hex color (#RGB or #RRGGBB), used in portal customization. */
export const hexColorSchema = z
  .string()
  .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Cor inválida (use formato hex, ex: #B85C3C).');

/**
 * Instagram handle, normalized to the bare username (drops `@`, a full URL, and
 * trailing slashes). Empty is allowed so the field can be cleared.
 */
export const instagramHandleSchema = z
  .string()
  .trim()
  .transform((v) =>
    v
      .replace(/^https?:\/\/(www\.)?instagram\.com\//i, '')
      .replace(/^@/, '')
      .replace(/\/+$/, '')
      .trim(),
  )
  .refine((v) => v === '' || /^[A-Za-z0-9._]{1,30}$/.test(v), 'Use só letras, números, ponto e underline.');

/** A monetary amount in reais — positive, up to 2 decimals. */
export const moneySchema = z
  .number({ invalid_type_error: 'Informe um valor.' })
  .positive('O valor deve ser maior que zero.')
  .multipleOf(0.01, 'Use no máximo 2 casas decimais.');

/** Slugs reserved by the platform — cannot be used as an org portal slug. */
export const RESERVED_SLUGS = new Set([
  'app',
  'api',
  'about',
  'admin',
  'assets',
  'static',
  'auth',
  'login',
  'register',
  'dashboard',
  'portal',
  'help',
  'docs',
  'blog',
  'pricing',
  'terms',
  'privacy',
  'contact',
  'support',
  'invite',
  'convite',
  'signup',
  'criar-conta',
  'recover',
  'recuperar-senha',
  // Route segments — keep these unreachable as org slugs. Both the pt-BR public
  // URLs and the underlying English route folders resolve, so reserve both.
  'inicio',
  'home',
  'animais',
  'animals',
  'candidatos',
  'candidates',
  'adocoes',
  'adoptions',
  'adotar',
  'adopt',
  'doacoes',
  'donations',
  'caixa',
  'cashflow',
  'campanhas',
  'campaigns',
  'historias',
  'stories',
  'itens-em-falta',
  'needed-items',
  'apoiadores',
  'supporters',
  'membros',
  'members',
  'config',
  'settings',
  'entrar',
  'onboarding',
  'local-storage',
]);

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, 'Mínimo de 3 caracteres.')
  .max(50, 'Máximo de 50 caracteres.')
  .regex(/^[a-z0-9-]+$/, 'Use apenas letras minúsculas, números e hífens.')
  .refine((s) => !s.startsWith('-') && !s.endsWith('-'), 'Não pode começar ou terminar com hífen.')
  .refine((s) => !RESERVED_SLUGS.has(s), 'Este endereço é reservado. Escolha outro.');
