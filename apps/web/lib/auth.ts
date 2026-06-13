import bcrypt from 'bcryptjs';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { nextCookies } from 'better-auth/next-js';
import { phoneNumber } from 'better-auth/plugins';

import { db, schema } from '@acolhe-animal/db';
import { getMessaging } from '@acolhe-animal/integrations';
import { otpWhatsApp } from '@acolhe-animal/messaging';
import { serverEnv } from '@acolhe-animal/shared/env';

const OTP_EXPIRES_MINUTES = 5;

/**
 * better-auth server instance.
 *
 * Phone is the primary identifier (phoneNumber plugin); email is optional.
 * Passwords are hashed with bcrypt (matching the dev seed). OTP codes are sent
 * over WhatsApp via the messaging integration — in dev (mock) they print to the
 * server console. See `stack-arquitetura.md` › Autenticação.
 */
export const auth = betterAuth({
  baseURL: serverEnv().BETTER_AUTH_URL,
  secret: serverEnv().BETTER_AUTH_SECRET,
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
      signUpOnVerification: {
        getTempEmail: (phone) => `${phone.replace(/\D/g, '')}@phone.acolhe.animal`,
      },
    }),
    nextCookies(),
  ],
});

export type Auth = typeof auth;
