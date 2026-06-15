import { relations } from 'drizzle-orm';

import { user } from './auth';
import { organization, organizationInvite, organizationMember } from './organization';
import { animal, animalInstagramArt, animalPhoto, animalVideo } from './animals';
import { adoption, application, person } from './people';
import { donor, supporter } from './donors';
import { campaign, campaignItem, recurringNeed } from './campaigns';
import { cashflowEntry, donation, payout, payoutAccount } from './finance';

/**
 * Drizzle relations power the relational query API (`db.query.animal.findMany({ with })`).
 * Focused on the read paths the app actually uses; extend as new queries appear.
 */

// Auth tables (session/account) are managed by better-auth and not queried via
// the relational API, so they're intentionally omitted here (a `many` without its
// inverse `one` can't be inferred — and breaks Drizzle Studio introspection).
export const userRelations = relations(user, ({ many }) => ({
  memberships: many(organizationMember),
}));

export const organizationRelations = relations(organization, ({ many }) => ({
  members: many(organizationMember),
  invites: many(organizationInvite),
  animals: many(animal),
  people: many(person),
  applications: many(application),
  adoptions: many(adoption),
  donors: many(donor),
  supporters: many(supporter),
  campaigns: many(campaign),
  recurringNeeds: many(recurringNeed),
  donations: many(donation),
  cashflowEntries: many(cashflowEntry),
  payoutAccounts: many(payoutAccount),
  payouts: many(payout),
}));

export const organizationMemberRelations = relations(organizationMember, ({ one }) => ({
  user: one(user, { fields: [organizationMember.userId], references: [user.id] }),
  organization: one(organization, {
    fields: [organizationMember.organizationId],
    references: [organization.pk],
  }),
}));

export const animalRelations = relations(animal, ({ one, many }) => ({
  organization: one(organization, {
    fields: [animal.organizationId],
    references: [organization.pk],
  }),
  photos: many(animalPhoto),
  videos: many(animalVideo),
  instagramArts: many(animalInstagramArt),
  applications: many(application),
  adoptions: many(adoption),
}));

export const animalPhotoRelations = relations(animalPhoto, ({ one }) => ({
  animal: one(animal, { fields: [animalPhoto.animalId], references: [animal.pk] }),
}));

export const animalVideoRelations = relations(animalVideo, ({ one }) => ({
  animal: one(animal, { fields: [animalVideo.animalId], references: [animal.pk] }),
}));

export const animalInstagramArtRelations = relations(animalInstagramArt, ({ one }) => ({
  animal: one(animal, { fields: [animalInstagramArt.animalId], references: [animal.pk] }),
}));

export const personRelations = relations(person, ({ one, many }) => ({
  organization: one(organization, {
    fields: [person.organizationId],
    references: [organization.pk],
  }),
  applications: many(application),
  adoptions: many(adoption),
}));

export const applicationRelations = relations(application, ({ one }) => ({
  organization: one(organization, {
    fields: [application.organizationId],
    references: [organization.pk],
  }),
  animal: one(animal, { fields: [application.animalId], references: [animal.pk] }),
  person: one(person, { fields: [application.personId], references: [person.pk] }),
  assignedTo: one(user, { fields: [application.assignedToUserId], references: [user.id] }),
}));

export const adoptionRelations = relations(adoption, ({ one }) => ({
  organization: one(organization, {
    fields: [adoption.organizationId],
    references: [organization.pk],
  }),
  animal: one(animal, { fields: [adoption.animalId], references: [animal.pk] }),
  person: one(person, { fields: [adoption.personId], references: [person.pk] }),
  application: one(application, {
    fields: [adoption.applicationId],
    references: [application.pk],
  }),
}));

export const donorRelations = relations(donor, ({ one, many }) => ({
  organization: one(organization, { fields: [donor.organizationId], references: [organization.pk] }),
  supporters: many(supporter),
  donations: many(donation),
}));

export const campaignRelations = relations(campaign, ({ one, many }) => ({
  organization: one(organization, {
    fields: [campaign.organizationId],
    references: [organization.pk],
  }),
  animal: one(animal, { fields: [campaign.animalId], references: [animal.pk] }),
  items: many(campaignItem),
  donations: many(donation),
}));

export const donationRelations = relations(donation, ({ one }) => ({
  organization: one(organization, {
    fields: [donation.organizationId],
    references: [organization.pk],
  }),
  donor: one(donor, { fields: [donation.donorId], references: [donor.pk] }),
  campaign: one(campaign, { fields: [donation.campaignId], references: [campaign.pk] }),
}));

// ── Inverse `one` sides for the `many` lists declared above ──
// Every `many` needs its matching `one`, otherwise Drizzle can't infer the
// relation and Studio introspection fails. These complete the Pillar 2 tables.

export const organizationInviteRelations = relations(organizationInvite, ({ one }) => ({
  organization: one(organization, {
    fields: [organizationInvite.organizationId],
    references: [organization.pk],
  }),
}));

export const supporterRelations = relations(supporter, ({ one }) => ({
  organization: one(organization, {
    fields: [supporter.organizationId],
    references: [organization.pk],
  }),
  donor: one(donor, { fields: [supporter.donorId], references: [donor.pk] }),
}));

export const campaignItemRelations = relations(campaignItem, ({ one }) => ({
  campaign: one(campaign, { fields: [campaignItem.campaignId], references: [campaign.pk] }),
}));

export const recurringNeedRelations = relations(recurringNeed, ({ one }) => ({
  organization: one(organization, {
    fields: [recurringNeed.organizationId],
    references: [organization.pk],
  }),
  animal: one(animal, { fields: [recurringNeed.animalId], references: [animal.pk] }),
}));

export const cashflowEntryRelations = relations(cashflowEntry, ({ one }) => ({
  organization: one(organization, {
    fields: [cashflowEntry.organizationId],
    references: [organization.pk],
  }),
}));

export const payoutAccountRelations = relations(payoutAccount, ({ one }) => ({
  organization: one(organization, {
    fields: [payoutAccount.organizationId],
    references: [organization.pk],
  }),
}));

export const payoutRelations = relations(payout, ({ one }) => ({
  organization: one(organization, {
    fields: [payout.organizationId],
    references: [organization.pk],
  }),
  payoutAccount: one(payoutAccount, {
    fields: [payout.payoutAccountId],
    references: [payoutAccount.pk],
  }),
}));
