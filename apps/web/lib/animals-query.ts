import type { Animal } from '@acolhe-animal/db';
import type { AnimalAgeGroup, ListAnimalsFilters } from '@acolhe-animal/domain';

/**
 * Canonical (English) filter parsing + the listing's page shape, shared by the
 * server page (first page) and the "load more" Server Action so both run the
 * exact same query. The URL is pt-BR and decoded upstream
 * (`lib/animals-search-params.ts`); here we only validate the canonical values
 * and map them to the domain's {@link ListAnimalsFilters}.
 */

const STATUS_VALUES = [
  'draft',
  'available',
  'under-review',
  'reserved',
  'adopted',
  'unavailable',
] as const;
type AnimalStatusValue = (typeof STATUS_VALUES)[number];

/** Canonical filter values as held in the URL/UI (before mapping to the domain). */
export interface AnimalsFilterInput {
  status?: string;
  species?: string;
  size?: string;
  search?: string;
  age?: string;
  sort?: string;
}

export const asStatus = (v?: string): AnimalStatusValue | undefined =>
  STATUS_VALUES.includes(v as AnimalStatusValue) ? (v as AnimalStatusValue) : undefined;
export const asSpecies = (v?: string): Animal['species'] | undefined =>
  v === 'dog' || v === 'cat' ? v : undefined;
export const asSize = (v?: string): NonNullable<Animal['size']> | undefined =>
  v === 'small' || v === 'medium' || v === 'large' ? v : undefined;
export const asAge = (v?: string): AnimalAgeGroup | undefined =>
  v === 'baby' || v === 'adult' || v === 'senior' ? v : undefined;
export const asSort = (v?: string): 'name' | undefined => (v === 'name' ? 'name' : undefined);

/** Map canonical URL filters → the domain's filters (admin scope: drafts included). */
export const toListAnimalsFilters = (f: AnimalsFilterInput): ListAnimalsFilters => {
  const status = asStatus(f.status);
  return {
    status: status ? [status] : undefined,
    species: asSpecies(f.species),
    size: asSize(f.size),
    search: f.search?.trim() || undefined,
    age: asAge(f.age),
    orderBy: asSort(f.sort) === 'name' ? 'name' : 'recent',
    includeDrafts: true,
  };
};

/** One animal as the listings render it: the row plus its derived cover + waiting count. */
export interface AnimalListItem {
  animal: Animal;
  coverUrl: string | null;
  waiting: number;
}

/** A page of the admin listing, returned by the server page and the load-more action. */
export interface AnimalsPage {
  items: AnimalListItem[];
  /** Offset to request next; pass straight back into the action. */
  nextOffset: number;
  hasMore: boolean;
}

/** Cards/rows fetched per page on the admin listing. */
export const ANIMALS_PAGE_SIZE = 24;
