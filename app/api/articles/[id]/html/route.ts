import { NextRequest } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { db, schema } from '@/lib/db'
import { requireUser, notFound } from '@/lib/api/auth-guard'
import { inlineArticleImages } from '@/lib/export-html'


export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser()
  if (user instanceof Response) return user
  const { id } = await ctx.params

  const [row] = await db
    .select({ html: schema.articles.html, userId: schema.articles.userId })
    .from(schema.articles)
    .where(and(eq(schema.articles.id, id), eq(schema.articles.userId, user.id)))
    .limit(1)
  if (!row) return notFound()

  const html = await inlineArticleImages(row.html, id)
  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `attachment; filename="article-${id}.html"`,
      'Cache-Control': 'private, max-age=3600',
    },
  })
}
