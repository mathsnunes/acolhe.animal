import type { WhatsAppMessage } from '../types';

export const INVITE_TEMPLATE_VERSION = 'invite-v1';

/** WhatsApp invitation to join an organization. */
export const inviteWhatsApp = (params: {
  organizationName: string;
  acceptUrl: string;
}): WhatsAppMessage => ({
    text:
      `Você foi convidado(a) para a ${params.organizationName} no Acolhe.animal.\n\n` +
      `Para ativar seu acesso, é só abrir o link:\n${params.acceptUrl}\n\n` +
      `O convite vale por 7 dias.`,
  });
