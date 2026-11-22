import { NextRequest } from 'next/server'
import { z } from 'zod'
import { and, eq } from 'drizzle-orm'
import { db, schema } from '@/lib/db'
import { requireUser, notFound, badRequest } from '@/lib/api/auth-guard'
import { removeArticleArtifacts } from '@/lib/artifacts'


export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser()
  if (user instanceof Response) return user
  const { id } = await ctx.params

  const [row] = await db
    .select()
    .from(schema.articles)
    .where(and(eq(schema.articles.id, id), eq(schema.articles.userId, user.id)))
    .limit(1)
  if (!row) return notFound()

  const images = await db
    .select()
    .from(schema.articleImages)
    .where(eq(schema.articleImages.articleId, id))

  return Response.json({ article: row, images })
}

const patchSchema = z.object({
  categoryId: z.string().uuid().nullable(),
})

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser()
  if (user instanceof Response) return user
  const { id } = await ctx.params
  const parsed = patchSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return badRequest('invalid body')

  const [row] = await db
    .select({ id: schema.articles.id })
    .from(schema.articles)
    .where(and(eq(schema.articles.id, id), eq(schema.articles.userId, user.id)))
    .limit(1)
  if (!row) return notFound()

  await db
    .update(schema.articles)
    .set({ categoryId: parsed.data.categoryId, updatedAt: new Date() })
    .where(eq(schema.articles.id, id))
  return Response.json({ ok: true })
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser()
  if (user instanceof Response) return user
  const { id } = await ctx.params

  const [row] = await db
    .select({ id: schema.articles.id, pdfPath: schema.articles.pdfPath })
    .from(schema.articles)
    .where(and(eq(schema.articles.id, id), eq(schema.articles.userId, user.id)))
    .limit(1)
  if (!row) return notFound()

  await db.delete(schema.articles).where(eq(schema.articles.id, id))
  await removeArticleArtifacts(id, row.pdfPath)
  return Response.json({ ok: true })
}
