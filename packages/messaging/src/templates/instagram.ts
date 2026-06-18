import type { InstagramArtType } from '@acolhe-animal/shared';

export const INSTAGRAM_TEMPLATE_VERSION = 'instagram-v1';

/**
 * Humanized, primitive inputs the domain prepares from the animal + org rows.
 * Keeping it primitive lets this stay a pure template with no `db` dependency.
 */
export interface InstagramContentParams {
  animalName: string;
  /** Portuguese article for phrasing: "a Frida" / "o Thor". */
  article: 'a' | 'o';
  species: 'dog' | 'cat' | 'other';
  ageLabel?: string; // "~4 anos"
  sizeLabel?: string; // "porte médio"
  weightLabel?: string; // "14kg"
  /** Status flags already gendered, e.g. ["vacinada", "castrada"]. */
  flags: string[];
  /** Temperament phrases, e.g. ["dócil com crianças", "ótima com outros cães"]. */
  temperament: string[];
  shortStory?: string;
  orgName: string;
  cityName?: string; // "Criciúma"
}

/** What the renderer needs (the on-image copy) plus the suggested caption. */
export interface InstagramContent {
  eyebrow: string;
  title: { lead: string; accent: string; tail: string };
  facts: string;
  caption: string;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const emoji = (species: InstagramContentParams['species']) => (species === 'cat' ? '🐱' : species === 'dog' ? '🐶' : '🐾');

/** Turn a name/city into a bare hashtag token (no accents, no spaces). */
const COMBINING_MARKS = new RegExp('[\\u0300-\\u036f]', 'g');

const tag = (s: string) =>
  s
    .normalize('NFD')
    .replace(COMBINING_MARKS, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase();

const hashtags = (p: InstagramContentParams) =>
  ['#adote', '#adocaoresponsavel', `#${tag(p.orgName)}`, ...(p.cityName ? [`#${tag(p.cityName)}`] : [])].join(' ');

/** Short fact strip for the image: up to four scannable tokens. */
const factStrip = (p: InstagramContentParams) =>
  [p.ageLabel, p.sizeLabel, p.weightLabel, p.flags[0]].filter(Boolean).join(' · ');

/**
 * Build the on-image copy + caption for a given format. pt-BR, deterministic.
 * Feed gets the rich caption; story stays short and hashtag-led.
 */
export const instagramContent = (type: InstagramArtType, p: InstagramContentParams): InstagramContent => {
  if (type === 'story-vertical') {
    return {
      eyebrow: 'Adoção',
      title: { lead: cap(p.article), accent: p.animalName, tail: 'quer um lar.' },
      facts: factStrip(p),
      caption:
        `${p.animalName}${p.ageLabel ? `, ${p.ageLabel},` : ''} esperando um lar ${emoji(p.species)}\n\n` +
        `Vem conhecer ${p.article} ${p.animalName} — link na bio.\n\n` +
        hashtags(p),
    };
  }

  // feed-square
  const detailParts = [
    p.ageLabel && `tem ${p.ageLabel}`,
    [p.sizeLabel, p.weightLabel && `(${p.weightLabel})`].filter(Boolean).join(' '),
    p.flags.length ? p.flags.join(', ') : '',
  ].filter(Boolean);
  const details = detailParts.length ? `${cap(p.article)} ${p.animalName} ${detailParts.join(', ')}.` : '';
  const temperament = p.temperament.length ? ` ${cap(p.temperament.join(', '))}.` : '';
  const story = p.shortStory ? `\n\n${p.shortStory.trim()}` : '';

  return {
    eyebrow: 'Espera por um lar',
    title: { lead: `Conhece ${p.article}`, accent: p.animalName, tail: '?' },
    facts: factStrip(p),
    caption:
      `${emoji(p.species)} ${cap(p.article)} ${p.animalName} tá esperando uma família.\n\n` +
      `${details}${temperament}${story}\n\n` +
      `Quer adotar ou conhecer melhor? Chama a ${p.orgName} ou comenta aqui. 💛\n\n` +
      hashtags(p),
  };
};
