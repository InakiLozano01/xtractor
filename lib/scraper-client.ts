// HTTP client for the Python scraper sidecar. Internal network only.

const SCRAPER_URL = process.env.SCRAPER_URL || 'http://scraper:8000'
const SCRAPER_TOKEN = process.env.SCRAPER_TOKEN || ''

export type ScrapeImage = {
  tweetIndex: number
  kind: string
  remoteUrl: string
  localPath: string | null
  videoUrl: string | null
  alt: string
}

export type XArticleBlock = {
  key?: string
  text?: string
  type?: string
}

export type XArticle = {
  id?: string | null
  url?: string | null
  title?: string
  previewText?: string
  plainText?: string
  blocks?: XArticleBlock[]
  publishedAt?: string | null
  coverImage?: { kind?: string; url?: string; alt?: string } | null
  media?: { kind: string; url: string; alt?: string }[]
  author?: { username?: string; displayname?: string; profileImageUrl?: string }
  sourceTweetUrl?: string | null
}

export type ScrapeResult = {
  ok: boolean
  error?: string
  main?: Record<string, unknown>
  thread?: Record<string, unknown>[]
  threadRequested?: boolean
  threadCount?: number
  threadRootTweetId?: string
  xArticle?: XArticle | null
  images?: ScrapeImage[]
  author?: string
  tweetId?: string
  url?: string
  date?: string
  rawContent?: string
}

export type ResolveArticleResult = {
  ok: boolean
  error?: string
  tweetId?: string
  url?: string
}

async function callScraper(path: string, body: unknown): Promise<Response> {
  return fetch(`${SCRAPER_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(SCRAPER_TOKEN ? { Authorization: `Bearer ${SCRAPER_TOKEN}` } : {}),
    },
    body: JSON.stringify(body),
    // scraping can take a while (network + image downloads)
    signal: undefined,
  })
}

export async function resolveArticleTweetId(articleId: string, cookieStr: string): Promise<ResolveArticleResult> {
  const res = await callScraper('/resolve-article', {
    article_id: articleId,
    cookies: cookieStr,
  })
  const data = (await res.json().catch(() => ({ ok: false, error: 'invalid json from scraper' }))) as ResolveArticleResult
  if (!res.ok || !data.ok) return { ...data, ok: false }
  return data
}

export async function scrapeTweet(
  tweetId: string,
  cookieStr: string,
  articleId: string,
  includeThread = false
): Promise<ScrapeResult & { articleId: string }> {
  const res = await callScraper('/scrape', {
    tweet_id: tweetId,
    cookies: cookieStr,
    article_id: articleId,
    include_thread: includeThread,
  })
  const data = (await res.json().catch(() => ({ ok: false, error: 'invalid json from scraper' }))) as ScrapeResult
  if (!res.ok || !data.ok) {
    return { ...data, ok: false, articleId }
  }
  return { ...data, articleId }
}

export async function renderPdf(html: string, articleId: string): Promise<string | null> {
  const relPath = `${articleId}/article.pdf`
  try {
    const res = await callScraper('/pdf', { html, output_path: relPath })
    const data = (await res.json().catch(() => ({}))) as { ok?: boolean; path?: string; error?: string }
    if (!res.ok || !data.ok) return null
    return relPath
  } catch {
    return null
  }
}
