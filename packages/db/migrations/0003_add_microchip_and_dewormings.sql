ALTER TABLE "animal" ADD COLUMN "microchip_code" text;--> statement-breakpoint
ALTER TABLE "animal" ADD COLUMN "dewormings" jsonb DEFAULT '[]'::jsonb NOT NULL;