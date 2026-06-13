/**
 * WhatsApp messaging provider (Evolution API in production). Used for OTP codes,
 * transactional notifications and receipts. The domain depends only on this
 * interface — see `stack-arquitetura.md` › Mensageria.
 */
export interface SendMessageInput {
  /** Recipient phone in E.164, e.g. `+5548999998888`. */
  to: string;
  body: string;
}

export interface SendMessageResult {
  id: string;
}

export interface MessagingProvider {
  readonly name: string;
  sendText(input: SendMessageInput): Promise<SendMessageResult>;
}
