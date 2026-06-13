import type { EmailProvider, SendEmailInput, SendEmailResult } from './types';

/** Resend adapter. Stubbed for the MVP — wire the Resend SDK here when live. */
export class ResendEmailProvider implements EmailProvider {
  readonly name = 'resend';

  send(_input: SendEmailInput): Promise<SendEmailResult> {
    throw new Error('ResendEmailProvider não implementado no MVP. Use INTEGRATIONS_MODE=mock.');
  }
}
