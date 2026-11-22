import { relations } from 'drizzle-orm'
import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  varchar,
  pgEnum,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core'

export const userRole = pgEnum('user_role', ['admin', 'user'])
export const xAccountStatus = pgEnum('x_account_status', ['active', 'error', 'unverified'])
export const articleStatus = pgEnum('article_status', ['extracted', 'failed'])
export const authTokenType = pgEnum('auth_token_type', ['email_verification', 'password_reset'])

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: varchar('name', { length: 120 }).notNull().default(''),
  role: userRole('role').notNull().default('user'),
  emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
  passwordChangedAt: timestamp('password_changed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const authTokens = pgTable(
  'auth_tokens',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: authTokenType('type').notNull(),
    tokenHash: text('token_hash').notNull().unique(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('auth_tokens_user_type_idx').on(t.userId, t.type),
    index('auth_tokens_active_idx').on(t.type, t.expiresAt),
  ],
)

export const xAccounts = pgTable(
  'x_accounts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    label: varchar('label', { length: 120 }).notNull(),
    accountName: varchar('account_name', { length: 120 }).notNull(),
    cookieEncrypted: text('cookie_encrypted').notNull(),
    status: xAccountStatus('status').notNull().default('unverified'),
    errorMsg: text('error_msg'),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex('x_accounts_user_name_idx').on(t.userId, t.accountName),
    index('x_accounts_user_idx').on(t.userId),
  ],
)

export const categories = pgTable(
  'categories',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 120 }).notNull(),
    color: varchar('color', { length: 9 }).notNull().default('#71717a'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex('categories_user_name_idx').on(t.userId, t.name),
    index('categories_user_idx').on(t.userId),
  ],
)

export const articles = pgTable(
  'articles',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tweetId: varchar('tweet_id', { length: 30 }).notNull(),
    url: text('url').notNull(),
    author: varchar('author', { length: 120 }),
    title: text('title').notNull(),
    contentJson: jsonb('content_json').notNull(),
    html: text('html').notNull(),
    pdfPath: text('pdf_path'),
    categoryId: uuid('category_id').references(() => categories.id, { onDelete: 'set null' }),
    status: articleStatus('status').notNull().default('extracted'),
    extractedAt: timestamp('extracted_at', { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex('articles_user_tweet_idx').on(t.userId, t.tweetId),
    index('articles_user_idx').on(t.userId),
    index('articles_category_idx').on(t.categoryId),
    index('articles_created_idx').on(t.createdAt),
  ],
)

export const articleImages = pgTable(
  'article_images',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    articleId: uuid('article_id')
      .notNull()
      .references(() => articles.id, { onDelete: 'cascade' }),
    kind: varchar('kind', { length: 16 }).notNull(),
    remoteUrl: text('remote_url').notNull(),
    localPath: text('local_path'),
    videoUrl: text('video_url'),
    alt: text('alt'),
  },
  (t) => [index('article_images_article_idx').on(t.articleId)],
)

export const usersRelations = relations(users, ({ many }) => ({
  authTokens: many(authTokens),
  xAccounts: many(xAccounts),
  categories: many(categories),
  articles: many(articles),
}))

export const articlesRelations = relations(articles, ({ one, many }) => ({
  user: one(users, { fields: [articles.userId], references: [users.id] }),
  category: one(categories, { fields: [articles.categoryId], references: [categories.id] }),
  images: many(articleImages),
}))
