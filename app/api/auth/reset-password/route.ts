import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db, schema } from '@/lib/db'
import { consumeAuthToken } from '@/lib/auth-tokens'
import { passwordSchema } from '@/lib/password-policy'


const resetSchema = z.object({
  token: z.string().min(20),
  password: passwordSchema,
})

export async function POST(req: NextRequest) {
  const parsed = resetSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid reset link' }, { status: 400 })
  }

  const userId = await consumeAuthToken(parsed.data.token, 'password_reset')
  if (!userId) {
    return NextResponse.json({ error: 'Reset link is invalid or expired' }, { status: 400 })
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12)
  await db
    .update(schema.users)
    .set({ passwordHash, passwordChangedAt: new Date(), updatedAt: new Date() })
    .where(eq(schema.users.id, userId))

  return NextResponse.json({ ok: true })
}
