/**
 * WhatsApp is the real conversation channel with candidates and adopters, so
 * every phone we show is a tappable wa.me deep link.
 */
export const whatsappHref = (phone: string, message?: string): string => {
  const digits = phone.replace(/\D/g, '');
  const base = `https://wa.me/${digits}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
};
