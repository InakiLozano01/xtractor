import { NextRequest } from 'next/server'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { db, schema } from '@/lib/db'
import { requireAdmin, notFound, badRequest } from '@/lib/api/auth-guard'
import { passwordSchema } from '@/lib/password-policy'


const patchSchema = z.object({
  role: z.enum(['admin', 'user']).optional(),
  password: passwordSchema.optional(),
})

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin()
  if (admin instanceof Response) return admin
  const { id } = await ctx.params
  const parsed = patchSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return badRequest('invalid body')

  const [row] = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.id, id)).limit(1)
  if (!row) return notFound()

  const updates: Record<string, unknown> = { updatedAt: new Date() }
  if (parsed.data.role) updates.role = parsed.data.role
  if (parsed.data.password) {
    updates.passwordHash = await bcrypt.hash(parsed.data.password, 12)
    updates.passwordChangedAt = new Date()
  }
  await db.update(schema.users).set(updates).where(eq(schema.users.id, id))
  return Response.json({ ok: true })
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin()
  if (admin instanceof Response) return admin
  const { id } = await ctx.params
  if (id === admin.id) return badRequest("can't delete yourself")
  await db.delete(schema.users).where(eq(schema.users.id, id))
  return Response.json({ ok: true })
}
