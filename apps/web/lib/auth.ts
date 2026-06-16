import bcrypt from 'bcryptjs';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { nextCookies } from 'better-auth/next-js';
import { emailOTP, phoneNumber } from 'better-auth/plugins';

import { db, schema } from '@acolhe-animal/db';
import { getEmail, getMessaging } from '@acolhe-animal/integrations';
import { otpEmail, otpWhatsApp } from '@acolhe-animal/messaging';
import { serverEnv } from '@acolhe-animal/shared/env';

const OTP_EXPIRES_MINUTES = 5;

const env = serverEnv();

/**
 * Origins better-auth accepts cross-origin requests from. Always includes the
 * configured app URLs; extra hosts come from `BETTER_AUTH_TRUSTED_ORIGINS`.
 * Outside production we also trust ephemeral dev tunnels (Cloudflare Quick
 * Tunnel, ngrok) so logging in through a shared preview URL just works.
 */
const trustedOrigins = [
  ...new Set([
    new URL(env.BETTER_AUTH_URL).origin,
    new URL(env.NEXT_PUBLIC_APP_URL).origin,
    ...(env.BETTER_AUTH_TRUSTED_ORIGINS?.split(',').map((o) => o.trim()).filter(Boolean) ?? []),
    ...(env.NODE_ENV !== 'production'
      ? ['https://*.trycloudflare.com', 'https://*.ngrok-free.app', 'https://*.ngrok.io']
      : []),
  ]),
];

/**
 * better-auth server instance.
 *
 * Phone is the primary identifier (phoneNumber plugin); email is optional.
 * Passwords are hashed with bcrypt (matching the dev seed). OTP codes are sent
 * over WhatsApp via the messaging integration — in dev (mock) they print to the
 * server console. See `stack-arquitetura.md` › Autenticação.
 */
export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins,
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
    password: {
      hash: (password) => bcrypt.hash(password, 10),
      verify: ({ hash, password }) => bcrypt.compare(password, hash),
    },
  },
  user: {
    additionalFields: {
      status: { type: 'string', defaultValue: 'active', input: false },
      lastSeenAt: { type: 'date', required: false, input: false },
    },
  },
  plugins: [
    phoneNumber({
      sendOTP: async ({ phoneNumber: phone, code }) => {
        const msg = otpWhatsApp({ code, expiresInMinutes: OTP_EXPIRES_MINUTES });
        await getMessaging().sendText({ to: phone, body: msg.text });
      },
      // Password recovery (WhatsApp-first): the dedicated reset OTP goes over the
      // same channel as verification — see `recover` flow.
      sendPasswordResetOTP: async ({ phoneNumber: phone, code }) => {
        const msg = otpWhatsApp({ code, expiresInMinutes: OTP_EXPIRES_MINUTES });
        await getMessaging().sendText({ to: phone, body: msg.text });
      },
      signUpOnVerification: {
        getTempEmail: (phone) => `${phone.replace(/\D/g, '')}@phone.acolhe.animal`,
      },
    }),
    // Email fallback for password recovery only (offered after the WhatsApp resend
    // cooldown, and only when the account has an email). Other OTP types are unused.
    emailOTP({
      otpLength: 6,
      expiresIn: OTP_EXPIRES_MINUTES * 60,
      sendVerificationOTP: async ({ email, otp }) => {
        const msg = otpEmail({ code: otp, expiresInMinutes: OTP_EXPIRES_MINUTES });
        await getEmail().send({ to: email, subject: msg.subject, html: msg.html, text: msg.text });
      },
    }),
    nextCookies(),
  ],
});

export type Auth = typeof auth;
