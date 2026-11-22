const TWEET_ID_RE = /\/status(?:es)?\/(\d{5,25})/
const X_ARTICLE_ID_RE = /\/i\/article\/(\d{5,25})/

export function parseTweetId(input: string): string | null {
  const trimmed = input.trim()
  // bare numeric id
  if (/^\d{5,25}$/.test(trimmed)) return trimmed
  const m = trimmed.match(TWEET_ID_RE)
  return m ? m[1] : null
}

export function parseXArticleId(input: string): string | null {
  const trimmed = input.trim()
  const m = trimmed.match(X_ARTICLE_ID_RE)
  return m ? m[1] : null
}

export function isTweetUrl(input: string): boolean {
  const t = input.trim().toLowerCase()
  return t.includes('x.com/') || t.includes('twitter.com/')
}
