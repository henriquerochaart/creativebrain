ALTER TABLE "users" ADD COLUMN "is_owner" boolean DEFAULT false NOT NULL;--> statement-breakpoint
-- This Brain's first account was not its owner's: someone else registered first and so adopted the
-- library that predates accounts, and the API key and the Shortcut's old token captured into it.
-- Mark the owner's account and move that library to it, once. The two addresses are matched by
-- SHA-256 so neither is written in the repository; on any other database this matches nothing.
DO $$
DECLARE
  owner_id uuid;
  first_id uuid;
BEGIN
  SELECT "id" INTO owner_id FROM "users" WHERE encode(sha256(convert_to("email", 'UTF8')), 'hex') = '2353315d79fc4befd185f18e4b694ba1e86027f0b95f54525ca6be578da2545e';
  SELECT "id" INTO first_id FROM "users" WHERE encode(sha256(convert_to("email", 'UTF8')), 'hex') = '14f55efdd94273b9eecdc15a1ff00d7e7e7117fbc454a5703681f8e19d8b7b3b';
  IF owner_id IS NOT NULL THEN
    UPDATE "users" SET "is_owner" = true WHERE "id" = owner_id;
    IF first_id IS NOT NULL AND first_id <> owner_id THEN
      UPDATE "references" SET "user_id" = owner_id WHERE "user_id" = first_id;
      -- A collection whose slug the owner already uses keeps it with a suffix.
      UPDATE "collections" c SET "user_id" = owner_id,
        "slug" = CASE WHEN EXISTS (SELECT 1 FROM "collections" x WHERE x."user_id" = owner_id AND x."slug" = c."slug") THEN c."slug" || '-' || left(c."id"::text, 4) ELSE c."slug" END
        WHERE c."user_id" = first_id;
      UPDATE "boards" SET "user_id" = owner_id WHERE "user_id" = first_id;
      UPDATE "projects" SET "user_id" = owner_id WHERE "user_id" = first_id;
      UPDATE "conversations" SET "user_id" = owner_id WHERE "user_id" = first_id;
    END IF;
  END IF;
END $$;
--> statement-breakpoint
-- Everywhere else the owner is the first account, as before.
UPDATE "users" SET "is_owner" = true WHERE "id" = (SELECT "id" FROM "users" ORDER BY "created_at" LIMIT 1) AND NOT EXISTS (SELECT 1 FROM "users" WHERE "is_owner");
