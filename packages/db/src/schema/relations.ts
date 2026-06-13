import { relations } from 'drizzle-orm';

import { account, session, user } from './auth';
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

export const userRelations = relations(user, ({ many }) => ({
  memberships: many(organizationMember),
  sessions: many(session),
  accounts: many(account),
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
    references: [organization.id],
  }),
}));

export const animalRelations = relations(animal, ({ one, many }) => ({
  organization: one(organization, {
    fields: [animal.organizationId],
    references: [organization.id],
  }),
  photos: many(animalPhoto),
  videos: many(animalVideo),
  instagramArts: many(animalInstagramArt),
  applications: many(application),
  adoptions: many(adoption),
}));

export const animalPhotoRelations = relations(animalPhoto, ({ one }) => ({
  animal: one(animal, { fields: [animalPhoto.animalId], references: [animal.id] }),
}));

export const animalVideoRelations = relations(animalVideo, ({ one }) => ({
  animal: one(animal, { fields: [animalVideo.animalId], references: [animal.id] }),
}));

export const animalInstagramArtRelations = relations(animalInstagramArt, ({ one }) => ({
  animal: one(animal, { fields: [animalInstagramArt.animalId], references: [animal.id] }),
}));

export const personRelations = relations(person, ({ one, many }) => ({
  organization: one(organization, {
    fields: [person.organizationId],
    references: [organization.id],
  }),
  applications: many(application),
  adoptions: many(adoption),
}));

export const applicationRelations = relations(application, ({ one }) => ({
  organization: one(organization, {
    fields: [application.organizationId],
    references: [organization.id],
  }),
  animal: one(animal, { fields: [application.animalId], references: [animal.id] }),
  person: one(person, { fields: [application.personId], references: [person.id] }),
  assignedTo: one(user, { fields: [application.assignedToUserId], references: [user.id] }),
}));

export const adoptionRelations = relations(adoption, ({ one }) => ({
  organization: one(organization, {
    fields: [adoption.organizationId],
    references: [organization.id],
  }),
  animal: one(animal, { fields: [adoption.animalId], references: [animal.id] }),
  person: one(person, { fields: [adoption.personId], references: [person.id] }),
  application: one(application, {
    fields: [adoption.applicationId],
    references: [application.id],
  }),
}));

export const donorRelations = relations(donor, ({ one, many }) => ({
  organization: one(organization, { fields: [donor.organizationId], references: [organization.id] }),
  supporters: many(supporter),
  donations: many(donation),
}));

export const campaignRelations = relations(campaign, ({ one, many }) => ({
  organization: one(organization, {
    fields: [campaign.organizationId],
    references: [organization.id],
  }),
  animal: one(animal, { fields: [campaign.animalId], references: [animal.id] }),
  items: many(campaignItem),
  donations: many(donation),
}));

export const donationRelations = relations(donation, ({ one }) => ({
  organization: one(organization, {
    fields: [donation.organizationId],
    references: [organization.id],
  }),
  donor: one(donor, { fields: [donation.donorId], references: [donor.id] }),
  campaign: one(campaign, { fields: [donation.campaignId], references: [campaign.id] }),
}));
