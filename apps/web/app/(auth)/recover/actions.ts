'use server';

import { db } from '@acolhe-animal/db';
import { getUserByPhone } from '@acolhe-animal/domain';
import { normalizePhoneBR, ValidationError } from '@acolhe-animal/shared';

import { action } from '@/lib/action';
import { auth } from '@/lib/auth';

/** A temp signup email isn't a usable fallback address. */
const isRealEmail = (email: string | null): email is string => !!email && !email.endsWith('@phone.acolhe.animal');

/** "joao@gmail.com" → "j***@gmail.com" — never reveal the full address. */
const maskEmail = (email: string): string => {
  const [local, domain] = email.split('@');
  if (!local || !domain) return '***';
  return `${local[0]}***@${domain}`;
};

/**
 * WhatsApp-first recovery: send the phone reset OTP. Always returns ok (we never
 * reveal whether an account exists for that number — no enumeration).
 */
export const startPhoneRecoveryAction = async (phone: string): Promise<{ ok: boolean }> => {
  const e164 = normalizePhoneBR(phone);
  if (!e164) return { ok: false };
  try {
    await auth.api.requestPasswordResetPhoneNumber({ body: { phoneNumber: e164 } });
  } catch {
    /* unknown phone / send failure — swallow */
  }
  return { ok: true };
};

/**
 * Email fallback: look up the account by phone and, if it has a real email, send
 * the email reset OTP. Returns a masked hint so the client can confirm the
 * channel without learning the address.
 */
export const startEmailRecoveryAction = async (
  phone: string,
): Promise<{ ok: true; emailHint: string } | { ok: false; reason: 'no-email' }> => {
  const e164 = normalizePhoneBR(phone);
  if (!e164) return { ok: false, reason: 'no-email' };
  const user = await getUserByPhone(db, e164);
  if (!isRealEmail(user?.email ?? null)) return { ok: false, reason: 'no-email' };
  try {
    await auth.api.requestPasswordResetEmailOTP({ body: { email: user!.email! } });
  } catch {
    /* swallow */
  }
  return { ok: true, emailHint: maskEmail(user!.email!) };
};

/**
 * Complete recovery with the entered OTP + new password. The client only ever
 * holds the phone; for the email channel we resolve the address server-side, so
 * it stays private.
 */
export const completeRecoveryAction = async (input: {
  phone: string;
  otp: string;
  newPassword: string;
  channel: 'whatsapp' | 'email';
}) =>
  action(async () => {
    const e164 = normalizePhoneBR(input.phone);
    if (!e164) throw new ValidationError('Telefone inválido.');
    try {
      if (input.channel === 'email') {
        const user = await getUserByPhone(db, e164);
        if (!isRealEmail(user?.email ?? null)) throw new ValidationError('Conta sem email para recuperação.');
        await auth.api.resetPasswordEmailOTP({ body: { email: user!.email!, otp: input.otp, password: input.newPassword } });
      } else {
        await auth.api.resetPasswordPhoneNumber({ body: { otp: input.otp, phoneNumber: e164, newPassword: input.newPassword } });
      }
    } catch (err) {
      if (err instanceof ValidationError) throw err;
      throw new ValidationError('Código inválido ou expirado.');
    }
    return { ok: true };
  });
