import { createId } from '@acolhe-animal/shared';

import type { MessagingProvider, SendMessageInput, SendMessageResult } from './types';

/**
 * Mock WhatsApp sender. Logs to the server console and keeps an in-memory outbox.
 *
 * In dev this is how you read OTP codes: they print to the terminal running
 * `pnpm dev`. The outbox is also queryable (`getMockOutbox()`) for tests.
 */
const outbox: Array<SendMessageInput & { id: string; at: Date }> = [];

export class MockMessagingProvider implements MessagingProvider {
  readonly name = 'mock-whatsapp';

  async sendText(input: SendMessageInput): Promise<SendMessageResult> {
    const id = createId('timelineEvent');
    outbox.push({ ...input, id, at: new Date() });
     
    console.log(`\n📲 [WhatsApp → ${input.to}]\n${input.body}\n`);
    return { id };
  }
}

export const getMockOutbox = (): ReadonlyArray<SendMessageInput & { id: string; at: Date }> => outbox;
