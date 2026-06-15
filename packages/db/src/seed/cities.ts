import { normalizeForSearch } from '@acolhe-animal/shared';

import type { City } from '../types';

const c = (
  id: string,
  name: string,
  stateCode: string,
  stateName: string,
  region: City['region'],
  latitude: number,
  longitude: number,
  isCapital = false,
): City => ({
  id,
  name,
  normalizedName: normalizeForSearch(name),
  stateCode,
  stateName,
  region,
  microregion: null,
  mesoregion: null,
  metroArea: null,
  latitude: String(latitude),
  longitude: String(longitude),
  isCapital,
});

/**
 * Development city seed — a curated subset of the IBGE catalog.
 *
 * The full ~5.570-municipality import (kelvins/municipios-brasileiros + IBGE API)
 * is a follow-up (`modelagem-dados.md` › City). This subset covers every region
 * plus Criciúma/SC (home of the demo org Angeli Felice) so autocomplete, region
 * filters and the demo seed all work locally. Coordinates are approximate.
 */
export const DEV_CITIES: City[] = [
  // South
  c('4204608', 'Criciúma', 'SC', 'Santa Catarina', 'south', -28.6775, -49.3697),
  c('4205407', 'Florianópolis', 'SC', 'Santa Catarina', 'south', -27.5949, -48.5482, true),
  c('4207007', 'Içara', 'SC', 'Santa Catarina', 'south', -28.7133, -49.3, false),
  c('4314902', 'Porto Alegre', 'RS', 'Rio Grande do Sul', 'south', -30.0346, -51.2177, true),
  c('4106902', 'Curitiba', 'PR', 'Paraná', 'south', -25.4284, -49.2733, true),
  // Southeast
  c('3550308', 'São Paulo', 'SP', 'São Paulo', 'southeast', -23.5505, -46.6333, true),
  c('3304557', 'Rio de Janeiro', 'RJ', 'Rio de Janeiro', 'southeast', -22.9068, -43.1729, true),
  c('3106200', 'Belo Horizonte', 'MG', 'Minas Gerais', 'southeast', -19.9167, -43.9345, true),
  c('3205309', 'Vitória', 'ES', 'Espírito Santo', 'southeast', -20.3155, -40.3128, true),
  // Northeast
  c('2927408', 'Salvador', 'BA', 'Bahia', 'northeast', -12.9777, -38.5016, true),
  c('2611606', 'Recife', 'PE', 'Pernambuco', 'northeast', -8.0476, -34.877, true),
  c('2304400', 'Fortaleza', 'CE', 'Ceará', 'northeast', -3.7319, -38.5267, true),
  // North
  c('1302603', 'Manaus', 'AM', 'Amazonas', 'north', -3.119, -60.0217, true),
  c('1501402', 'Belém', 'PA', 'Pará', 'north', -1.4558, -48.5039, true),
  // Central-West
  c('5300108', 'Brasília', 'DF', 'Distrito Federal', 'central-west', -15.7939, -47.8828, true),
  c('5208707', 'Goiânia', 'GO', 'Goiás', 'central-west', -16.6869, -49.2648, true),
  c('5002704', 'Campo Grande', 'MS', 'Mato Grosso do Sul', 'central-west', -20.4697, -54.6201, true),
  c('5103403', 'Cuiabá', 'MT', 'Mato Grosso', 'central-west', -15.601, -56.0974, true),
];
