import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';

import type * as schema from './schema';

/**
 * Row types inferred from the schema — the source of truth for DTOs across the
 * app (see `stack-arquitetura.md` › "Tipos vindos do banco são fonte de verdade").
 * `Select` = a row read back; `Insert` = the shape accepted by `.insert()`.
 */

export type Organization = InferSelectModel<typeof schema.organization>;
export type NewOrganization = InferInsertModel<typeof schema.organization>;

export type OrganizationMember = InferSelectModel<typeof schema.organizationMember>;
export type NewOrganizationMember = InferInsertModel<typeof schema.organizationMember>;

export type OrganizationInvite = InferSelectModel<typeof schema.organizationInvite>;
export type NewOrganizationInvite = InferInsertModel<typeof schema.organizationInvite>;

export type User = InferSelectModel<typeof schema.user>;

export type Animal = InferSelectModel<typeof schema.animal>;
export type NewAnimal = InferInsertModel<typeof schema.animal>;

export type AnimalPhoto = InferSelectModel<typeof schema.animalPhoto>;
export type NewAnimalPhoto = InferInsertModel<typeof schema.animalPhoto>;

export type AnimalVideo = InferSelectModel<typeof schema.animalVideo>;
export type NewAnimalVideo = InferInsertModel<typeof schema.animalVideo>;
export type AnimalInstagramArt = InferSelectModel<typeof schema.animalInstagramArt>;

export type Upload = InferSelectModel<typeof schema.upload>;
export type NewUpload = InferInsertModel<typeof schema.upload>;

export type Person = InferSelectModel<typeof schema.person>;
export type NewPerson = InferInsertModel<typeof schema.person>;

export type Application = InferSelectModel<typeof schema.application>;
export type NewApplication = InferInsertModel<typeof schema.application>;

export type Adoption = InferSelectModel<typeof schema.adoption>;
export type NewAdoption = InferInsertModel<typeof schema.adoption>;

export type Donor = InferSelectModel<typeof schema.donor>;
export type Supporter = InferSelectModel<typeof schema.supporter>;
export type Campaign = InferSelectModel<typeof schema.campaign>;
export type CampaignItem = InferSelectModel<typeof schema.campaignItem>;
export type RecurringNeed = InferSelectModel<typeof schema.recurringNeed>;
export type Donation = InferSelectModel<typeof schema.donation>;
export type CashflowEntry = InferSelectModel<typeof schema.cashflowEntry>;
export type PayoutAccount = InferSelectModel<typeof schema.payoutAccount>;
export type Payout = InferSelectModel<typeof schema.payout>;

export type City = InferSelectModel<typeof schema.city>;
export type TimelineEvent = InferSelectModel<typeof schema.timelineEvent>;
export type NewTimelineEvent = InferInsertModel<typeof schema.timelineEvent>;
export type AuditLog = InferSelectModel<typeof schema.auditLog>;
export type NewAuditLog = InferInsertModel<typeof schema.auditLog>;
export type WebhookEvent = InferSelectModel<typeof schema.webhookEvent>;
