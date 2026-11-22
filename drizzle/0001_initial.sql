-- xtractor initial schema

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE x_account_status AS ENUM ('active', 'error', 'unverified');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE article_status AS ENUM ('extracted', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "email" varchar(255) NOT NULL UNIQUE,
  "password_hash" text NOT NULL,
  "name" varchar(120) NOT NULL DEFAULT '',
  "role" user_role NOT NULL DEFAULT 'user',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "x_accounts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "label" varchar(120) NOT NULL,
  "account_name" varchar(120) NOT NULL,
  "cookie_encrypted" text NOT NULL,
  "status" x_account_status NOT NULL DEFAULT 'unverified',
  "error_msg" text,
  "last_used_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "categories" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "name" varchar(120) NOT NULL,
  "color" varchar(9) NOT NULL DEFAULT '#71717a',
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "articles" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "tweet_id" varchar(30) NOT NULL,
  "url" text NOT NULL,
  "author" varchar(120),
  "title" text NOT NULL,
  "content_json" jsonb NOT NULL,
  "html" text NOT NULL,
  "pdf_path" text,
  "category_id" uuid REFERENCES "categories"("id") ON DELETE SET NULL,
  "status" article_status NOT NULL DEFAULT 'extracted',
  "extracted_at" timestamptz NOT NULL DEFAULT now(),
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "article_images" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "article_id" uuid NOT NULL REFERENCES "articles"("id") ON DELETE CASCADE,
  "kind" varchar(16) NOT NULL,
  "remote_url" text NOT NULL,
  "local_path" text,
  "video_url" text,
  "alt" text
);

CREATE UNIQUE INDEX IF NOT EXISTS "x_accounts_user_name_idx" ON "x_accounts" ("user_id", "account_name");
CREATE INDEX IF NOT EXISTS "x_accounts_user_idx" ON "x_accounts" ("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "categories_user_name_idx" ON "categories" ("user_id", "name");
CREATE INDEX IF NOT EXISTS "categories_user_idx" ON "categories" ("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "articles_user_tweet_idx" ON "articles" ("user_id", "tweet_id");
CREATE INDEX IF NOT EXISTS "articles_user_idx" ON "articles" ("user_id");
CREATE INDEX IF NOT EXISTS "articles_category_idx" ON "articles" ("category_id");
CREATE INDEX IF NOT EXISTS "articles_created_idx" ON "articles" ("created_at");
CREATE INDEX IF NOT EXISTS "article_images_article_idx" ON "article_images" ("article_id");
