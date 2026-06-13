import type { MessagingProvider, SendMessageInput, SendMessageResult } from './types';

/**
 * Evolution API (self-hosted WhatsApp) adapter. Stubbed for the MVP — implement
 * the HTTP call to the Evolution instance here when `INTEGRATIONS_MODE=live`.
 */
export class EvolutionMessagingProvider implements MessagingProvider {
  readonly name = 'evolution';

  sendText(_input: SendMessageInput): Promise<SendMessageResult> {
    throw new Error(
      'EvolutionMessagingProvider não implementado no MVP. Use INTEGRATIONS_MODE=mock.',
    );
  }
}
