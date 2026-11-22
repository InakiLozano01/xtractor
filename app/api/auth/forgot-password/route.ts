import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db, schema } from '@/lib/db'
import { createAuthToken, normalizeEmail } from '@/lib/auth-tokens'
import { sendPasswordResetEmail } from '@/lib/email'


const forgotSchema = z.object({
  email: z.string().email(),
})

export async function POST(req: NextRequest) {
  const parsed = forgotSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ ok: true })
  }

  const email = normalizeEmail(parsed.data.email)
  const [user] = await db
    .select({ id: schema.users.id, emailVerifiedAt: schema.users.emailVerifiedAt })
    .from(schema.users)
    .where(eq(schema.users.email, email))
    .limit(1)

  if (user?.emailVerifiedAt) {
    const token = await createAuthToken(user.id, 'password_reset')
    await sendPasswordResetEmail(email, token)
  }

  return NextResponse.json({ ok: true })
}
