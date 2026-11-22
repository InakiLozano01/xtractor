import { NextRequest } from 'next/server'
import { z } from 'zod'
import { and, eq } from 'drizzle-orm'
import { db, schema } from '@/lib/db'
import { requireUser, notFound, badRequest } from '@/lib/api/auth-guard'


const patchSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
})

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser()
  if (user instanceof Response) return user
  const { id } = await ctx.params
  const parsed = patchSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return badRequest('invalid body')
  const [row] = await db
    .select({ id: schema.categories.id })
    .from(schema.categories)
    .where(and(eq(schema.categories.id, id), eq(schema.categories.userId, user.id)))
    .limit(1)
  if (!row) return notFound()
  await db
    .update(schema.categories)
    .set({ ...(parsed.data.name ? { name: parsed.data.name } : {}), ...(parsed.data.color ? { color: parsed.data.color } : {}) })
    .where(eq(schema.categories.id, id))
  return Response.json({ ok: true })
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser()
  if (user instanceof Response) return user
  const { id } = await ctx.params
  const [row] = await db
    .select({ id: schema.categories.id })
    .from(schema.categories)
    .where(and(eq(schema.categories.id, id), eq(schema.categories.userId, user.id)))
    .limit(1)
  if (!row) return notFound()
  await db.delete(schema.categories).where(eq(schema.categories.id, id))
  return Response.json({ ok: true })
}
