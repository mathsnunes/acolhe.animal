import { createId } from '@acolhe-animal/shared';

import type { EmailProvider, SendEmailInput, SendEmailResult } from './types';

const outbox: Array<SendEmailInput & { id: string; at: Date }> = [];

/** Mock email provider — logs subject + recipient and keeps an in-memory outbox. */
export class MockEmailProvider implements EmailProvider {
  readonly name = 'mock-email';

  async send(input: SendEmailInput): Promise<SendEmailResult> {
    const id = createId('timelineEvent');
    outbox.push({ ...input, id, at: new Date() });
    // eslint-disable-next-line no-console
    console.log(`\n✉️  [Email → ${input.to}] ${input.subject}\n`);
    return { id };
  }
}

export function getMockEmailOutbox(): ReadonlyArray<SendEmailInput & { id: string; at: Date }> {
  return outbox;
}
