/**
 * Email provider (Resend in production). Secondary channel: receipts, fallback
 * OTP, formal notifications. See `stack-arquitetura.md` › E-mail.
 */
export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface SendEmailResult {
  id: string;
}

export interface EmailProvider {
  readonly name: string;
  send(input: SendEmailInput): Promise<SendEmailResult>;
}
