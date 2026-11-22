import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db, schema } from '@/lib/db'
import { createAuthToken, normalizeEmail } from '@/lib/auth-tokens'
import { sendVerificationEmail } from '@/lib/email'
import { passwordSchema } from '@/lib/password-policy'


const signupSchema = z.object({
  email: z.string().email(),
  password: passwordSchema,
  name: z.string().trim().max(120).optional(),
})

export async function POST(req: NextRequest) {
  const parsed = signupSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid signup' }, { status: 400 })
  }

  const email = normalizeEmail(parsed.data.email)
  const passwordHash = await bcrypt.hash(parsed.data.password, 12)
  const name = parsed.data.name || ''

  const [existing] = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1)
  if (existing?.emailVerifiedAt) {
    return NextResponse.json({ ok: true })
  }

  const [user] = existing
    ? await db
        .update(schema.users)
        .set({ passwordHash, name: name || existing.name, updatedAt: new Date() })
        .where(eq(schema.users.id, existing.id))
        .returning({ id: schema.users.id })
    : await db
        .insert(schema.users)
        .values({ email, passwordHash, name, role: 'user' })
        .returning({ id: schema.users.id })

  if (user?.id) {
    const token = await createAuthToken(user.id, 'email_verification')
    await sendVerificationEmail(email, token)
  }

  return NextResponse.json({ ok: true })
}
