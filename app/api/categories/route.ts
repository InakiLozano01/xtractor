import { NextRequest } from 'next/server'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db, schema } from '@/lib/db'
import { requireUser, badRequest } from '@/lib/api/auth-guard'


export async function GET() {
  const user = await requireUser()
  if (user instanceof Response) return user
  const rows = await db
    .select()
    .from(schema.categories)
    .where(eq(schema.categories.userId, user.id))
    .orderBy(schema.categories.createdAt)
  return Response.json({ categories: rows })
}

const schema_ = z.object({
  name: z.string().min(1).max(120),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#71717a'),
})

export async function POST(req: NextRequest) {
  const user = await requireUser()
  if (user instanceof Response) return user
  const parsed = schema_.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message || 'invalid body')
  const [row] = await db
    .insert(schema.categories)
    .values({ userId: user.id, name: parsed.data.name.trim(), color: parsed.data.color })
    .returning({ id: schema.categories.id })
  return Response.json({ id: row!.id })
}
