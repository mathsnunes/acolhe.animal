CREATE TYPE "public"."upload_status" AS ENUM('pending', 'committed', 'failed');--> statement-breakpoint
CREATE TABLE "upload" (
	"pk" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "upload_pk_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"id" text NOT NULL,
	"organization_id" bigint NOT NULL,
	"status" "upload_status" DEFAULT 'pending' NOT NULL,
	"policy" text NOT NULL,
	"storage_key" text NOT NULL,
	"content_type" text NOT NULL,
	"size_bytes" bigint NOT NULL,
	"original_filename" text,
	"owner_type" text,
	"owner_id" text,
	"created_by" text,
	"expires_at" timestamp with time zone NOT NULL,
	"committed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "upload_id_unique" UNIQUE("id")
);
--> statement-breakpoint
ALTER TABLE "upload" ADD CONSTRAINT "upload_organization_id_organization_pk_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("pk") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "upload_sweep_idx" ON "upload" USING btree ("expires_at") WHERE "upload"."status" = 'pending';--> statement-breakpoint
CREATE INDEX "upload_owner_idx" ON "upload" USING btree ("owner_type","owner_id");