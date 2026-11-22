import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db, schema } from '@/lib/db'
import { badRequest, requireUser } from '@/lib/api/auth-guard'
import { passwordSchema } from '@/lib/password-policy'


const changeSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordSchema,
})

export async function POST(req: NextRequest) {
  const user = await requireUser()
  if (user instanceof Response) return user

  const parsed = changeSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message || 'invalid body')

  const [row] = await db
    .select({ passwordHash: schema.users.passwordHash })
    .from(schema.users)
    .where(eq(schema.users.id, user.id))
    .limit(1)

  if (!row) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const ok = await bcrypt.compare(parsed.data.currentPassword, row.passwordHash)
  if (!ok) return badRequest('Current password is incorrect')

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12)
  await db
    .update(schema.users)
    .set({ passwordHash, passwordChangedAt: new Date(), updatedAt: new Date() })
    .where(eq(schema.users.id, user.id))

  return NextResponse.json({ ok: true })
}
