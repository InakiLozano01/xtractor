import { NextRequest, NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { db, schema } from '@/lib/db'
import { requireUser, notFound } from '@/lib/api/auth-guard'
import { safeArtifactPath } from '@/lib/artifacts'


// GET /api/files/<articleId>/images/<name>
export async function GET(_req: NextRequest, ctx: { params: Promise<{ articleId: string; name: string }> }) {
  const user = await requireUser()
  if (user instanceof Response) return user
  const { articleId, name } = await ctx.params

  // the image must belong to an article owned by the user
  const [row] = await db
    .select({ id: schema.articles.id })
    .from(schema.articles)
    .where(and(eq(schema.articles.id, articleId), eq(schema.articles.userId, user.id)))
    .limit(1)
  if (!row) return notFound()

  // prevent path traversal: name must be a simple filename
  if (!/^[a-zA-Z0-9._-]+$/.test(name)) {
    return NextResponse.json({ error: 'bad filename' }, { status: 400 })
  }

  let abs: string
  try {
    abs = safeArtifactPath(articleId, 'images', name)
  } catch {
    return notFound('file missing')
  }
  if (!existsSync(abs)) return notFound('file missing')

  const buf = await readFile(abs)
  const ext = name.split('.').pop()?.toLowerCase()
  const type = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'application/octet-stream'
  return new Response(new Uint8Array(buf), {
    headers: { 'Content-Type': type, 'Cache-Control': 'private, max-age=86400' },
  })
}
