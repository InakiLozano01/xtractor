export type SearchAction = {
  id: string
  title: string
  subtitle: string
  href: string
  keywords: string[]
}

export const appSearchActions: SearchAction[] = [
  {
    id: 'extract',
    title: 'Extract a new article',
    subtitle: 'Paste an X post or X Article URL',
    href: '/extract',
    keywords: ['extract', 'save', 'archive', 'url', 'post', 'article'],
  },
  {
    id: 'articles',
    title: 'Browse archive',
    subtitle: 'All saved articles and posts',
    href: '/articles',
    keywords: ['articles', 'archive', 'library', 'saved', 'posts'],
  },
  {
    id: 'categories',
    title: 'Manage categories',
    subtitle: 'Organize saved material',
    href: '/categories',
    keywords: ['categories', 'tags', 'organize', 'labels'],
  },
  {
    id: 'accounts',
    title: 'X accounts',
    subtitle: 'Encrypted cookie connections',
    href: '/accounts',
    keywords: ['accounts', 'twitter', 'x', 'cookies', 'auth', 'credentials'],
  },
  {
    id: 'security',
    title: 'Security settings',
    subtitle: 'Change your password',
    href: '/settings',
    keywords: ['security', 'password', 'settings', 'account'],
  },
]

export function normalizeSearchQuery(query: string | null | undefined) {
  return (query || '').trim().replace(/\s+/g, ' ').slice(0, 120)
}

export function makeLikePattern(query: string) {
  return `%${query.replace(/[\\%_]/g, (m) => `\\${m}`)}%`
}

export function stripHtml(input: string | null | undefined) {
  return (input || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
}

export function buildSearchSnippet(text: string | null | undefined, query: string, maxLength = 180) {
  const clean = stripHtml(text)
  if (!clean) return ''
  const needle = query.toLowerCase()
  const index = clean.toLowerCase().indexOf(needle)
  if (index < 0) return clean.length > maxLength ? `${clean.slice(0, maxLength - 1).trimEnd()}…` : clean

  const start = Math.max(0, index - 60)
  const end = Math.min(clean.length, index + needle.length + maxLength - 80)
  const prefix = start > 0 ? '…' : ''
  const suffix = end < clean.length ? '…' : ''
  return `${prefix}${clean.slice(start, end).trim()}${suffix}`
}

export function actionMatches(action: SearchAction, query: string) {
  const q = query.toLowerCase()
  return [action.title, action.subtitle, ...action.keywords].some((value) => value.toLowerCase().includes(q))
}
