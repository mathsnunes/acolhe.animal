ALTER TABLE "organization" ALTER COLUMN "slug" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "portal_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
-- Backfill: orgs created before this change already claimed a slug and had their
-- portal live (gated only by status), so keep their portal enabled.
UPDATE "organization" SET "portal_enabled" = true WHERE "slug" IS NOT NULL;