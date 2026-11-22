import { NextRequest } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { db, schema } from '@/lib/db'
import { requireUser, notFound } from '@/lib/api/auth-guard'
import { safeArtifactPath } from '@/lib/artifacts'
import { inlineArticleImages } from '@/lib/export-html'
import { renderPdf } from '@/lib/scraper-client'


export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser()
  if (user instanceof Response) return user
  const { id } = await ctx.params

  const [row] = await db
    .select({ pdfPath: schema.articles.pdfPath, html: schema.articles.html, userId: schema.articles.userId })
    .from(schema.articles)
    .where(and(eq(schema.articles.id, id), eq(schema.articles.userId, user.id)))
    .limit(1)
  if (!row) return notFound()

  let pdfPath = row.pdfPath
  if (pdfPath) {
    try {
      const existing = safeArtifactPath(pdfPath)
      if (!existsSync(existing)) pdfPath = null
    } catch {
      pdfPath = null
    }
  }

  if (!pdfPath) {
    const html = await inlineArticleImages(row.html, id)
    pdfPath = await renderPdf(html, id)
    if (!pdfPath) return Response.json({ error: 'pdf export failed' }, { status: 502 })
    await db.update(schema.articles).set({ pdfPath, updatedAt: new Date() }).where(eq(schema.articles.id, id))
  }

  const abs = safeArtifactPath(pdfPath)
  if (!existsSync(abs)) return notFound('file missing')

  const buf = await readFile(abs)
  return new Response(new Uint8Array(buf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="article-${id}.pdf"`,
      'Cache-Control': 'private, max-age=3600',
    },
  })
}
