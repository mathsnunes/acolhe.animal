import type { WhatsAppMessage } from '../types';

export const APPLICATION_TEMPLATE_VERSION = 'application-v1';

/** Confirmation to the candidate right after they submit the adoption form. */
export const applicationReceivedWhatsApp = (params: {
  candidateName: string;
  animalName: string;
  organizationName: string;
}): WhatsAppMessage => ({
    text:
      `Oi, ${params.candidateName}! Sua candidatura para a adoção da ${params.animalName} ` +
      `foi recebida pela ${params.organizationName}. 💛\n\n` +
      `Em breve alguém da equipe entra em contato por aqui mesmo. Obrigado por querer adotar.`,
  });

/** Notify the candidate when the org moves their application forward. */
export const applicationStatusWhatsApp = (params: {
  candidateName: string;
  animalName: string;
  status: 'in-progress' | 'approved' | 'rejected';
}): WhatsAppMessage => {
  const message =
    params.status === 'approved'
      ? `Temos uma ótima notícia sobre a ${params.animalName}! Sua candidatura foi aprovada. ` +
        `Vamos seguir com os próximos passos por aqui.`
      : params.status === 'in-progress'
        ? `A equipe começou a analisar sua candidatura para a ${params.animalName}. ` +
          `Pode ser que a gente chame para conversar — fica de olho por aqui.`
        : `Sobre sua candidatura para a ${params.animalName}: dessa vez não foi possível seguir. ` +
          `Agradecemos de coração o seu interesse em adotar.`;

  return { text: `Oi, ${params.candidateName}! ${message}` };
};
