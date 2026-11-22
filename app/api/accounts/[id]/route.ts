import { NextRequest } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { db, schema } from '@/lib/db'
import { requireUser, notFound } from '@/lib/api/auth-guard'


export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser()
  if (user instanceof Response) return user
  const { id } = await ctx.params
  const [row] = await db
    .select({ id: schema.xAccounts.id })
    .from(schema.xAccounts)
    .where(and(eq(schema.xAccounts.id, id), eq(schema.xAccounts.userId, user.id)))
    .limit(1)
  if (!row) return notFound()
  await db.delete(schema.xAccounts).where(eq(schema.xAccounts.id, id))
  return Response.json({ ok: true })
}
