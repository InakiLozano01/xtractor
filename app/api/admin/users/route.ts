import { NextRequest } from 'next/server'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { desc, eq } from 'drizzle-orm'
import { db, schema } from '@/lib/db'
import { requireAdmin, badRequest } from '@/lib/api/auth-guard'
import { passwordSchema } from '@/lib/password-policy'


export async function GET() {
  const admin = await requireAdmin()
  if (admin instanceof Response) return admin
  const rows = await db
    .select({
      id: schema.users.id,
      email: schema.users.email,
      name: schema.users.name,
      role: schema.users.role,
      emailVerifiedAt: schema.users.emailVerifiedAt,
      createdAt: schema.users.createdAt,
    })
    .from(schema.users)
    .orderBy(desc(schema.users.createdAt))
  return Response.json({ users: rows })
}

const createSchema = z.object({
  email: z.string().email(),
  password: passwordSchema,
  name: z.string().min(1).max(120).optional(),
  role: z.enum(['admin', 'user']).default('user'),
})

export async function POST(req: NextRequest) {
  const admin = await requireAdmin()
  if (admin instanceof Response) return admin
  const parsed = createSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message || 'invalid body')
  const { email, password, name, role } = parsed.data

  const [existing] = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.email, email.toLowerCase()))
    .limit(1)
  if (existing) return badRequest('email already exists')

  const hash = await bcrypt.hash(password, 12)
  const [row] = await db
    .insert(schema.users)
    .values({ email: email.toLowerCase(), passwordHash: hash, name: name || '', role, emailVerifiedAt: new Date() })
    .returning({ id: schema.users.id })
  return Response.json({ id: row!.id })
}
