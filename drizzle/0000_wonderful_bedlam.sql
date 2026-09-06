CREATE TABLE "collection_items" (
	"collection_id" uuid NOT NULL,
	"reference_id" uuid NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "collection_items_collection_id_reference_id_pk" PRIMARY KEY("collection_id","reference_id")
);
--> statement-breakpoint
CREATE TABLE "collections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"emoji" text,
	"description" text,
	"position" integer DEFAULT 0 NOT NULL,
	"auto" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference_id" uuid,
	"mode" text NOT NULL,
	"question" text NOT NULL,
	"answer" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reference_relations" (
	"source_id" uuid NOT NULL,
	"target_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"score" real DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reference_relations_source_id_target_id_kind_pk" PRIMARY KEY("source_id","target_id","kind")
);
--> statement-breakpoint
CREATE TABLE "references" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"original_url" text,
	"canonical_url" text,
	"source_platform" text DEFAULT 'other' NOT NULL,
	"media_type" text DEFAULT 'website' NOT NULL,
	"title" text,
	"brand" text,
	"thumbnail_url" text,
	"media_key" text,
	"media_mime" text,
	"media_bytes" integer,
	"status" text DEFAULT 'queued' NOT NULL,
	"processing_step" text,
	"error" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"content" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"ai" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"subjects" text[] DEFAULT '{}'::text[] NOT NULL,
	"formats" text[] DEFAULT '{}'::text[] NOT NULL,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"principles" text[] DEFAULT '{}'::text[] NOT NULL,
	"concepts" text[] DEFAULT '{}'::text[] NOT NULL,
	"saved" boolean DEFAULT false NOT NULL,
	"user_note" text,
	"embedding_content" vector(1536),
	"embedding_visual" vector(1536),
	"embedding_strategic" vector(1536),
	"embedding_execution" vector(1536),
	"search_text" text,
	"fts" "tsvector" GENERATED ALWAYS AS (to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(brand, '') || ' ' || coalesce(search_text, ''))) STORED,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "collection_items" ADD CONSTRAINT "collection_items_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_items" ADD CONSTRAINT "collection_items_reference_id_references_id_fk" FOREIGN KEY ("reference_id") REFERENCES "public"."references"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_reference_id_references_id_fk" FOREIGN KEY ("reference_id") REFERENCES "public"."references"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reference_relations" ADD CONSTRAINT "reference_relations_source_id_references_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."references"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reference_relations" ADD CONSTRAINT "reference_relations_target_id_references_id_fk" FOREIGN KEY ("target_id") REFERENCES "public"."references"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "collections_slug_idx" ON "collections" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "reference_relations_target_idx" ON "reference_relations" USING btree ("target_id");--> statement-breakpoint
CREATE INDEX "references_status_idx" ON "references" USING btree ("status");--> statement-breakpoint
CREATE INDEX "references_platform_idx" ON "references" USING btree ("source_platform");--> statement-breakpoint
CREATE INDEX "references_created_idx" ON "references" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "references_fts_idx" ON "references" USING gin ("fts");--> statement-breakpoint
CREATE INDEX "references_tags_idx" ON "references" USING gin ("tags");--> statement-breakpoint
CREATE INDEX "references_subjects_idx" ON "references" USING gin ("subjects");--> statement-breakpoint
CREATE INDEX "references_formats_idx" ON "references" USING gin ("formats");--> statement-breakpoint
CREATE INDEX "references_principles_idx" ON "references" USING gin ("principles");--> statement-breakpoint
CREATE INDEX "references_emb_content_idx" ON "references" USING hnsw ("embedding_content" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "references_emb_visual_idx" ON "references" USING hnsw ("embedding_visual" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "references_emb_strategic_idx" ON "references" USING hnsw ("embedding_strategic" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "references_emb_execution_idx" ON "references" USING hnsw ("embedding_execution" vector_cosine_ops);