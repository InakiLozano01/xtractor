import NextAuth, { type DefaultSession } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { db, schema } from '@/lib/db'
import { z } from 'zod'
import type { JWT } from 'next-auth/jwt'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: 'admin' | 'user'
    } & DefaultSession['user']
  }
  interface User {
    role?: 'admin' | 'user'
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string
    role?: 'admin' | 'user'
    passwordChangedAt?: string | null
    revoked?: boolean
  }
}

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: '/login' },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw)
        if (!parsed.success) return null
        const { email, password } = parsed.data
        const [user] = await db
          .select()
          .from(schema.users)
          .where(eq(schema.users.email, email.toLowerCase()))
          .limit(1)
        if (!user) return null
        if (!user.emailVerifiedAt) return null
        const ok = await bcrypt.compare(password, user.passwordHash)
        if (!ok) return null
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string
        const current = await loadSessionUser(token.id)
        token.role = current?.role || ((user as { role: string }).role as 'admin' | 'user')
        token.passwordChangedAt = current?.passwordChangedAt?.toISOString() || null
        token.revoked = !current?.emailVerifiedAt
        return token
      }

      if (token.id) {
        const current = await loadSessionUser(token.id)
        if (!current?.emailVerifiedAt || isTokenOlderThanPassword(token, current.passwordChangedAt)) {
          token.revoked = true
          return token
        }
        token.role = current.role
      }
      return token
    },
    session({ session, token }) {
      if (token && session.user && !token.revoked && token.id && token.role) {
        session.user.id = token.id
        session.user.role = token.role
      }
      return session
    },
  },
})

async function loadSessionUser(id: string) {
  const [user] = await db
    .select({
      role: schema.users.role,
      emailVerifiedAt: schema.users.emailVerifiedAt,
      passwordChangedAt: schema.users.passwordChangedAt,
    })
    .from(schema.users)
    .where(eq(schema.users.id, id))
    .limit(1)
  return user
}

function isTokenOlderThanPassword(token: JWT, passwordChangedAt: Date | null) {
  if (!passwordChangedAt) return false
  if (!token.passwordChangedAt) return true
  const tokenChangedAt = new Date(token.passwordChangedAt)
  return Number.isNaN(tokenChangedAt.getTime()) || passwordChangedAt.getTime() > tokenChangedAt.getTime()
}
