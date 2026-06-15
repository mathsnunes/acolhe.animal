/**
 * @acolhe-animal/messaging — versioned WhatsApp + email templates.
 *
 * Pure render functions: the domain calls these to build a message body, then
 * hands it to the integrations layer to send. No I/O here.
 */
export * from './types';
export * from './templates';
