CREATE TYPE "public"."adoption_source" AS ENUM('digital', 'offline');--> statement-breakpoint
CREATE TYPE "public"."animal_sex" AS ENUM('male', 'female');--> statement-breakpoint
CREATE TYPE "public"."animal_size" AS ENUM('small', 'medium', 'large');--> statement-breakpoint
CREATE TYPE "public"."animal_species" AS ENUM('dog', 'cat');--> statement-breakpoint
CREATE TYPE "public"."animal_status" AS ENUM('available', 'under-review', 'reserved', 'adopted', 'unavailable');--> statement-breakpoint
CREATE TYPE "public"."application_status" AS ENUM('draft', 'new', 'in-progress', 'approved', 'rejected', 'withdrew');--> statement-breakpoint
CREATE TYPE "public"."asaas_kyc_status" AS ENUM('pending', 'awaiting_documents', 'under_review', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."asaas_onboarding_status" AS ENUM('not_started', 'creating', 'awaiting_revenue', 'documents_pending', 'under_review', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."audit_actor_type" AS ENUM('user', 'system', 'webhook', 'admin_platform');--> statement-breakpoint
CREATE TYPE "public"."bank_account_type" AS ENUM('checking', 'savings');--> statement-breakpoint
CREATE TYPE "public"."br_region" AS ENUM('north', 'northeast', 'central-west', 'southeast', 'south');--> statement-breakpoint
CREATE TYPE "public"."campaign_goal_behavior" AS ENUM('auto_close', 'keep_open');--> statement-breakpoint
CREATE TYPE "public"."campaign_status" AS ENUM('draft', 'active', 'closed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."cashflow_category" AS ENUM('monthly_support', 'campaign', 'recurring_need', 'one_time_donation', 'refund', 'payout', 'payout_fee', 'payout_returned', 'veterinary', 'food', 'maintenance', 'bazaar', 'other');--> statement-breakpoint
CREATE TYPE "public"."cashflow_payment_method" AS ENUM('pix', 'cash', 'transfer', 'card', 'other');--> statement-breakpoint
CREATE TYPE "public"."cashflow_type" AS ENUM('inflow', 'outflow');--> statement-breakpoint
CREATE TYPE "public"."donation_source" AS ENUM('portal_pix', 'direct_pix', 'manual', 'recurring');--> statement-breakpoint
CREATE TYPE "public"."donation_status" AS ENUM('pending', 'confirmed', 'refunded', 'failed');--> statement-breakpoint
CREATE TYPE "public"."energy_level" AS ENUM('calm', 'balanced', 'energetic');--> statement-breakpoint
CREATE TYPE "public"."instagram_art_type" AS ENUM('feed-square', 'story-vertical');--> statement-breakpoint
CREATE TYPE "public"."invite_status" AS ENUM('pending', 'accepted', 'revoked', 'expired');--> statement-breakpoint
CREATE TYPE "public"."member_role" AS ENUM('admin', 'volunteer');--> statement-breakpoint
CREATE TYPE "public"."neutered_status" AS ENUM('yes', 'no', 'scheduled');--> statement-breakpoint
CREATE TYPE "public"."org_document_type" AS ENUM('cpf', 'cnpj');--> statement-breakpoint
CREATE TYPE "public"."organization_status" AS ENUM('onboarding', 'active', 'suspended', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('pix', 'credit_card', 'manual');--> statement-breakpoint
CREATE TYPE "public"."payout_account_type" AS ENUM('pix', 'bank_transfer');--> statement-breakpoint
CREATE TYPE "public"."payout_status" AS ENUM('pending', 'processing', 'completed', 'failed', 'cancelled', 'returned');--> statement-breakpoint
CREATE TYPE "public"."pix_key_type" AS ENUM('cpf', 'cnpj', 'email', 'phone', 'random');--> statement-breakpoint
CREATE TYPE "public"."recurring_need_status" AS ENUM('active', 'paused', 'archived');--> statement-breakpoint
CREATE TYPE "public"."sociability" AS ENUM('yes', 'no', 'with-care', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."supporter_status" AS ENUM('active', 'paused', 'cancelled', 'failed');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."video_processing_status" AS ENUM('pending', 'processing', 'ready', 'failed');--> statement-breakpoint
CREATE TYPE "public"."webhook_provider" AS ENUM('asaas');--> statement-breakpoint
CREATE TYPE "public"."webhook_status" AS ENUM('received', 'processing', 'processed', 'failed', 'ignored');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"phone_number" text NOT NULL,
	"phone_number_verified" boolean DEFAULT false NOT NULL,
	"banned" boolean DEFAULT false,
	"ban_reason" text,
	"ban_expires" timestamp with time zone,
	"status" "user_status" DEFAULT 'active' NOT NULL,
	"last_seen_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email"),
	CONSTRAINT "user_phoneNumber_unique" UNIQUE("phone_number")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "city" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"normalized_name" text NOT NULL,
	"state_code" char(2) NOT NULL,
	"state_name" text NOT NULL,
	"region" "br_region" NOT NULL,
	"microregion" text,
	"mesoregion" text,
	"metro_area" text,
	"latitude" numeric(10, 7) NOT NULL,
	"longitude" numeric(10, 7) NOT NULL,
	"is_capital" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization" (
	"pk" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "organization_pk_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"id" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"document" text NOT NULL,
	"document_type" "org_document_type" NOT NULL,
	"status" "organization_status" DEFAULT 'onboarding' NOT NULL,
	"email" text,
	"phone" text NOT NULL,
	"city_id" text,
	"street_address" text,
	"address_number" text,
	"address_complement" text,
	"postal_code" text,
	"founded_at" timestamp,
	"logo_url" text,
	"cover_url" text,
	"about_text" text,
	"portal_config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"asaas_account_id" text,
	"asaas_api_key_encrypted" text,
	"asaas_wallet_id" text,
	"asaas_kyc_status" "asaas_kyc_status" DEFAULT 'pending' NOT NULL,
	"asaas_onboarding_status" "asaas_onboarding_status" DEFAULT 'not_started' NOT NULL,
	"asaas_pix_key_cached" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organization_id_unique" UNIQUE("id"),
	CONSTRAINT "organization_slug_unique" UNIQUE("slug"),
	CONSTRAINT "organization_document_unique" UNIQUE("document")
);
--> statement-breakpoint
CREATE TABLE "organization_invite" (
	"pk" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "organization_invite_pk_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"id" text NOT NULL,
	"organization_id" bigint NOT NULL,
	"invited_by_user_id" text NOT NULL,
	"phone_number" text NOT NULL,
	"name" text,
	"email" text,
	"role" "member_role" NOT NULL,
	"token" text NOT NULL,
	"status" "invite_status" DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp with time zone DEFAULT now() + interval '7 days' NOT NULL,
	"accepted_at" timestamp with time zone,
	"accepted_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organization_invite_id_unique" UNIQUE("id"),
	CONSTRAINT "organization_invite_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "organization_member" (
	"pk" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "organization_member_pk_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"id" text NOT NULL,
	"user_id" text NOT NULL,
	"organization_id" bigint NOT NULL,
	"role" "member_role" NOT NULL,
	"invited_by_user_id" text,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"removed_at" timestamp with time zone,
	"removed_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organization_member_id_unique" UNIQUE("id")
);
--> statement-breakpoint
CREATE TABLE "animal" (
	"pk" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "animal_pk_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"id" text NOT NULL,
	"organization_id" bigint NOT NULL,
	"name" text NOT NULL,
	"species" "animal_species" NOT NULL,
	"sex" "animal_sex" NOT NULL,
	"estimated_birth_date" timestamp,
	"age_months_at_intake" integer,
	"age_reference_date" timestamp,
	"size" "animal_size",
	"predominant_color" text,
	"weight_kg" numeric(4, 2),
	"status" "animal_status" DEFAULT 'available' NOT NULL,
	"clinical_condition" jsonb,
	"neutered" "neutered_status" NOT NULL,
	"vaccinations" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"special_conditions" text[] DEFAULT '{}'::text[] NOT NULL,
	"energy_level" "energy_level",
	"good_with_children" "sociability",
	"good_with_dogs" "sociability",
	"good_with_cats" "sociability",
	"good_with_strangers" "sociability",
	"quirks" text,
	"intake_date" timestamp NOT NULL,
	"rescue_date" timestamp,
	"rescue_location" text,
	"short_story" text,
	"visible_on_portal" boolean DEFAULT true NOT NULL,
	"listed_for_adoption" boolean DEFAULT true NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "animal_id_unique" UNIQUE("id"),
	CONSTRAINT "animal_age_present" CHECK ("animal"."estimated_birth_date" is not null or ("animal"."age_months_at_intake" is not null and "animal"."age_reference_date" is not null))
);
--> statement-breakpoint
CREATE TABLE "animal_instagram_art" (
	"pk" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "animal_instagram_art_pk_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"id" text NOT NULL,
	"animal_id" bigint NOT NULL,
	"type" "instagram_art_type" NOT NULL,
	"image_url" text NOT NULL,
	"caption" text,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "animal_instagram_art_id_unique" UNIQUE("id")
);
--> statement-breakpoint
CREATE TABLE "animal_photo" (
	"pk" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "animal_photo_pk_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"id" text NOT NULL,
	"animal_id" bigint NOT NULL,
	"original_url" text NOT NULL,
	"thumb_url" text NOT NULL,
	"medium_url" text NOT NULL,
	"alt_text" text,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "animal_photo_id_unique" UNIQUE("id")
);
--> statement-breakpoint
CREATE TABLE "animal_video" (
	"pk" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "animal_video_pk_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"id" text NOT NULL,
	"animal_id" bigint NOT NULL,
	"original_url" text NOT NULL,
	"processed_url" text,
	"poster_url" text,
	"duration_seconds" integer,
	"format" text,
	"processing_status" "video_processing_status" DEFAULT 'pending' NOT NULL,
	"caption" text,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "animal_video_id_unique" UNIQUE("id")
);
--> statement-breakpoint
CREATE TABLE "adoption" (
	"pk" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "adoption_pk_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"id" text NOT NULL,
	"organization_id" bigint NOT NULL,
	"person_id" bigint NOT NULL,
	"application_id" bigint,
	"animal_id" bigint NOT NULL,
	"source" "adoption_source" NOT NULL,
	"adopter_name" text NOT NULL,
	"adopter_document" text NOT NULL,
	"adopter_phone" text NOT NULL,
	"adopter_address" jsonb NOT NULL,
	"extra_clauses" text,
	"term_pdf_url" text NOT NULL,
	"term_pdf_hash" text NOT NULL,
	"signature_metadata" jsonb NOT NULL,
	"adopted_at" timestamp with time zone NOT NULL,
	"cancelled_at" timestamp with time zone,
	"cancellation_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "adoption_id_unique" UNIQUE("id")
);
--> statement-breakpoint
CREATE TABLE "application" (
	"pk" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "application_pk_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"id" text NOT NULL,
	"organization_id" bigint NOT NULL,
	"animal_id" bigint NOT NULL,
	"person_id" bigint NOT NULL,
	"application_data" jsonb,
	"form_version" text NOT NULL,
	"status" "application_status" DEFAULT 'draft' NOT NULL,
	"assigned_to_user_id" text,
	"internal_notes" text,
	"status_changed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"submitted_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "application_id_unique" UNIQUE("id")
);
--> statement-breakpoint
CREATE TABLE "person" (
	"pk" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "person_pk_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"id" text NOT NULL,
	"organization_id" bigint NOT NULL,
	"global_person_id" text,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"phone_verified" boolean DEFAULT false NOT NULL,
	"email" text,
	"cpf" text,
	"city_id" text,
	"street_address" text,
	"address_number" text,
	"address_complement" text,
	"postal_code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "person_id_unique" UNIQUE("id")
);
--> statement-breakpoint
CREATE TABLE "donor" (
	"pk" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "donor_pk_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"id" text NOT NULL,
	"organization_id" bigint NOT NULL,
	"global_donor_id" text,
	"name" text NOT NULL,
	"phone" text,
	"email" text,
	"cpf" text,
	"city_id" text,
	"is_anonymous" boolean DEFAULT false NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "donor_id_unique" UNIQUE("id")
);
--> statement-breakpoint
CREATE TABLE "supporter" (
	"pk" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "supporter_pk_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"id" text NOT NULL,
	"organization_id" bigint NOT NULL,
	"donor_id" bigint NOT NULL,
	"monthly_amount" numeric(10, 2) NOT NULL,
	"status" "supporter_status" DEFAULT 'active' NOT NULL,
	"asaas_subscription_id" text NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"cancelled_at" timestamp with time zone,
	"cancellation_reason" text,
	"next_billing_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "supporter_id_unique" UNIQUE("id"),
	CONSTRAINT "supporter_asaasSubscriptionId_unique" UNIQUE("asaas_subscription_id")
);
--> statement-breakpoint
CREATE TABLE "campaign" (
	"pk" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "campaign_pk_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"id" text NOT NULL,
	"organization_id" bigint NOT NULL,
	"animal_id" bigint,
	"title" text NOT NULL,
	"pitch" text,
	"story" text,
	"cover_url" text,
	"goal_amount" numeric(10, 2) NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"status" "campaign_status" DEFAULT 'draft' NOT NULL,
	"behavior_on_goal_reached" "campaign_goal_behavior" DEFAULT 'keep_open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "campaign_id_unique" UNIQUE("id")
);
--> statement-breakpoint
CREATE TABLE "campaign_item" (
	"pk" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "campaign_item_pk_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"id" text NOT NULL,
	"campaign_id" bigint NOT NULL,
	"name" text NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "campaign_item_id_unique" UNIQUE("id")
);
--> statement-breakpoint
CREATE TABLE "recurring_need" (
	"pk" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "recurring_need_pk_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"id" text NOT NULL,
	"organization_id" bigint NOT NULL,
	"animal_id" bigint,
	"title" text NOT NULL,
	"description" text,
	"cover_url" text,
	"suggested_monthly_amount" numeric(10, 2),
	"status" "recurring_need_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "recurring_need_id_unique" UNIQUE("id")
);
--> statement-breakpoint
CREATE TABLE "cashflow_entry" (
	"pk" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "cashflow_entry_pk_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"id" text NOT NULL,
	"organization_id" bigint NOT NULL,
	"type" "cashflow_type" NOT NULL,
	"category" "cashflow_category" NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"entry_date" timestamp NOT NULL,
	"description" text NOT NULL,
	"donation_id" bigint,
	"payment_method" "cashflow_payment_method",
	"created_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cashflow_entry_id_unique" UNIQUE("id")
);
--> statement-breakpoint
CREATE TABLE "donation" (
	"pk" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "donation_pk_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"id" text NOT NULL,
	"organization_id" bigint NOT NULL,
	"donor_id" bigint NOT NULL,
	"campaign_id" bigint,
	"campaign_item_id" bigint,
	"recurring_need_id" bigint,
	"supporter_id" bigint,
	"webhook_event_id" text,
	"amount" numeric(10, 2) NOT NULL,
	"payment_method" "payment_method" NOT NULL,
	"source" "donation_source" NOT NULL,
	"status" "donation_status" DEFAULT 'pending' NOT NULL,
	"asaas_payment_id" text,
	"confirmed_at" timestamp with time zone,
	"message" text,
	"show_name" boolean DEFAULT false NOT NULL,
	"show_amount" boolean DEFAULT true NOT NULL,
	"show_message" boolean DEFAULT true NOT NULL,
	"refunded_at" timestamp with time zone,
	"refund_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "donation_id_unique" UNIQUE("id")
);
--> statement-breakpoint
CREATE TABLE "payout" (
	"pk" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "payout_pk_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"id" text NOT NULL,
	"organization_id" bigint NOT NULL,
	"payout_account_id" bigint NOT NULL,
	"destination_snapshot" jsonb NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"fee_amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"net_amount" numeric(10, 2) NOT NULL,
	"status" "payout_status" DEFAULT 'pending' NOT NULL,
	"asaas_transfer_id" text,
	"requested_by_user_id" text,
	"scheduled_for" timestamp with time zone,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processing_started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"failed_at" timestamp with time zone,
	"failure_reason" text,
	"cashflow_entry_id" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payout_id_unique" UNIQUE("id")
);
--> statement-breakpoint
CREATE TABLE "payout_account" (
	"pk" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "payout_account_pk_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"id" text NOT NULL,
	"organization_id" bigint NOT NULL,
	"type" "payout_account_type" NOT NULL,
	"nickname" text,
	"holder_name" text NOT NULL,
	"holder_document" text NOT NULL,
	"pix_key_type" "pix_key_type",
	"pix_key_encrypted" text,
	"bank_code" text,
	"bank_agency" text,
	"bank_account_encrypted" text,
	"bank_account_type" "bank_account_type",
	"is_default" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_validated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payout_account_id_unique" UNIQUE("id")
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"pk" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "audit_log_pk_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"id" text NOT NULL,
	"organization_id" bigint,
	"actor_type" "audit_actor_type" NOT NULL,
	"actor_user_id" text,
	"actor_context" jsonb,
	"action" text NOT NULL,
	"entity_type" text,
	"entity_id" text,
	"previous_value" jsonb,
	"new_value" jsonb,
	"reason" text,
	"request_metadata" jsonb,
	"retention_until" timestamp with time zone DEFAULT now() + interval '2 years' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "audit_log_id_unique" UNIQUE("id")
);
--> statement-breakpoint
CREATE TABLE "timeline_event" (
	"pk" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "timeline_event_pk_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"id" text NOT NULL,
	"organization_id" bigint NOT NULL,
	"event_type" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"actor_user_id" text,
	"actor_context" jsonb,
	"payload" jsonb,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "timeline_event_id_unique" UNIQUE("id")
);
--> statement-breakpoint
CREATE TABLE "webhook_event" (
	"id" text PRIMARY KEY NOT NULL,
	"provider" "webhook_provider" NOT NULL,
	"event_type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	"status" "webhook_status" DEFAULT 'received' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization" ADD CONSTRAINT "organization_city_id_city_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."city"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_invite" ADD CONSTRAINT "organization_invite_organization_id_organization_pk_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("pk") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_invite" ADD CONSTRAINT "organization_invite_invited_by_user_id_user_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_invite" ADD CONSTRAINT "organization_invite_accepted_by_user_id_user_id_fk" FOREIGN KEY ("accepted_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_member" ADD CONSTRAINT "organization_member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_member" ADD CONSTRAINT "organization_member_organization_id_organization_pk_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("pk") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_member" ADD CONSTRAINT "organization_member_invited_by_user_id_user_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_member" ADD CONSTRAINT "organization_member_removed_by_user_id_user_id_fk" FOREIGN KEY ("removed_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "animal" ADD CONSTRAINT "animal_organization_id_organization_pk_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("pk") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "animal_instagram_art" ADD CONSTRAINT "animal_instagram_art_animal_id_animal_pk_fk" FOREIGN KEY ("animal_id") REFERENCES "public"."animal"("pk") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "animal_photo" ADD CONSTRAINT "animal_photo_animal_id_animal_pk_fk" FOREIGN KEY ("animal_id") REFERENCES "public"."animal"("pk") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "animal_video" ADD CONSTRAINT "animal_video_animal_id_animal_pk_fk" FOREIGN KEY ("animal_id") REFERENCES "public"."animal"("pk") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adoption" ADD CONSTRAINT "adoption_organization_id_organization_pk_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("pk") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adoption" ADD CONSTRAINT "adoption_person_id_person_pk_fk" FOREIGN KEY ("person_id") REFERENCES "public"."person"("pk") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adoption" ADD CONSTRAINT "adoption_application_id_application_pk_fk" FOREIGN KEY ("application_id") REFERENCES "public"."application"("pk") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adoption" ADD CONSTRAINT "adoption_animal_id_animal_pk_fk" FOREIGN KEY ("animal_id") REFERENCES "public"."animal"("pk") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application" ADD CONSTRAINT "application_organization_id_organization_pk_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("pk") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application" ADD CONSTRAINT "application_animal_id_animal_pk_fk" FOREIGN KEY ("animal_id") REFERENCES "public"."animal"("pk") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application" ADD CONSTRAINT "application_person_id_person_pk_fk" FOREIGN KEY ("person_id") REFERENCES "public"."person"("pk") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application" ADD CONSTRAINT "application_assigned_to_user_id_user_id_fk" FOREIGN KEY ("assigned_to_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "person" ADD CONSTRAINT "person_organization_id_organization_pk_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("pk") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "person" ADD CONSTRAINT "person_city_id_city_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."city"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "donor" ADD CONSTRAINT "donor_organization_id_organization_pk_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("pk") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "donor" ADD CONSTRAINT "donor_city_id_city_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."city"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supporter" ADD CONSTRAINT "supporter_organization_id_organization_pk_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("pk") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supporter" ADD CONSTRAINT "supporter_donor_id_donor_pk_fk" FOREIGN KEY ("donor_id") REFERENCES "public"."donor"("pk") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign" ADD CONSTRAINT "campaign_organization_id_organization_pk_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("pk") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign" ADD CONSTRAINT "campaign_animal_id_animal_pk_fk" FOREIGN KEY ("animal_id") REFERENCES "public"."animal"("pk") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_item" ADD CONSTRAINT "campaign_item_campaign_id_campaign_pk_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaign"("pk") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_need" ADD CONSTRAINT "recurring_need_organization_id_organization_pk_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("pk") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_need" ADD CONSTRAINT "recurring_need_animal_id_animal_pk_fk" FOREIGN KEY ("animal_id") REFERENCES "public"."animal"("pk") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cashflow_entry" ADD CONSTRAINT "cashflow_entry_organization_id_organization_pk_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("pk") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cashflow_entry" ADD CONSTRAINT "cashflow_entry_donation_id_donation_pk_fk" FOREIGN KEY ("donation_id") REFERENCES "public"."donation"("pk") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cashflow_entry" ADD CONSTRAINT "cashflow_entry_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "donation" ADD CONSTRAINT "donation_organization_id_organization_pk_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("pk") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "donation" ADD CONSTRAINT "donation_donor_id_donor_pk_fk" FOREIGN KEY ("donor_id") REFERENCES "public"."donor"("pk") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "donation" ADD CONSTRAINT "donation_campaign_id_campaign_pk_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaign"("pk") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "donation" ADD CONSTRAINT "donation_campaign_item_id_campaign_item_pk_fk" FOREIGN KEY ("campaign_item_id") REFERENCES "public"."campaign_item"("pk") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "donation" ADD CONSTRAINT "donation_recurring_need_id_recurring_need_pk_fk" FOREIGN KEY ("recurring_need_id") REFERENCES "public"."recurring_need"("pk") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "donation" ADD CONSTRAINT "donation_supporter_id_supporter_pk_fk" FOREIGN KEY ("supporter_id") REFERENCES "public"."supporter"("pk") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "donation" ADD CONSTRAINT "donation_webhook_event_id_webhook_event_id_fk" FOREIGN KEY ("webhook_event_id") REFERENCES "public"."webhook_event"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payout" ADD CONSTRAINT "payout_organization_id_organization_pk_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("pk") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payout" ADD CONSTRAINT "payout_payout_account_id_payout_account_pk_fk" FOREIGN KEY ("payout_account_id") REFERENCES "public"."payout_account"("pk") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payout" ADD CONSTRAINT "payout_requested_by_user_id_user_id_fk" FOREIGN KEY ("requested_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payout" ADD CONSTRAINT "payout_cashflow_entry_id_cashflow_entry_pk_fk" FOREIGN KEY ("cashflow_entry_id") REFERENCES "public"."cashflow_entry"("pk") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payout_account" ADD CONSTRAINT "payout_account_organization_id_organization_pk_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("pk") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_organization_id_organization_pk_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("pk") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timeline_event" ADD CONSTRAINT "timeline_event_organization_id_organization_pk_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("pk") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timeline_event" ADD CONSTRAINT "timeline_event_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "city_normalized_name_idx" ON "city" USING btree ("normalized_name");--> statement-breakpoint
CREATE INDEX "city_state_normalized_idx" ON "city" USING btree ("state_code","normalized_name");--> statement-breakpoint
CREATE INDEX "city_state_idx" ON "city" USING btree ("state_code");--> statement-breakpoint
CREATE INDEX "organization_status_idx" ON "organization" USING btree ("status");--> statement-breakpoint
CREATE INDEX "organization_active_city_idx" ON "organization" USING btree ("city_id") WHERE "organization"."status" = 'active';--> statement-breakpoint
CREATE UNIQUE INDEX "organization_invite_pending_unique" ON "organization_invite" USING btree ("organization_id","phone_number") WHERE "organization_invite"."status" = 'pending';--> statement-breakpoint
CREATE INDEX "organization_invite_phone_status_idx" ON "organization_invite" USING btree ("phone_number","status");--> statement-breakpoint
CREATE INDEX "organization_invite_org_status_idx" ON "organization_invite" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "organization_invite_expiry_idx" ON "organization_invite" USING btree ("expires_at") WHERE "organization_invite"."status" = 'pending';--> statement-breakpoint
CREATE UNIQUE INDEX "organization_member_active_unique" ON "organization_member" USING btree ("user_id","organization_id") WHERE "organization_member"."removed_at" is null;--> statement-breakpoint
CREATE INDEX "organization_member_user_active_idx" ON "organization_member" USING btree ("user_id") WHERE "organization_member"."removed_at" is null;--> statement-breakpoint
CREATE INDEX "organization_member_org_active_idx" ON "organization_member" USING btree ("organization_id") WHERE "organization_member"."removed_at" is null;--> statement-breakpoint
CREATE INDEX "organization_member_org_role_idx" ON "organization_member" USING btree ("organization_id","role") WHERE "organization_member"."removed_at" is null;--> statement-breakpoint
CREATE INDEX "organization_member_invited_by_idx" ON "organization_member" USING btree ("invited_by_user_id") WHERE "organization_member"."invited_by_user_id" is not null;--> statement-breakpoint
CREATE INDEX "animal_org_status_active_idx" ON "animal" USING btree ("organization_id","status") WHERE "animal"."archived_at" is null;--> statement-breakpoint
CREATE INDEX "animal_org_archived_idx" ON "animal" USING btree ("organization_id","archived_at");--> statement-breakpoint
CREATE INDEX "animal_org_listed_idx" ON "animal" USING btree ("organization_id","listed_for_adoption") WHERE "animal"."archived_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "animal_instagram_art_unique" ON "animal_instagram_art" USING btree ("animal_id","type");--> statement-breakpoint
CREATE INDEX "animal_instagram_art_animal_idx" ON "animal_instagram_art" USING btree ("animal_id");--> statement-breakpoint
CREATE INDEX "animal_photo_order_idx" ON "animal_photo" USING btree ("animal_id","display_order");--> statement-breakpoint
CREATE INDEX "animal_video_order_idx" ON "animal_video" USING btree ("animal_id","display_order");--> statement-breakpoint
CREATE INDEX "animal_video_queue_idx" ON "animal_video" USING btree ("processing_status") WHERE "animal_video"."processing_status" in ('pending', 'processing');--> statement-breakpoint
CREATE UNIQUE INDEX "adoption_application_unique" ON "adoption" USING btree ("application_id") WHERE "adoption"."application_id" is not null;--> statement-breakpoint
CREATE INDEX "adoption_org_date_idx" ON "adoption" USING btree ("organization_id","adopted_at");--> statement-breakpoint
CREATE INDEX "adoption_person_date_idx" ON "adoption" USING btree ("person_id","adopted_at");--> statement-breakpoint
CREATE INDEX "adoption_animal_date_idx" ON "adoption" USING btree ("animal_id","adopted_at");--> statement-breakpoint
CREATE INDEX "adoption_org_source_idx" ON "adoption" USING btree ("organization_id","source");--> statement-breakpoint
CREATE INDEX "adoption_active_idx" ON "adoption" USING btree ("adopted_at") WHERE "adoption"."cancelled_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "application_active_per_animal" ON "application" USING btree ("organization_id","person_id","animal_id") WHERE "application"."status" not in ('rejected', 'withdrew');--> statement-breakpoint
CREATE INDEX "application_org_status_idx" ON "application" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "application_animal_status_idx" ON "application" USING btree ("animal_id","status");--> statement-breakpoint
CREATE INDEX "application_person_idx" ON "application" USING btree ("person_id");--> statement-breakpoint
CREATE INDEX "application_assigned_idx" ON "application" USING btree ("assigned_to_user_id") WHERE "application"."assigned_to_user_id" is not null;--> statement-breakpoint
CREATE INDEX "application_stale_idx" ON "application" USING btree ("status_changed_at") WHERE "application"."status" in ('new', 'in-progress');--> statement-breakpoint
CREATE INDEX "application_draft_expiry_idx" ON "application" USING btree ("expires_at") WHERE "application"."status" = 'draft';--> statement-breakpoint
CREATE UNIQUE INDEX "person_org_phone_unique" ON "person" USING btree ("organization_id","phone");--> statement-breakpoint
CREATE UNIQUE INDEX "person_org_cpf_unique" ON "person" USING btree ("organization_id","cpf") WHERE "person"."cpf" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "person_org_email_unique" ON "person" USING btree ("organization_id","email") WHERE "person"."email" is not null;--> statement-breakpoint
CREATE INDEX "person_global_idx" ON "person" USING btree ("global_person_id") WHERE "person"."global_person_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "donor_org_phone_unique" ON "donor" USING btree ("organization_id","phone") WHERE "donor"."phone" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "donor_org_cpf_unique" ON "donor" USING btree ("organization_id","cpf") WHERE "donor"."cpf" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "donor_org_email_unique" ON "donor" USING btree ("organization_id","email") WHERE "donor"."email" is not null;--> statement-breakpoint
CREATE INDEX "donor_org_created_idx" ON "donor" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "supporter_org_status_idx" ON "supporter" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "supporter_donor_idx" ON "supporter" USING btree ("donor_id");--> statement-breakpoint
CREATE INDEX "supporter_next_billing_idx" ON "supporter" USING btree ("next_billing_at") WHERE "supporter"."status" = 'active';--> statement-breakpoint
CREATE INDEX "campaign_org_status_idx" ON "campaign" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "campaign_org_ends_idx" ON "campaign" USING btree ("organization_id","ends_at");--> statement-breakpoint
CREATE INDEX "campaign_animal_idx" ON "campaign" USING btree ("animal_id") WHERE "campaign"."animal_id" is not null;--> statement-breakpoint
CREATE INDEX "campaign_active_ends_idx" ON "campaign" USING btree ("ends_at") WHERE "campaign"."status" = 'active';--> statement-breakpoint
CREATE INDEX "campaign_item_order_idx" ON "campaign_item" USING btree ("campaign_id","display_order");--> statement-breakpoint
CREATE INDEX "recurring_need_org_status_idx" ON "recurring_need" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "recurring_need_animal_idx" ON "recurring_need" USING btree ("animal_id") WHERE "recurring_need"."animal_id" is not null;--> statement-breakpoint
CREATE INDEX "cashflow_org_date_idx" ON "cashflow_entry" USING btree ("organization_id","entry_date");--> statement-breakpoint
CREATE INDEX "cashflow_org_type_date_idx" ON "cashflow_entry" USING btree ("organization_id","type","entry_date");--> statement-breakpoint
CREATE INDEX "cashflow_donation_idx" ON "cashflow_entry" USING btree ("donation_id") WHERE "cashflow_entry"."donation_id" is not null;--> statement-breakpoint
CREATE INDEX "cashflow_org_category_date_idx" ON "cashflow_entry" USING btree ("organization_id","category","entry_date");--> statement-breakpoint
CREATE UNIQUE INDEX "donation_asaas_payment_unique" ON "donation" USING btree ("asaas_payment_id") WHERE "donation"."asaas_payment_id" is not null;--> statement-breakpoint
CREATE INDEX "donation_org_confirmed_idx" ON "donation" USING btree ("organization_id","confirmed_at") WHERE "donation"."status" = 'confirmed';--> statement-breakpoint
CREATE INDEX "donation_donor_idx" ON "donation" USING btree ("donor_id","confirmed_at");--> statement-breakpoint
CREATE INDEX "donation_campaign_idx" ON "donation" USING btree ("campaign_id","status") WHERE "donation"."campaign_id" is not null;--> statement-breakpoint
CREATE INDEX "donation_recurring_need_idx" ON "donation" USING btree ("recurring_need_id","status") WHERE "donation"."recurring_need_id" is not null;--> statement-breakpoint
CREATE INDEX "donation_supporter_idx" ON "donation" USING btree ("supporter_id") WHERE "donation"."supporter_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "payout_asaas_transfer_unique" ON "payout" USING btree ("asaas_transfer_id") WHERE "payout"."asaas_transfer_id" is not null;--> statement-breakpoint
CREATE INDEX "payout_org_requested_idx" ON "payout" USING btree ("organization_id","requested_at");--> statement-breakpoint
CREATE INDEX "payout_org_status_idx" ON "payout" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "payout_account_idx" ON "payout" USING btree ("payout_account_id");--> statement-breakpoint
CREATE INDEX "payout_processing_idx" ON "payout" USING btree ("status","processing_started_at") WHERE "payout"."status" = 'processing';--> statement-breakpoint
CREATE UNIQUE INDEX "payout_account_default_unique" ON "payout_account" USING btree ("organization_id") WHERE "payout_account"."is_default" = true;--> statement-breakpoint
CREATE INDEX "payout_account_active_default_idx" ON "payout_account" USING btree ("organization_id","is_active","is_default");--> statement-breakpoint
CREATE INDEX "payout_account_type_idx" ON "payout_account" USING btree ("organization_id","type");--> statement-breakpoint
CREATE INDEX "audit_org_action_idx" ON "audit_log" USING btree ("organization_id","action","created_at");--> statement-breakpoint
CREATE INDEX "audit_actor_idx" ON "audit_log" USING btree ("actor_user_id","created_at") WHERE "audit_log"."actor_user_id" is not null;--> statement-breakpoint
CREATE INDEX "audit_retention_idx" ON "audit_log" USING btree ("retention_until");--> statement-breakpoint
CREATE INDEX "audit_entity_idx" ON "audit_log" USING btree ("entity_type","entity_id","created_at");--> statement-breakpoint
CREATE INDEX "timeline_entity_idx" ON "timeline_event" USING btree ("organization_id","entity_type","entity_id","occurred_at");--> statement-breakpoint
CREATE INDEX "timeline_org_feed_idx" ON "timeline_event" USING btree ("organization_id","occurred_at");--> statement-breakpoint
CREATE INDEX "timeline_actor_idx" ON "timeline_event" USING btree ("actor_user_id","occurred_at") WHERE "timeline_event"."actor_user_id" is not null;--> statement-breakpoint
CREATE INDEX "webhook_queue_idx" ON "webhook_event" USING btree ("status","received_at");--> statement-breakpoint
CREATE INDEX "webhook_type_idx" ON "webhook_event" USING btree ("provider","event_type","received_at");