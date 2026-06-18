CREATE TYPE "public"."org_company_type" AS ENUM('MEI', 'LIMITED', 'INDIVIDUAL', 'ASSOCIATION');--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "responsible_birth_date" text;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "company_type" "org_company_type";