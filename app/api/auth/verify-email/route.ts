import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db, schema } from '@/lib/db'
import { consumeAuthToken } from '@/lib/auth-tokens'
import { appPath } from '@/lib/app-url'


export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token') || ''
  const userId = token ? await consumeAuthToken(token, 'email_verification') : null
  if (userId) {
    await db
      .update(schema.users)
      .set({ emailVerifiedAt: new Date(), updatedAt: new Date() })
      .where(eq(schema.users.id, userId))
  }

  return NextResponse.redirect(appPath(`/verify-email?status=${userId ? 'success' : 'invalid'}`))
}
