/**
 * Rendered message shapes. WhatsApp templates produce `text`; email templates
 * additionally produce `subject` + `html`. Templates are pure functions — they
 * render, the integrations layer sends. Versioned in the repo (as code) per
 * `stack-arquitetura.md` › Mensageria.
 *
 * Note: email bodies are HTML strings for the MVP; migrating to react-email is a
 * follow-up that doesn't change this contract.
 */
export interface WhatsAppMessage {
  text: string;
}

export interface EmailMessage {
  subject: string;
  html: string;
  text: string;
}
