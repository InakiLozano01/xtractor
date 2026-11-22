'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Search, FileText, FileDown, MessagesSquare } from 'lucide-react'
import { formatDate, truncate } from '@/lib/utils'

type Article = {
  id: string
  tweetId: string
  url: string
  author: string | null
  title: string
  categoryId: string | null
  categoryName: string | null
  categoryColor: string | null
  status: string
  extractedAt: string
  createdAt: string
  snippet?: string
  threadCount?: number
}

type Category = { id: string; name: string; color: string }

export default function HomePage() {
  const [articles, setArticles] = useState<Article[]>([])
  const [cats, setCats] = useState<Category[]>([])
  const searchParams = useSearchParams()
  const [q, setQ] = useState(searchParams.get('q') || '')
  const [cat, setCat] = useState(searchParams.get('category') || '')
  const [loading, setLoading] = useState(true)



  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (cat) params.set('category', cat)
    const res = await fetch(`/api/articles?${params}`, { cache: 'no-store' })
    if (res.ok) {
      const data = await res.json()
      setArticles(data.articles || [])
    }
    setLoading(false)
  }, [q, cat])

  useEffect(() => {
    fetch('/api/categories', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => setCats(d.categories || []))
  }, [])

  useEffect(() => {
    const t = setTimeout(load, 250)
    return () => clearTimeout(t)
  }, [load])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Articles</h1>
          <p className="text-sm text-muted-fg">Search titles, authors, categories, links, and full saved article text.</p>
        </div>
        <Link href="/extract">
          <Button>
            <Plus className="h-4 w-4" />
            Extract
          </Button>
        </Link>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-fg" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search everything in your archive…"
            className="pl-9"
          />
        </div>
        <select
          value={cat}
          onChange={(e) => setCat(e.target.value)}
          className="h-9 rounded-md border border-input bg-bg px-3 text-sm"
        >
          <option value="">All categories</option>
          {cats.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {q && !loading && (
        <p className="text-sm text-muted-fg">
          {articles.length} result{articles.length === 1 ? '' : 's'} for “{q}”
        </p>
      )}

      {loading ? (
        <div className="grid gap-3">
          {[0, 1, 2].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="mb-3 h-3 w-40 rounded bg-muted" />
                <div className="h-4 w-3/4 rounded bg-muted" />
                <div className="mt-3 h-3 w-1/2 rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : articles.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="mb-3 h-8 w-8 text-muted-fg" />
            <p className="text-sm text-muted-fg">{q ? 'No matching articles.' : 'No articles yet.'}</p>
            <Link href="/extract" className="mt-3">
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4" />
                Extract your first
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {articles.map((a) => (
            <Card key={a.id} className="transition-colors hover:border-muted-fg/40">
              <CardContent className="flex items-start gap-4 p-4">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    {a.categoryName && (
                      <Badge style={{ backgroundColor: (a.categoryColor || '#71717a') + '22', color: a.categoryColor || '#71717a', borderColor: 'transparent' }}>
                        {a.categoryName}
                      </Badge>
                    )}
                    {a.author && <span className="text-xs text-muted-fg">@{a.author}</span>}
                    {(a.threadCount || 0) > 1 && (
                      <Badge variant="outline" className="gap-1">
                        <MessagesSquare className="h-3 w-3" />
                        {a.threadCount} posts
                      </Badge>
                    )}
                    <span className="text-xs text-muted-fg">·</span>
                    <span className="text-xs text-muted-fg">{formatDate(a.createdAt)}</span>
                  </div>
                  <Link href={`/articles/${a.id}`} className="block">
                    <p className="text-sm font-medium leading-snug hover:underline">{truncate(a.title, 140)}</p>
                  </Link>
                  {q && a.snippet && <p className="mt-2 text-sm leading-6 text-muted-fg">{truncate(a.snippet, 220)}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <a href={`/api/articles/${a.id}/pdf`} target="_blank" rel="noreferrer">
                    <Button variant="ghost" size="icon" title="Download PDF">
                      <FileDown className="h-4 w-4" />
                    </Button>
                  </a>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
