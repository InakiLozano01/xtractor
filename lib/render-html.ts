import type { ScrapeImage, XArticle } from '@/lib/scraper-client'

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

function escapeHtml(s: string): string {
  return decodeHtmlEntities(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function safeHttpUrl(s: string): string | null {
  try {
    const url = new URL(decodeHtmlEntities(s))
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    return url.toString()
  } catch {
    return null
  }
}

function inlineMentionsAndTags(text: string): string {
  return escapeHtml(text)
    .replace(/(^|[^\w])@(\w{1,15})/g, '$1<a href="https://x.com/$2" target="_blank" rel="noreferrer">@$2</a>')
    .replace(/(^|[^\w])#(\w+)/g, '$1<a href="https://x.com/hashtag/$2" target="_blank" rel="noreferrer">#$2</a>')
}

function linkifyPlainText(text: string): string {
  const decoded = decodeHtmlEntities(text)
  const parts: string[] = []
  const re = /https?:\/\/[^\s<]+/g
  let last = 0
  for (const match of decoded.matchAll(re)) {
    const idx = match.index ?? 0
    parts.push(inlineMentionsAndTags(decoded.slice(last, idx)))
    const url = safeHttpUrl(match[0])
    parts.push(url ? `<a href="${escapeHtml(url)}" target="_blank" rel="noreferrer">${escapeHtml(match[0])}</a>` : escapeHtml(match[0]))
    last = idx + match[0].length
  }
  parts.push(inlineMentionsAndTags(decoded.slice(last)))
  return parts.join('')
}

function linkify(text: string): string {
  const decoded = decodeHtmlEntities(text)
  const parts: string[] = []
  const anchorRe = /<a\s+[^>]*href\s*=\s*(['"])(https?:\/\/[^'"]+)\1[^>]*>([\s\S]*?)<\/a>/gi
  let last = 0
  for (const match of decoded.matchAll(anchorRe)) {
    const idx = match.index ?? 0
    parts.push(linkifyPlainText(decoded.slice(last, idx)))
    const href = safeHttpUrl(match[2] || '')
    const label = decodeHtmlEntities((match[3] || '').replace(/<[^>]*>/g, '')).trim() || href || ''
    parts.push(href ? `<a href="${escapeHtml(href)}" target="_blank" rel="noreferrer">${escapeHtml(label)}</a>` : escapeHtml(label))
    last = idx + match[0].length
  }
  parts.push(linkifyPlainText(decoded.slice(last)))
  return parts.join('').replace(/\n/g, '<br>')
}

type TweetDict = {
  id?: number | string
  rawContent?: string
  date?: string | { $datetime?: string }
  user?: { username?: string; displayname?: string; profileImageUrl?: string }
  replyCount?: number
  retweetCount?: number
  likeCount?: number
  quoteCount?: number
  viewCount?: number | null
  url?: string
  media?: { photos?: { url?: string }[]; videos?: { thumbnailUrl?: string }[]; animated?: { thumbnailUrl?: string }[] }
}

type ArticleBlock = {
  key?: string
  text?: string
  type?: string
}

function tweetDate(t: TweetDict): string {
  const d = t.date
  if (!d) return ''
  const ds = typeof d === 'string' ? d : d.$datetime || ''
  if (!ds) return ''
  const dt = new Date(ds)
  if (Number.isNaN(dt.getTime())) return escapeHtml(ds)
  return dt.toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' })
}

function mediaBlock(t: TweetDict, imgFor: (localPath: string | null, remote: string) => string, images: ScrapeImage[], tweetIndex: number): string {
  const media = t.media || {}
  const items: string[] = []
  const photos = media.photos || []
  photos.forEach((p, i) => {
    const img = images.find((m) => m.tweetIndex === tweetIndex && m.kind === 'photo' && m.remoteUrl === p.url) || images.filter((m) => m.tweetIndex === tweetIndex && m.kind === 'photo')[i]
    const src = imgFor(img?.localPath ?? null, p.url || '')
    items.push(`<figure class="media"><img src="${escapeHtml(src)}" alt="photo" loading="lazy"></figure>`)
  })
  ;(media.videos || []).forEach((v, i) => {
    const img = images.filter((m) => m.tweetIndex === tweetIndex && m.kind === 'video')[i]
    const src = imgFor(img?.localPath ?? null, v.thumbnailUrl || '')
    const vu = img?.videoUrl || ''
    items.push(
      `<figure class="media media-video"><img src="${escapeHtml(src)}" alt="video thumbnail">${
        vu ? `<figcaption>video: <a href="${escapeHtml(vu)}" target="_blank" rel="noreferrer">open</a></figcaption>` : ''
      }</figure>`
    )
  })
  ;(media.animated || []).forEach((a, i) => {
    const img = images.filter((m) => m.tweetIndex === tweetIndex && m.kind === 'animated')[i]
    const src = imgFor(img?.localPath ?? null, a.thumbnailUrl || '')
    const vu = img?.videoUrl || ''
    items.push(
      `<figure class="media media-video"><img src="${escapeHtml(src)}" alt="gif thumbnail">${
        vu ? `<figcaption>gif: <a href="${escapeHtml(vu)}" target="_blank" rel="noreferrer">open</a></figcaption>` : ''
      }</figure>`
    )
  })
  if (items.length === 0) return ''
  return `<div class="media-grid ${items.length === 1 ? 'single' : 'multi'}">${items.join('')}</div>`
}

function metrics(t: TweetDict): string {
  const m = [
    ['replies', t.replyCount],
    ['retweets', t.retweetCount],
    ['likes', t.likeCount],
    ['quotes', t.quoteCount],
    ['views', t.viewCount],
  ] as const
  const parts = m
    .filter(([, n]) => typeof n === 'number' && n > 0)
    .map(([label, n]) => `<span>${Number(n).toLocaleString()} ${label}</span>`)
  return parts.length ? `<div class="metrics">${parts.join('')}</div>` : ''
}

function tweetBlock(t: TweetDict, imgFor: (p: string | null, r: string) => string, images: ScrapeImage[], idx: number, isMain: boolean): string {
  const u = t.user || {}
  const handle = u.username ? `@${escapeHtml(u.username)}` : ''
  const name = u.displayname ? escapeHtml(u.displayname) : handle
  const avatar = u.profileImageUrl ? `<img class="avatar" src="${escapeHtml(u.profileImageUrl)}" alt="">` : ''
  return `
  <article class="tweet ${isMain ? 'main' : 'reply'}">
    <header class="tweet-head">
      ${avatar}
      <div class="who"><span class="name">${name}</span><span class="handle">${handle}</span></div>
      <time class="when">${tweetDate(t)}</time>
    </header>
    <div class="tweet-body">${linkify(t.rawContent || '')}</div>
    ${mediaBlock(t, imgFor, images, idx)}
    ${metrics(t)}
    ${t.url ? `<a class="permalink" href="${escapeHtml(t.url)}" target="_blank" rel="noreferrer">View on X</a>` : ''}
  </article>`
}

const STYLE = `
:root { color-scheme: light; }
* { box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif; color: #0f172a; background: #fff; margin: 0; padding: 24px; line-height: 1.5; }
.doc { max-width: 760px; margin: 0 auto; }
.doc-title { font-size: 14px; color: #64748b; text-transform: uppercase; letter-spacing: 0.08em; margin: 0 0 4px; }
.doc-head { border-bottom: 1px solid #e2e8f0; padding-bottom: 16px; margin-bottom: 20px; }
.doc-head a { color: #64748b; text-decoration: none; font-size: 13px; word-break: break-all; }
.article-title { font-size: 38px; line-height: 1.08; letter-spacing: 0; margin: 0 0 12px; color: #020617; }
.article-meta { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; color: #64748b; font-size: 14px; margin-bottom: 22px; }
.article-cover { margin: 0 0 28px; }
.article-cover img { width: 100%; border-radius: 10px; border: 1px solid #e2e8f0; display: block; }
.article-body { font-size: 18px; line-height: 1.72; }
.article-body p { margin: 0 0 18px; }
.article-body h2 { font-size: 24px; line-height: 1.22; margin: 30px 0 12px; }
.article-body .list-item { margin-left: 20px; }
.source-link { display: inline-block; margin-top: 8px; color: #2563eb; text-decoration: none; font-size: 13px; }
.thread-summary { margin: -6px 0 16px; color: #64748b; font-size: 13px; }
.tweet { border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 14px; background: #fff; }
.tweet.main { border-color: #cbd5e1; }
.tweet-head { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
.avatar { width: 40px; height: 40px; border-radius: 50%; object-fit: cover; }
.who { display: flex; flex-direction: column; line-height: 1.2; }
.name { font-weight: 600; font-size: 15px; }
.handle { color: #64748b; font-size: 13px; }
.when { margin-left: auto; color: #94a3b8; font-size: 12px; }
.tweet-body { font-size: 16px; white-space: normal; word-wrap: break-word; }
.tweet-body a { color: #2563eb; }
.media-grid { margin-top: 12px; display: grid; gap: 8px; }
.media-grid.single { grid-template-columns: 1fr; }
.media-grid.multi { grid-template-columns: 1fr 1fr; }
.media { margin: 0; }
.media img { width: 100%; border-radius: 10px; border: 1px solid #e2e8f0; display: block; }
.media-video figcaption { font-size: 12px; color: #64748b; margin-top: 4px; }
.metrics { margin-top: 10px; font-size: 13px; color: #64748b; display: flex; gap: 16px; flex-wrap: wrap; }
.permalink { display: inline-block; margin-top: 8px; font-size: 13px; color: #2563eb; text-decoration: none; }
.footer { margin-top: 24px; padding-top: 14px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; }
@media print { body { padding: 0; } .tweet { break-inside: avoid; } }
`

function articleDate(iso?: string | null): string {
  if (!iso) return ''
  const dt = new Date(iso)
  if (Number.isNaN(dt.getTime())) return escapeHtml(iso)
  return dt.toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' })
}

function articleImage(article: XArticle, imgFor: (localPath: string | null, remote: string) => string, images: ScrapeImage[]): string {
  const remote = article.coverImage?.url || article.media?.[0]?.url
  if (!remote) return ''
  const local = images.find((m) => m.remoteUrl === remote)
  const src = imgFor(local?.localPath ?? null, remote)
  return `<figure class="article-cover"><img src="${escapeHtml(src)}" alt="${escapeHtml(article.coverImage?.alt || article.title || 'cover image')}" loading="lazy"></figure>`
}

function articleBlock(block: ArticleBlock): string {
  const text = (block.text || '').trim()
  if (!text) return ''
  const html = linkify(text)
  if (block.type === 'header-one' || block.type === 'header-two' || block.type === 'header-three') {
    return `<h2>${html}</h2>`
  }
  if (block.type === 'unordered-list-item' || block.type === 'ordered-list-item') {
    return `<p class="list-item">${block.type === 'ordered-list-item' ? '•' : '•'} ${html}</p>`
  }
  return `<p>${html}</p>`
}

function renderXArticleHtml(
  article: XArticle,
  scrape: { author?: string; tweetId?: string },
  images: ScrapeImage[],
  imgFor: (localPath: string | null, remote: string) => string
): string {
  const title = article.title || 'X Article'
  const author = article.author?.username || scrape.author || 'x'
  const blocks = (article.blocks || []).map(articleBlock).join('')
  const body = blocks || linkify(article.plainText || article.previewText || '')
  const published = articleDate(article.publishedAt)
  const sourceUrl = article.sourceTweetUrl || (scrape.tweetId ? `https://x.com/i/status/${scrape.tweetId}` : '')

  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)} — @${escapeHtml(author)}</title>
<style>${STYLE}</style></head><body><div class="doc">
<div class="doc-head">
  <p class="doc-title">xTractor archive</p>
  ${article.url ? `<a href="${escapeHtml(article.url)}" target="_blank" rel="noreferrer">${escapeHtml(article.url)}</a>` : ''}
</div>
<article>
  <h1 class="article-title">${escapeHtml(title)}</h1>
  <div class="article-meta">
    <span>@${escapeHtml(author)}</span>
    ${published ? `<span>·</span><time>${published}</time>` : ''}
  </div>
  ${articleImage(article, imgFor, images)}
  <div class="article-body">${body}</div>
  ${sourceUrl ? `<a class="source-link" href="${escapeHtml(sourceUrl)}" target="_blank" rel="noreferrer">View source post on X</a>` : ''}
</article>
<div class="footer">Archived by xTractor · ${new Date().toISOString()}</div>
</div></body></html>`
}

export function renderTweetHtml(
  scrape: { main?: Record<string, unknown>; thread?: Record<string, unknown>[]; xArticle?: XArticle | null; images?: ScrapeImage[]; author?: string; url?: string; tweetId?: string },
  imgFor: (localPath: string | null, remote: string) => string
): string {
  const main = (scrape.main || {}) as unknown as TweetDict
  const images = scrape.images || []
  if (scrape.xArticle) return renderXArticleHtml(scrape.xArticle, scrape, images, imgFor)
  const thread = (scrape.thread || []) as unknown as TweetDict[]
  const tweets = thread.length > 0 ? thread : [main]
  const blocks = tweets.map((tweet, index) => tweetBlock(tweet, imgFor, images, index, index === 0)).join('')
  const firstTweet = tweets[0] || main
  const isThread = tweets.length > 1
  const title = firstTweet.rawContent ? firstTweet.rawContent.split('\n')[0].slice(0, 80) : isThread ? 'X thread' : 'Tweet'
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(isThread ? `Thread: ${title}` : title)} — @${escapeHtml(firstTweet.user?.username || main.user?.username || scrape.author || 'x')}</title>
<style>${STYLE}</style></head><body><div class="doc">
<div class="doc-head">
  <p class="doc-title">xTractor ${isThread ? 'thread' : 'archive'}</p>
  ${scrape.url ? `<a href="${escapeHtml(scrape.url)}" target="_blank" rel="noreferrer">${escapeHtml(scrape.url)}</a>` : ''}
</div>
${isThread ? `<div class="thread-summary">${tweets.length} posts from the author thread. Replies from other users are excluded.</div>` : ''}
${blocks}
<div class="footer">Archived by xTractor · ${new Date().toISOString()}</div>
</div></body></html>`
}

export function makeWebImgFor(articleId: string) {
  return (localPath: string | null, remote: string) =>
    localPath ? `/api/files/${articleId}/${localPath}` : remote
}

export function makeFileImgFor(articleId: string) {
  return (localPath: string | null, remote: string) =>
    localPath ? `file:///app/artifacts/${articleId}/${localPath}` : remote
}
