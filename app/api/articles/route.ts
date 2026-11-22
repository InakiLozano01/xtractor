import { NextRequest } from 'next/server'
import { z } from 'zod'
import { and, desc, eq, ilike, or, sql, type SQL } from 'drizzle-orm'
import { db, schema } from '@/lib/db'
import { requireUser, badRequest } from '@/lib/api/auth-guard'
import { buildSearchSnippet, makeLikePattern, normalizeSearchQuery } from '@/lib/search'
const categoryFilter = z.string().uuid()

function getThreadCount(contentJson: unknown) {
  if (!contentJson || typeof contentJson !== 'object') return 0
  const thread = (contentJson as { thread?: unknown }).thread
  return Array.isArray(thread) ? thread.length : 0
}

export async function GET(req: NextRequest) {
  const user = await requireUser()
  if (user instanceof Response) return user

  const cat = req.nextUrl.searchParams.get('category') || null
  if (cat && !categoryFilter.safeParse(cat).success) return badRequest('Invalid category filter')
  const q = normalizeSearchQuery(req.nextUrl.searchParams.get('q'))

  const conditions: SQL[] = [eq(schema.articles.userId, user.id)]
  if (cat) conditions.push(eq(schema.articles.categoryId, cat))
  if (q) {
    const like = makeLikePattern(q)
    const searchCondition = or(
      ilike(schema.articles.title, like),
      ilike(schema.articles.author, like),
      ilike(schema.articles.url, like),
      ilike(schema.articles.tweetId, like),
      ilike(schema.categories.name, like),
      sql`${schema.articles.html} ILIKE ${like}`,
      sql`${schema.articles.contentJson}::text ILIKE ${like}`,
    )
    if (searchCondition) conditions.push(searchCondition)
  }

  const rows = await db
    .select({
      id: schema.articles.id,
      tweetId: schema.articles.tweetId,
      url: schema.articles.url,
      author: schema.articles.author,
      title: schema.articles.title,
      categoryId: schema.articles.categoryId,
      categoryName: schema.categories.name,
      categoryColor: schema.categories.color,
      status: schema.articles.status,
      extractedAt: schema.articles.extractedAt,
      createdAt: schema.articles.createdAt,
      html: schema.articles.html,
      contentJson: schema.articles.contentJson,
    })
    .from(schema.articles)
    .leftJoin(schema.categories, eq(schema.categories.id, schema.articles.categoryId))
    .where(and(...conditions))
    .orderBy(desc(schema.articles.createdAt))
    .limit(200)

  return Response.json({
    articles: rows.map(({ html, contentJson, ...row }) => ({
      ...row,
      threadCount: getThreadCount(contentJson),
      snippet: q ? buildSearchSnippet(`${row.title} ${row.author || ''} ${row.categoryName || ''} ${html} ${JSON.stringify(contentJson)}`, q) : '',
    })),
  })
}
