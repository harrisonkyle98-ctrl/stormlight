
ALTER TABLE "clan_members" ADD COLUMN IF NOT EXISTS "theme" TEXT DEFAULT 'blue';

UPDATE "clan_members" SET "theme" = 'blue' WHERE "theme" IS NULL;
