import { readFile } from 'node:fs/promises'
import { extname } from 'node:path'
import { safeArtifactPath } from '@/lib/artifacts'
import type { ScrapeImage, XArticle } from '@/lib/scraper-client'

type TweetDict = {
  id?: number | string
  rawContent?: string
  date?: string | { $datetime?: string }
  user?: { username?: string; displayname?: string }
  replyCount?: number
  retweetCount?: number
  likeCount?: number
  quoteCount?: number
  viewCount?: number | null
  url?: string
  media?: { photos?: { url?: string }[]; videos?: { thumbnailUrl?: string }[]; animated?: { thumbnailUrl?: string }[] }
}

type ArticleBlock = {
  text?: string
  type?: string
}

export type MarkdownScrape = {
  main?: Record<string, unknown>
  thread?: Record<string, unknown>[]
  threadCount?: number
  xArticle?: XArticle | null
  images?: ScrapeImage[]
  author?: string
  url?: string
  tweetId?: string
}

type RenderMarkdownOptions = {
  articleId: string
  includeImages: boolean
  fallbackTitle: string
  fallbackUrl: string
  fallbackAuthor?: string | null
  archivedAt?: string | Date
}

function decodeHtmlEntities(s: string): string {
  let out = String(s ?? '')
  for (let i = 0; i < 3; i += 1) {
    const next = out
      .replace(/&amp;/g, '&')
      .replace(/&#(\d+);/g, (_, n: string) => {
        const code = Number(n)
        return code >= 0 && code <= 0x10ffff ? String.fromCodePoint(code) : _
      })
      .replace(/&#x([0-9a-fA-F]+);/g, (_, n: string) => {
        const code = Number.parseInt(n, 16)
        return code >= 0 && code <= 0x10ffff ? String.fromCodePoint(code) : _
      })
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
    if (next === out) break
    out = next
  }
  return out
}

function mdText(s: string): string {
  return decodeHtmlEntities(s)
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .trim()
}

function mdInline(s: string): string {
  return mdText(s).replace(/\[/g, '\\[').replace(/\]/g, '\\]')
}

function safeUrl(s: string): string | null {
  try {
    const url = new URL(decodeHtmlEntities(s))
    if (url.protocol !== 'http:' && url.protocol !== 'https:' && url.protocol !== 'data:') return null
    return url.toString().replace(/\)/g, '%29')
  } catch {
    return null
  }
}

function linkifyMarkdown(text: string): string {
  const decoded = mdText(text).replace(/<a\s+[^>]*href\s*=\s*(['"])(https?:\/\/[^'"]+)\1[^>]*>([\s\S]*?)<\/a>/gi, (_m, _q, href, label) => {
    const url = safeUrl(href)
    const cleanLabel = mdInline(String(label || '').replace(/<[^>]*>/g, '') || href)
    return url ? `[${cleanLabel}](${url})` : cleanLabel
  })

  const parts: string[] = []
  const re = /https?:\/\/[^\s<>)]+/g
  let last = 0
  for (const match of decoded.matchAll(re)) {
    const idx = match.index ?? 0
    parts.push(decoded.slice(last, idx))
    const previous = decoded.slice(Math.max(0, idx - 2), idx)
    const next = decoded.slice(idx + match[0].length, idx + match[0].length + 1)
    const url = safeUrl(match[0])
    parts.push(previous === '](' || next === ')' || !url ? match[0] : `[${match[0]}](${url})`)
    last = idx + match[0].length
  }
  parts.push(decoded.slice(last))
  return parts.join('')
}

function dateText(value: TweetDict['date'] | string | null | undefined): string {
  if (!value) return ''
  const raw = typeof value === 'string' ? value : value.$datetime || ''
  if (!raw) return ''
  const dt = new Date(raw)
  if (Number.isNaN(dt.getTime())) return mdText(raw)
  return dt.toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' })
}

