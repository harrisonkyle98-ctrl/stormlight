ALTER TABLE "custom_badges" ADD COLUMN IF NOT EXISTS "allow_username_color_override" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "selected_badge_id" TEXT;
