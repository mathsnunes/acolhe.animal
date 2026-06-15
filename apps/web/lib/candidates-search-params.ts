/**
 * pt-BR ↔ canonical mapping for the candidates-listing query string.
 *
 * The URL is pt-BR (`?situacao=novas&responsavel=sem&layout=tabela`); the code
 * works in canonical values (the funnel buckets / domain ids). This module is the
 * single place that translates both directions, used by the page (decode) and the
 * filters component (encode). `animal` and `responsavel` carry opaque ids, so only
 * `status` and `view` have value maps — the rest pass through unchanged.
 */
export const CANDIDATES_PARAM_KEYS = {
  status: 'situacao',
  search: 'busca',
  animal: 'animal',
  responsible: 'responsavel',
  view: 'layout',
} as const;

export type CanonicalKey = keyof typeof CANDIDATES_PARAM_KEYS;

/** Keys whose values are free-form ids/text and must not be value-mapped. */
const PASSTHROUGH_KEYS = new Set<CanonicalKey>(['search', 'animal', 'responsible']);

/** Canonical value → pt-BR value, per mapped parameter. */
const VALUE_TO_PT: Record<'status' | 'view', Record<string, string>> = {
  status: {
    new: 'novas',
    'in-progress': 'em-avaliacao',
    approved: 'aprovadas',
    closed: 'encerradas',
  },
  view: { quadro: 'quadro', tabela: 'tabela' },
};

const invert = (map: Record<string, string>): Record<string, string> =>
  Object.fromEntries(Object.entries(map).map(([k, v]) => [v, k]));
const VALUE_FROM_PT = Object.fromEntries(
  Object.entries(VALUE_TO_PT).map(([k, m]) => [k, invert(m)]),
) as Record<'status' | 'view', Record<string, string>>;

/** Encode a canonical (key, value) into the pt-BR (key, value) for the URL. */
export const encodeCandidatesParam = (
  key: CanonicalKey,
  value: string,
): { ptKey: string; ptValue: string } => {
  const ptKey = CANDIDATES_PARAM_KEYS[key];
  if (PASSTHROUGH_KEYS.has(key) || !value) return { ptKey, ptValue: value };
  return { ptKey, ptValue: VALUE_TO_PT[key as 'status' | 'view'][value] ?? value };
};

export type DecodedCandidatesParams = Partial<Record<CanonicalKey, string>>;

/** Decode the pt-BR search params object into canonical values. */
export const decodeCandidatesParams = (
  pt: Partial<Record<string, string>>,
): DecodedCandidatesParams => {
  const out: DecodedCandidatesParams = {};
  for (const key of Object.keys(CANDIDATES_PARAM_KEYS) as CanonicalKey[]) {
    const raw = pt[CANDIDATES_PARAM_KEYS[key]];
    if (raw == null || raw === '') continue;
    out[key] = PASSTHROUGH_KEYS.has(key)
      ? raw
      : (VALUE_FROM_PT[key as 'status' | 'view'][raw] ?? raw);
  }
  return out;
};
