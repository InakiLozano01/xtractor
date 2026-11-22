'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import {
  Archive,
  AtSign,
  ChevronRight,
  Circle,
  Command,
  FileText,
  Folder,
  Loader2,
  Search,
  Settings,
} from 'lucide-react'
import { cn, formatDate, truncate } from '@/lib/utils'

type ActionResult = {
  id: string
  title: string
  subtitle: string
  href: string
}

type ArticleResult = {
  kind: 'article'
  title: string
  subtitle: string
  snippet: string
  href: string
  meta: string
  categoryColor: string | null
}

type SimpleResult = {
  kind: string
  title: string
  subtitle: string
  href: string
  color?: string
}

type SearchPayload = {
  actions: ActionResult[]
  articles: ArticleResult[]
  categories: SimpleResult[]
  accounts: SimpleResult[]
}

const emptyPayload: SearchPayload = {
  actions: [],
  articles: [],
  categories: [],
  accounts: [],
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [data, setData] = useState<SearchPayload>(emptyPayload)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const totalResults = data.actions.length + data.articles.length + data.categories.length + data.accounts.length

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setOpen(true)
      }
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    if (!open) return
    const t = window.setTimeout(() => inputRef.current?.focus(), 40)
    return () => window.clearTimeout(t)
  }, [open])

  useEffect(() => {
    if (!open) return
    const controller = new AbortController()
    const t = window.setTimeout(async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        if (query.trim()) params.set('q', query.trim())
        const res = await fetch(`/api/search?${params}`, { cache: 'no-store', signal: controller.signal })
        if (res.ok) setData(await res.json())
      } catch (error) {
        if (!controller.signal.aborted) setData(emptyPayload)
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }, 160)
    return () => {
      controller.abort()
      window.clearTimeout(t)
    }
  }, [open, query])

  const searchButton = useMemo(
    () => (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-9 w-full items-center gap-2 rounded-md border border-border bg-bg px-3 text-left text-sm text-muted-fg transition-colors hover:border-muted-fg/40 hover:text-fg"
      >
        <Search className="h-4 w-4" />
        <span className="min-w-0 flex-1 truncate">Search archive and app</span>
        <span className="hidden rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-fg sm:inline-flex">⌘K</span>
      </button>
    ),
    [],
  )

  return (
    <>
      {searchButton}
      {open && (
        <div className="fixed inset-0 z-50 bg-black/70 p-3 backdrop-blur-sm" role="dialog" aria-modal="true">
          <button className="absolute inset-0 cursor-default" aria-label="Close search" onClick={() => setOpen(false)} />
          <div className="xtractor-rise relative mx-auto mt-[8vh] max-h-[82vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-white/12 bg-[#10100f] text-white shadow-2xl shadow-black/70">
            <div className="flex items-center gap-3 border-b border-white/10 p-4">
              <Search className="h-5 w-5 text-[#cfede5]" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search articles, categories, links, accounts, actions..."
                className="h-8 min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/34"
              />
              {loading ? <Loader2 className="h-4 w-4 animate-spin text-white/50" /> : <Command className="h-4 w-4 text-white/38" />}
            </div>

            <div className="max-h-[68vh] overflow-y-auto p-3">
              {!loading && totalResults === 0 ? (
                <div className="p-8 text-center">
                  <Circle className="mx-auto mb-3 h-5 w-5 text-white/32" />
                  <p className="text-sm text-white/52">No matching archive entries or app actions.</p>
                </div>
              ) : (
                <div className="space-y-5">
                  <ResultSection title="Actions" items={data.actions} icon={Settings} onPick={() => setOpen(false)} />
                  {data.articles.length > 0 && (
                    <section>
                      <h2 className="mb-2 px-2 font-mono text-xs text-[#cfede5]">Articles</h2>
                      <div className="space-y-1">
                        {data.articles.map((item) => (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setOpen(false)}
                            className="group grid gap-1 rounded-xl px-3 py-3 transition-colors hover:bg-white/[.08]"
                          >
                            <div className="flex items-start gap-3">
                              <FileText className="mt-0.5 h-4 w-4 shrink-0 text-[#cfede5]" />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  {item.categoryColor && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.categoryColor }} />}
                                  <p className="truncate text-sm font-medium text-white">{item.title}</p>
                                </div>
                                <p className="mt-1 text-xs text-white/42">{[item.subtitle, formatDate(item.meta)].filter(Boolean).join(' · ')}</p>
                                {item.snippet && <p className="mt-2 text-sm leading-5 text-white/58">{truncate(item.snippet, 180)}</p>}
                              </div>
                              <ChevronRight className="mt-1 h-4 w-4 text-white/30 group-hover:text-white/70" />
                            </div>
                          </Link>
                        ))}
                      </div>
                    </section>
                  )}
                  <ResultSection title="Categories" items={data.categories} icon={Folder} onPick={() => setOpen(false)} />
                  <ResultSection title="X Accounts" items={data.accounts} icon={AtSign} onPick={() => setOpen(false)} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function ResultSection({
  title,
  items,
  icon: Icon,
  onPick,
}: {
  title: string
  items: ActionResult[] | SimpleResult[]
  icon: typeof Archive
  onPick: () => void
}) {
  if (items.length === 0) return null
  return (
    <section>
      <h2 className="mb-2 px-2 font-mono text-xs text-[#cfede5]">{title}</h2>
      <div className="space-y-1">
        {items.map((item) => (
          <Link key={`${title}-${item.href}-${item.title}`} href={item.href} onClick={onPick} className="group flex items-center gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-white/[.08]">
            <Icon className="h-4 w-4 shrink-0 text-[#cfede5]" />
            {'color' in item && item.color && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">{item.title}</p>
              <p className="mt-1 truncate text-xs text-white/42">{item.subtitle}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-white/30 group-hover:text-white/70" />
          </Link>
        ))}
      </div>
    </section>
  )
}
