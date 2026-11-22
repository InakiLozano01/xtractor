-- public auth: verified signup, password reset, and account password changes

DO $$ BEGIN
  CREATE TYPE auth_token_type AS ENUM ('email_verification', 'password_reset');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email_verified_at" timestamptz;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password_changed_at" timestamptz;

UPDATE "users"
SET "email_verified_at" = now()
WHERE "email_verified_at" IS NULL;

CREATE TABLE IF NOT EXISTS "auth_tokens" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "type" auth_token_type NOT NULL,
  "token_hash" text NOT NULL UNIQUE,
  "expires_at" timestamptz NOT NULL,
  "used_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "auth_tokens_user_type_idx" ON "auth_tokens" ("user_id", "type");
CREATE INDEX IF NOT EXISTS "auth_tokens_active_idx" ON "auth_tokens" ("type", "expires_at") WHERE "used_at" IS NULL;
