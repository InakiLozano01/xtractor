import { NextRequest } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { db, schema } from '@/lib/db'
import { requireUser, notFound } from '@/lib/api/auth-guard'
import { renderMarkdown, type MarkdownScrape } from '@/lib/render-markdown'


function wantsImages(req: NextRequest): boolean {
  const value = (req.nextUrl.searchParams.get('images') || '').toLowerCase()
  return value === '1' || value === 'true' || value === 'with'
}

function filename(title: string, id: string, includeImages: boolean) {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)
  return `${slug || `article-${id}`}${includeImages ? '-with-images' : '-text-only'}.md`
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser()
  if (user instanceof Response) return user
  const { id } = await ctx.params
  const includeImages = wantsImages(req)

  const [row] = await db
    .select({
      id: schema.articles.id,
      title: schema.articles.title,
      url: schema.articles.url,
      author: schema.articles.author,
      contentJson: schema.articles.contentJson,
      extractedAt: schema.articles.extractedAt,
    })
    .from(schema.articles)
    .where(and(eq(schema.articles.id, id), eq(schema.articles.userId, user.id)))
    .limit(1)
  if (!row) return notFound()

  const markdown = await renderMarkdown(row.contentJson as MarkdownScrape, {
    articleId: id,
    includeImages,
    fallbackTitle: row.title,
    fallbackUrl: row.url,
    fallbackAuthor: row.author,
    archivedAt: row.extractedAt,
  })

  return new Response(markdown, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename(row.title, id, includeImages)}"`,
      'Cache-Control': 'private, max-age=3600',
    },
  })
}
