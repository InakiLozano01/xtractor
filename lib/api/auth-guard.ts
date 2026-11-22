import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

export type SessionUser = {
  id: string
  role: 'admin' | 'user'
  email: string
  name?: string | null
}

export async function getAuthUser(): Promise<SessionUser | null> {
  const session = await auth()
  if (!session?.user?.id) return null
  return {
    id: session.user.id,
    role: session.user.role,
    email: session.user.email as string,
    name: session.user.name,
  }
}

export function unauthorized() {
  return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
}

export function forbidden() {
  return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
}

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 })
}

export function notFound(message = 'NOT_FOUND') {
  return NextResponse.json({ error: message }, { status: 404 })
}

export async function requireUser(): Promise<SessionUser | NextResponse> {
  const u = await getAuthUser()
  if (!u) return unauthorized()
  return u
}

export async function requireAdmin(): Promise<SessionUser | NextResponse> {
  const u = await getAuthUser()
  if (!u) return unauthorized()
  if (u.role !== 'admin') return forbidden()
  return u
}
