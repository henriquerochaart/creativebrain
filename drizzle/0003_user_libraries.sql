DROP INDEX "collections_slug_idx";--> statement-breakpoint
ALTER TABLE "boards" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "collections" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "references" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "boards" ADD CONSTRAINT "boards_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collections" ADD CONSTRAINT "collections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "references" ADD CONSTRAINT "references_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "collections_user_slug_idx" ON "collections" USING btree ("user_id","slug");--> statement-breakpoint
CREATE INDEX "references_user_created_idx" ON "references" USING btree ("user_id","created_at");--> statement-breakpoint
-- Everything saved before accounts belongs to the first account. A database with no account yet keeps
-- its rows unowned; the first account to register adopts them (server/accounts.ts).
UPDATE "references" SET "user_id" = (SELECT "id" FROM "users" ORDER BY "created_at" LIMIT 1) WHERE "user_id" IS NULL;--> statement-breakpoint
UPDATE "collections" SET "user_id" = (SELECT "id" FROM "users" ORDER BY "created_at" LIMIT 1) WHERE "user_id" IS NULL;--> statement-breakpoint
UPDATE "boards" SET "user_id" = (SELECT "id" FROM "users" ORDER BY "created_at" LIMIT 1) WHERE "user_id" IS NULL;--> statement-breakpoint
UPDATE "projects" SET "user_id" = (SELECT "id" FROM "users" ORDER BY "created_at" LIMIT 1) WHERE "user_id" IS NULL;--> statement-breakpoint
UPDATE "conversations" SET "user_id" = (SELECT "id" FROM "users" ORDER BY "created_at" LIMIT 1) WHERE "user_id" IS NULL;
