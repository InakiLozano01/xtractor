import { randomBytes, createHash } from 'node:crypto'
import { and, eq, gt, isNull } from 'drizzle-orm'
import { db, schema } from '@/lib/db'

export type AuthTokenType = 'email_verification' | 'password_reset'

const TTL_BY_TYPE: Record<AuthTokenType, number> = {
  email_verification: 24 * 60 * 60 * 1000,
  password_reset: 60 * 60 * 1000,
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

export async function createAuthToken(userId: string, type: AuthTokenType) {
  const token = randomBytes(32).toString('base64url')
  const tokenHash = hashToken(token)
  const expiresAt = new Date(Date.now() + TTL_BY_TYPE[type])

  await db
    .delete(schema.authTokens)
    .where(and(eq(schema.authTokens.userId, userId), eq(schema.authTokens.type, type), isNull(schema.authTokens.usedAt)))

  await db.insert(schema.authTokens).values({
    userId,
    type,
    tokenHash,
    expiresAt,
  })

  return token
}

export async function consumeAuthToken(token: string, type: AuthTokenType) {
  const tokenHash = hashToken(token)
  const [row] = await db
    .update(schema.authTokens)
    .set({ usedAt: new Date() })
    .where(
      and(
        eq(schema.authTokens.tokenHash, tokenHash),
        eq(schema.authTokens.type, type),
        isNull(schema.authTokens.usedAt),
        gt(schema.authTokens.expiresAt, new Date()),
      ),
    )
    .returning({ userId: schema.authTokens.userId })

  return row?.userId ?? null
}
