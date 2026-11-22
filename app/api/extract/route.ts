import { NextRequest } from 'next/server'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { and, eq } from 'drizzle-orm'
import { db, schema } from '@/lib/db'
import { requireUser, badRequest } from '@/lib/api/auth-guard'
import { parseTweetId, parseXArticleId, isTweetUrl } from '@/lib/extract-url'
import { scrapeTweet, renderPdf, resolveArticleTweetId } from '@/lib/scraper-client'
import { cookieStringFromEncrypted } from '@/lib/crypto'
import { renderTweetHtml, makeWebImgFor, makeFileImgFor } from '@/lib/render-html'
import { removeArticleArtifacts } from '@/lib/artifacts'

export const maxDuration = 120

const bodySchema = z.object({
  url: z.string().min(1),
  accountId: z.string().uuid(),
  categoryId: z.string().uuid().nullable().optional(),
  includeThread: z.boolean().optional().default(false),
})

export async function POST(req: NextRequest) {
  const user = await requireUser()
  if (user instanceof Response) return user

  const parsed = bodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message || 'invalid body')
  const { url, accountId, categoryId, includeThread } = parsed.data

  let tweetId = parseTweetId(url)
  const xArticleId = parseXArticleId(url)
  if (!tweetId && !xArticleId) return badRequest('Provide an x.com / twitter.com post URL, X Article URL, or bare post ID')
  if (!isTweetUrl(url) && !/^\d+$/.test(url.trim())) return badRequest('Provide an x.com / twitter.com URL or bare post ID')

  const [acct] = await db
    .select()
    .from(schema.xAccounts)
    .where(and(eq(schema.xAccounts.id, accountId), eq(schema.xAccounts.userId, user.id)))
    .limit(1)
  if (!acct) return badRequest('Account not found')

  const cookieStr = cookieStringFromEncrypted(acct.cookieEncrypted)

  if (!tweetId && xArticleId) {
    const resolved = await resolveArticleTweetId(xArticleId, cookieStr)
    if (!resolved.ok || !resolved.tweetId) {
      return Response.json({ error: resolved.error || 'Could not resolve that X Article URL' }, { status: 502 })
    }
    tweetId = resolved.tweetId
  }

  const sourceTweetId = tweetId
  if (!sourceTweetId) return badRequest('Could not parse a source post id from that URL')

  const [existing] = await db
    .select({ id: schema.articles.id })
    .from(schema.articles)
    .where(and(eq(schema.articles.userId, user.id), eq(schema.articles.tweetId, sourceTweetId)))
    .limit(1)

  const articleId = existing?.id ?? randomUUID()
  const scrape = await scrapeTweet(sourceTweetId, cookieStr, articleId, includeThread)
  if (!scrape.ok || !scrape.main) {
    // mark account error
    await db
      .update(schema.xAccounts)
      .set({ status: 'error', errorMsg: scrape.error || 'scrape failed' })
      .where(eq(schema.xAccounts.id, acct.id))
    if (!existing) await removeArticleArtifacts(articleId)
    return Response.json({ error: scrape.error || 'extraction failed' }, { status: 502 })
  }

  await db
    .update(schema.xAccounts)
    .set({ status: 'active', errorMsg: null, lastUsedAt: new Date() })
    .where(eq(schema.xAccounts.id, acct.id))

  const webHtml = renderTweetHtml(scrape, makeWebImgFor(articleId))
  const fileHtml = renderTweetHtml(scrape, makeFileImgFor(articleId))
  const pdfPath = (await renderPdf(fileHtml, articleId)) || null

  const firstLine = (scrape.rawContent || '').split('\n')[0].trim()
  const titleRaw =
    scrape.xArticle?.title?.slice(0, 140) ||
    (firstLine ? `${(scrape.thread?.length || 0) > 1 ? 'Thread: ' : ''}${firstLine.slice(0, 132)}` : '') ||
    `Tweet by @${scrape.author || 'unknown'}`
  const archiveUrl = scrape.xArticle?.url || scrape.url || url

  if (existing) {
    await db
      .update(schema.articles)
      .set({
        url: archiveUrl,
        author: scrape.author || null,
        title: titleRaw,
        contentJson: scrape as unknown as Record<string, unknown>,
        html: webHtml,
        pdfPath,
        categoryId: categoryId ?? null,
        status: 'extracted',
        extractedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(schema.articles.id, existing.id))
    // refresh images
    await db.delete(schema.articleImages).where(eq(schema.articleImages.articleId, existing.id))
    for (const img of scrape.images || []) {
      await db.insert(schema.articleImages).values({
        articleId: existing.id,
        kind: img.kind,
        remoteUrl: img.remoteUrl,
        localPath: img.localPath,
        videoUrl: img.videoUrl,
        alt: img.alt,
      })
    }
    return Response.json({ id: existing.id, refreshed: true, threadCount: scrape.threadCount || 1 })
  }

  const [row] = await db
    .insert(schema.articles)
    .values({
      id: articleId,
      userId: user.id,
      tweetId: sourceTweetId,
      url: archiveUrl,
      author: scrape.author || null,
      title: titleRaw,
      contentJson: scrape as unknown as Record<string, unknown>,
      html: webHtml,
      pdfPath,
      categoryId: categoryId ?? null,
      status: 'extracted',
    })
    .returning({ id: schema.articles.id })

  for (const img of scrape.images || []) {
    await db.insert(schema.articleImages).values({
      articleId: row!.id,
      kind: img.kind,
      remoteUrl: img.remoteUrl,
      localPath: img.localPath,
      videoUrl: img.videoUrl,
      alt: img.alt,
    })
  }

  return Response.json({ id: row!.id, refreshed: false, threadCount: scrape.threadCount || 1 })
}
