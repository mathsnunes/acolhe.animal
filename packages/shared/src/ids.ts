import { customAlphabet } from 'nanoid';

/**
 * Prefixed ID generation.
 *
 * Every domain entity uses a string PK of the form `<prefix>_<nanoid>` so that
 * an ID is self-describing in logs and debugging (`org_V1StGXR8...`). IDs are
 * generated in the application layer (never in the database) — see
 * `modelagem-dados.md` › "IDs".
 *
 * Alphabet excludes look-alike characters (0/O, 1/l/I) to keep IDs readable
 * when copied by hand from a log line.
 */
const ALPHABET = '23456789abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';
const ID_LENGTH = 21;

const nano = customAlphabet(ALPHABET, ID_LENGTH);

/** Known entity prefixes. The single source of truth for ID shapes. */
export const ID_PREFIX = {
  organization: 'org',
  organizationInvite: 'invite',
  organizationMember: 'member',
  animal: 'animal',
  animalPhoto: 'photo',
  animalVideo: 'video',
  animalInstagramArt: 'art',
  person: 'person',
  application: 'app',
  adoption: 'adopt',
  donor: 'donor',
  supporter: 'supp',
  campaign: 'camp',
  campaignItem: 'citem',
  recurringNeed: 'need',
  donation: 'donat',
  cashflowEntry: 'cash',
  payoutAccount: 'pacct',
  payout: 'payout',
  timelineEvent: 'tlevt',
  auditLog: 'audit',
  upload: 'upl',
} as const;

export type EntityKind = keyof typeof ID_PREFIX;

/** Generate a prefixed ID for a given entity kind. */
export const createId = (kind: EntityKind): string => `${ID_PREFIX[kind]}_${nano()}`;

/** Generate a raw (unprefixed) token — useful for invite tokens, etc. */
export const createToken = (length = 32): string => customAlphabet(ALPHABET, length)();