function mimeFromPath(path: string): string {
  const ext = extname(path).toLowerCase()
  if (ext === '.png') return 'image/png'
  if (ext === '.webp') return 'image/webp'
  if (ext === '.gif') return 'image/gif'
  return 'image/jpeg'
}

async function imageRef(articleId: string, image: ScrapeImage | undefined, remote: string, includeImages: boolean): Promise<string | null> {
  if (!includeImages) return null
  if (image?.localPath) {
    try {
      const abs = safeArtifactPath(articleId, ...image.localPath.split('/'))
      const buf = await readFile(abs)
      return `data:${mimeFromPath(image.localPath)};base64,${buf.toString('base64')}`
    } catch {
      /* fall through to remote URL */
    }
  }
  return safeUrl(remote)
}

async function markdownImage(articleId: string, image: ScrapeImage | undefined, remote: string, alt: string, includeImages: boolean): Promise<string> {
  const src = await imageRef(articleId, image, remote, includeImages)
  return src ? `![${mdInline(alt)}](${src})` : ''
}

function metrics(tweet: TweetDict): string {
  const parts = [
    ['replies', tweet.replyCount],
    ['retweets', tweet.retweetCount],
    ['likes', tweet.likeCount],
    ['quotes', tweet.quoteCount],
    ['views', tweet.viewCount],
  ]
    .filter(([, n]) => typeof n === 'number' && n > 0)
    .map(([label, n]) => `${Number(n).toLocaleString()} ${label}`)
  return parts.length ? parts.join(' · ') : ''
}

async function tweetMediaMarkdown(tweet: TweetDict, articleId: string, images: ScrapeImage[], tweetIndex: number, includeImages: boolean): Promise<string[]> {
  const out: string[] = []
  const media = tweet.media || {}

  for (const [i, photo] of (media.photos || []).entries()) {
    const image = images.find((m) => m.tweetIndex === tweetIndex && m.kind === 'photo' && m.remoteUrl === photo.url) || images.filter((m) => m.tweetIndex === tweetIndex && m.kind === 'photo')[i]
    const md = await markdownImage(articleId, image, photo.url || '', `photo ${i + 1}`, includeImages)
    if (md) out.push(md)
  }

  for (const [i, video] of (media.videos || []).entries()) {
    const image = images.filter((m) => m.tweetIndex === tweetIndex && m.kind === 'video')[i]
    const md = await markdownImage(articleId, image, video.thumbnailUrl || '', `video thumbnail ${i + 1}`, includeImages)
    if (md) out.push(md)
    if (image?.videoUrl) out.push(`[Open video](${image.videoUrl})`)
  }

  for (const [i, animated] of (media.animated || []).entries()) {
    const image = images.filter((m) => m.tweetIndex === tweetIndex && m.kind === 'animated')[i]
    const md = await markdownImage(articleId, image, animated.thumbnailUrl || '', `gif thumbnail ${i + 1}`, includeImages)
    if (md) out.push(md)
    if (image?.videoUrl) out.push(`[Open GIF/video](${image.videoUrl})`)
  }

  return out
}

async function tweetMarkdown(tweet: TweetDict, articleId: string, images: ScrapeImage[], index: number, includeImages: boolean, headingLevel: 2 | 3): Promise<string> {
  const user = tweet.user || {}
  const handle = user.username ? `@${user.username}` : ''
  const name = user.displayname || handle || 'X post'
  const lines = [`${'#'.repeat(headingLevel)} ${mdInline(name)}${handle && name !== handle ? ` (${handle})` : ''}`]
  const when = dateText(tweet.date)
  if (when) lines.push(`_${when}_`)
  if (tweet.rawContent) lines.push(linkifyMarkdown(tweet.rawContent))
  lines.push(...(await tweetMediaMarkdown(tweet, articleId, images, index, includeImages)))
  const metricText = metrics(tweet)
  if (metricText) lines.push(`_${metricText}_`)
  if (tweet.url) lines.push(`[View on X](${tweet.url})`)
  return lines.filter(Boolean).join('\n\n')
}

