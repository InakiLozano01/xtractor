import { NextRequest } from 'next/server'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db, schema } from '@/lib/db'
import { requireUser, badRequest } from '@/lib/api/auth-guard'
import { encryptCookie } from '@/lib/crypto'


export async function GET() {
  const user = await requireUser()
  if (user instanceof Response) return user
  const rows = await db
    .select({
      id: schema.xAccounts.id,
      label: schema.xAccounts.label,
      accountName: schema.xAccounts.accountName,
      status: schema.xAccounts.status,
      errorMsg: schema.xAccounts.errorMsg,
      lastUsedAt: schema.xAccounts.lastUsedAt,
      createdAt: schema.xAccounts.createdAt,
    })
    .from(schema.xAccounts)
    .where(eq(schema.xAccounts.userId, user.id))
    .orderBy(schema.xAccounts.createdAt)
  return Response.json({ accounts: rows })
}

const createSchema = z.object({
  label: z.string().min(1).max(120),
  accountName: z.string().min(1).max(120),
  authToken: z.string().min(10),
  ct0: z.string().min(10),
})

export async function POST(req: NextRequest) {
  const user = await requireUser()
  if (user instanceof Response) return user
  const parsed = createSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message || 'invalid body')
  const { label, accountName, authToken, ct0 } = parsed.data

  const cookieEncrypted = encryptCookie(authToken.trim(), ct0.trim())
  const [row] = await db
    .insert(schema.xAccounts)
    .values({
      userId: user.id,
      label,
      accountName: accountName.replace(/^@/, ''),
      cookieEncrypted,
      status: 'unverified',
    })
    .returning({ id: schema.xAccounts.id })
  return Response.json({ id: row!.id })
}
