import { z } from 'zod';

/**
 * Server-side environment validation.
 *
 * Imported via the `@acolhe-animal/shared/env` subpath so it never leaks into a
 * client bundle. Validation is lazy + memoized: it runs the first time a server
 * module calls `serverEnv()`, fails loud with a readable message if something
 * required is missing, and caches the result.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().url('DATABASE_URL deve ser uma URL de conexão válida.'),

  BETTER_AUTH_SECRET: z.string().min(16, 'BETTER_AUTH_SECRET muito curto.'),
  BETTER_AUTH_URL: z.string().url().default('http://localhost:3000'),

  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),

  /** `mock` stubs every external provider; `live` uses real adapters. */
  INTEGRATIONS_MODE: z.enum(['mock', 'live']).default('mock'),

  // ── Encryption (always present; defaults are dev-only placeholders) ──
  ASAAS_KEY_ENCRYPTION_SECRET: z.string().min(16).default('dev-only-insecure-secret-32chars!'),
  PAYOUT_ENCRYPTION_SECRET: z.string().min(16).default('dev-only-insecure-secret-32char2!'),

  // ── Provider credentials (required only when INTEGRATIONS_MODE=live) ──
  ASAAS_API_KEY: z.string().optional(),
  ASAAS_ENV: z.enum(['sandbox', 'production']).default('sandbox'),
  ASAAS_WEBHOOK_SECRET: z.string().optional(),
  MASTER_WALLET_ID: z.string().optional(),

  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET: z.string().default('acolhe-animal'),
  /**
   * Public base for stored objects. In `mock` keep it ORIGIN-RELATIVE
   * (`/local-storage`) so URLs resolve against whatever host serves the app
   * (localhost, a dev tunnel, the LAN IP) with no per-run changes. In `live` set
   * it to the absolute R2 public domain (`https://…`).
   */
  R2_PUBLIC_URL: z.string().default('/local-storage'),

  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default('Acolhe.animal <nao-responda@acolhe.animal>'),

  EVOLUTION_API_URL: z.string().optional(),
  EVOLUTION_API_KEY: z.string().optional(),
  EVOLUTION_INSTANCE: z.string().default('acolhe-animal'),
});

export type ServerEnv = z.infer<typeof envSchema>;

let cached: ServerEnv | null = null;

export const serverEnv = (): ServerEnv => {
  if (cached) return cached;

  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Variáveis de ambiente inválidas:\n${issues}`);
  }

  cached = parsed.data;
  return cached;
};

export const isLiveIntegrations = (): boolean => serverEnv().INTEGRATIONS_MODE === 'live';