function articleBlockMarkdown(block: { text?: string; type?: string }): string {
  const text = linkifyMarkdown(block.text || '')
  if (!text) return ''
  if (block.type === 'header-one' || block.type === 'header-two' || block.type === 'header-three') return `## ${text}`
  if (block.type === 'unordered-list-item' || block.type === 'ordered-list-item') return `- ${text}`
  return text
}

async function articleImagesMarkdown(article: XArticle, articleId: string, images: ScrapeImage[], includeImages: boolean): Promise<string[]> {
  if (!includeImages) return []
  const out: string[] = []
  const seen = new Set<string>()
  for (const item of article.media || []) {
    if (!item.url || seen.has(item.url)) continue
    seen.add(item.url)
    const image = images.find((m) => m.remoteUrl === item.url)
    const md = await markdownImage(articleId, image, item.url, item.alt || article.title || 'image', includeImages)
    if (md) out.push(md)
  }
  return out
}

async function renderXArticleMarkdown(scrape: MarkdownScrape, article: XArticle, options: RenderMarkdownOptions): Promise<string> {
  const images = scrape.images || []
  const author = article.author?.username || scrape.author || options.fallbackAuthor || 'x'
  const title = article.title || options.fallbackTitle || 'X Article'
  const lines = [`# ${mdInline(title)}`, `Author: @${author}`]
  if (article.publishedAt) lines.push(`Published: ${dateText(article.publishedAt)}`)
  if (article.url || options.fallbackUrl) lines.push(`Source: ${article.url || options.fallbackUrl}`)
  lines.push('')
  lines.push(...(await articleImagesMarkdown(article, options.articleId, images, options.includeImages)))
  const body = (article.blocks || []).map(articleBlockMarkdown).filter(Boolean)
  if (body.length > 0) lines.push(...body)
  else if (article.plainText || article.previewText) lines.push(linkifyMarkdown(article.plainText || article.previewText || ''))
  if (article.sourceTweetUrl) lines.push(`[View source post on X](${article.sourceTweetUrl})`)
  lines.push(`Archived by xTractor · ${new Date(options.archivedAt || Date.now()).toISOString()}`)
  return lines.filter((line, index, all) => line || all[index - 1]).join('\n\n').trim() + '\n'
}

export async function renderMarkdown(scrape: MarkdownScrape, options: RenderMarkdownOptions): Promise<string> {
  if (scrape.xArticle) return renderXArticleMarkdown(scrape, scrape.xArticle, options)

  const main = (scrape.main || {}) as TweetDict
  const thread = (scrape.thread || []) as TweetDict[]
  const tweets = thread.length > 0 ? thread : [main]
  const first = tweets[0] || main
  const title = options.fallbackTitle || (first.rawContent ? first.rawContent.split('\n')[0].slice(0, 90) : 'X post')
  const isThread = tweets.length > 1
  const header = [`# ${mdInline(isThread && !title.toLowerCase().startsWith('thread:') ? `Thread: ${title}` : title)}`]
  if (options.fallbackAuthor || scrape.author || first.user?.username) header.push(`Author: @${options.fallbackAuthor || scrape.author || first.user?.username}`)
  if (options.fallbackUrl || scrape.url || first.url) header.push(`Source: ${options.fallbackUrl || scrape.url || first.url}`)
  if (isThread) header.push(`${tweets.length} posts from the author thread. Replies from other users are excluded.`)

  const tweetSections = await Promise.all(
    tweets.map((tweet, index) => tweetMarkdown(tweet, options.articleId, scrape.images || [], index, options.includeImages, 2)),
  )
  const footer = `Archived by xTractor · ${new Date(options.archivedAt || Date.now()).toISOString()}`
  return [header.join('\n'), ...tweetSections, footer].filter(Boolean).join('\n\n---\n\n').trim() + '\n'
}
