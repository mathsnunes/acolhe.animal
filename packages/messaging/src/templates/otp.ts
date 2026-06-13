import type { EmailMessage, WhatsAppMessage } from '../types';

export const OTP_TEMPLATE_VERSION = 'otp-v1';

/** WhatsApp OTP code (login, signup, phone confirmation). */
export function otpWhatsApp(params: { code: string; expiresInMinutes: number }): WhatsAppMessage {
  return {
    text:
      `Seu código de acesso ao Acolhe.animal é *${params.code}*.\n\n` +
      `Ele vale por ${params.expiresInMinutes} minutos. Não compartilhe com ninguém.`,
  };
}

/** Email OTP — fallback channel when the user has a verified email. */
export function otpEmail(params: { code: string; expiresInMinutes: number }): EmailMessage {
  return {
    subject: `Seu código de acesso: ${params.code}`,
    text: `Seu código de acesso ao Acolhe.animal é ${params.code}. Vale por ${params.expiresInMinutes} minutos.`,
    html: `<p>Seu código de acesso ao Acolhe.animal é <strong>${params.code}</strong>.</p><p>Ele vale por ${params.expiresInMinutes} minutos. Não compartilhe com ninguém.</p>`,
  };
}
