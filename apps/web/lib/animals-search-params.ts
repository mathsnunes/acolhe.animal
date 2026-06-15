/**
 * pt-BR ↔ canonical mapping for the animals-listing query string.
 *
 * The URL is pt-BR (`?especie=cachorro&tamanho=pequeno&layout=lista`); the code
 * works in canonical values (`species=dog`, the domain enums). This module is the
 * single place that translates both directions, used by the page (decode) and the
 * filters component (encode).
 */
export const ANIMALS_PARAM_KEYS = {
  status: 'situacao',
  search: 'busca',
  species: 'especie',
  size: 'tamanho',
  age: 'idade',
  sort: 'ordenar',
  view: 'layout',
} as const;

export type CanonicalKey = keyof typeof ANIMALS_PARAM_KEYS;

/** Canonical value → pt-BR value, per parameter (search is free text, no map). */
const VALUE_TO_PT: Record<Exclude<CanonicalKey, 'search'>, Record<string, string>> = {
  status: {
    available: 'disponivel',
    'under-review': 'em-avaliacao',
    reserved: 'reservado',
    adopted: 'adotado',
    unavailable: 'indisponivel',
  },
  species: { dog: 'cachorro', cat: 'gato' },
  size: { small: 'pequeno', medium: 'medio', large: 'grande' },
  age: { baby: 'filhote', adult: 'adulto', senior: 'idoso' },
  sort: { name: 'nome' },
  // `view` values are kept as-is (e.g. `?layout=list`) — only the key is pt-BR.
  view: {},
};

const invert = (map: Record<string, string>): Record<string, string> => Object.fromEntries(Object.entries(map).map(([k, v]) => [v, k]));
const VALUE_FROM_PT = Object.fromEntries(
  Object.entries(VALUE_TO_PT).map(([k, m]) => [k, invert(m)]),
) as Record<Exclude<CanonicalKey, 'search'>, Record<string, string>>;

/** Encode a canonical (key, value) into the pt-BR (key, value) for the URL. */
export const encodeAnimalsParam = (key: CanonicalKey, value: string): { ptKey: string; ptValue: string } => {
  const ptKey = ANIMALS_PARAM_KEYS[key];
  if (key === 'search' || !value) return { ptKey, ptValue: value };
  return { ptKey, ptValue: VALUE_TO_PT[key][value] ?? value };
};

export type DecodedAnimalsParams = Partial<Record<CanonicalKey, string>>;

/** Decode the pt-BR search params object into canonical values. */
export const decodeAnimalsParams = (pt: Partial<Record<string, string>>): DecodedAnimalsParams => {
  const out: DecodedAnimalsParams = {};
  for (const key of Object.keys(ANIMALS_PARAM_KEYS) as CanonicalKey[]) {
    const raw = pt[ANIMALS_PARAM_KEYS[key]];
    if (raw == null || raw === '') continue;
    out[key] = key === 'search' ? raw : (VALUE_FROM_PT[key][raw] ?? raw);
  }
  return out;
};
