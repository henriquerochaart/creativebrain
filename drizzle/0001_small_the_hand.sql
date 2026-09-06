CREATE TABLE "boards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"brief" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_references" (
	"project_id" uuid NOT NULL,
	"reference_id" uuid NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"note" text,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_references_project_id_reference_id_pk" PRIMARY KEY("project_id","reference_id")
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"brief" text,
	"status" text DEFAULT 'open' NOT NULL,
	"analysis" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"analyzed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reference_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "project_references" ADD CONSTRAINT "project_references_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_references" ADD CONSTRAINT "project_references_reference_id_references_id_fk" FOREIGN KEY ("reference_id") REFERENCES "public"."references"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reference_events" ADD CONSTRAINT "reference_events_reference_id_references_id_fk" FOREIGN KEY ("reference_id") REFERENCES "public"."references"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "reference_events_ref_idx" ON "reference_events" USING btree ("reference_id");--> statement-breakpoint
CREATE INDEX "reference_events_created_idx" ON "reference_events" USING btree ("created_at");