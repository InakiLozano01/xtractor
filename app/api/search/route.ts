import { NextRequest } from 'next/server'
import { and, desc, eq, ilike, or, sql, type SQL } from 'drizzle-orm'
import { db, schema } from '@/lib/db'
import { requireUser } from '@/lib/api/auth-guard'
import {
  actionMatches,
  appSearchActions,
  buildSearchSnippet,
  makeLikePattern,
  normalizeSearchQuery,
} from '@/lib/search'


export async function GET(req: NextRequest) {
  const user = await requireUser()
  if (user instanceof Response) return user

  const q = normalizeSearchQuery(req.nextUrl.searchParams.get('q'))
  const like = q ? makeLikePattern(q) : null

  const articleConditions: SQL[] = [eq(schema.articles.userId, user.id)]
  if (like) {
    const searchCondition = or(
      ilike(schema.articles.title, like),
      ilike(schema.articles.author, like),
      ilike(schema.articles.url, like),
      ilike(schema.articles.tweetId, like),
      ilike(schema.categories.name, like),
      sql`${schema.articles.html} ILIKE ${like}`,
      sql`${schema.articles.contentJson}::text ILIKE ${like}`,
    )
    if (searchCondition) articleConditions.push(searchCondition)
  }

  const articles = await db
    .select({
      id: schema.articles.id,
      title: schema.articles.title,
      author: schema.articles.author,
      url: schema.articles.url,
      tweetId: schema.articles.tweetId,
      categoryName: schema.categories.name,
      categoryColor: schema.categories.color,
      createdAt: schema.articles.createdAt,
      html: schema.articles.html,
      contentJson: schema.articles.contentJson,
    })
    .from(schema.articles)
    .leftJoin(schema.categories, eq(schema.categories.id, schema.articles.categoryId))
    .where(and(...articleConditions))
    .orderBy(desc(schema.articles.createdAt))
    .limit(q ? 8 : 5)

  const categoryConditions: SQL[] = [eq(schema.categories.userId, user.id)]
  if (like) categoryConditions.push(ilike(schema.categories.name, like))
  const categories = await db
    .select({
      id: schema.categories.id,
      name: schema.categories.name,
      color: schema.categories.color,
      createdAt: schema.categories.createdAt,
    })
    .from(schema.categories)
    .where(and(...categoryConditions))
    .orderBy(schema.categories.createdAt)
    .limit(q ? 6 : 4)

  const accountConditions: SQL[] = [eq(schema.xAccounts.userId, user.id)]
  if (like) {
    const searchCondition = or(
      ilike(schema.xAccounts.label, like),
      ilike(schema.xAccounts.accountName, like),
      sql`${schema.xAccounts.status}::text ILIKE ${like}`,
    )
    if (searchCondition) accountConditions.push(searchCondition)
  }
  const accounts = await db
    .select({
      id: schema.xAccounts.id,
      label: schema.xAccounts.label,
      accountName: schema.xAccounts.accountName,
      status: schema.xAccounts.status,
      lastUsedAt: schema.xAccounts.lastUsedAt,
    })
    .from(schema.xAccounts)
    .where(and(...accountConditions))
    .orderBy(schema.xAccounts.createdAt)
    .limit(q ? 5 : 3)

  const actions = (q ? appSearchActions.filter((action) => actionMatches(action, q)) : appSearchActions).slice(0, 6)

  return Response.json({
    query: q,
    actions,
    articles: articles.map(({ html, contentJson, ...article }) => ({
      kind: 'article',
      title: article.title,
      subtitle: [article.author ? `@${article.author}` : null, article.categoryName].filter(Boolean).join(' · '),
      snippet: q ? buildSearchSnippet(`${article.title} ${article.author || ''} ${article.categoryName || ''} ${article.url} ${html} ${JSON.stringify(contentJson)}`, q) : article.url,
      href: `/articles/${article.id}`,
      meta: article.createdAt,
      categoryColor: article.categoryColor,
    })),
    categories: categories.map((category) => ({
      kind: 'category',
      title: category.name,
      subtitle: 'Category',
      href: `/articles?category=${category.id}`,
      color: category.color,
    })),
    accounts: accounts.map((account) => ({
      kind: 'account',
      title: account.label,
      subtitle: `@${account.accountName} · ${account.status}`,
      href: '/accounts',
    })),
  })
}
