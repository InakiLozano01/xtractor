'use client'
import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, FileDown, FileCode, Trash2, ExternalLink, MessagesSquare, Copy, FileText, Image as ImageIcon, Loader2 } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

type Article = {
  id: string
  tweetId: string
  url: string
  author: string | null
  title: string
  html: string
  pdfPath: string | null
  categoryId: string | null
  contentJson?: { thread?: unknown[]; threadCount?: number } | null
  status: string
  extractedAt: string
  createdAt: string
}
type Category = { id: string; name: string; color: string }

export default function ArticleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [article, setArticle] = useState<Article | null>(null)
  const [cats, setCats] = useState<Category[]>([])
  const [categoryId, setCategoryId] = useState('')
  const [copying, setCopying] = useState<'text' | 'images' | null>(null)

  useEffect(() => {
    fetch(`/api/articles/${id}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) {
          setArticle(d.article)
          setCategoryId(d.article.categoryId || '')
        }
      })
    fetch('/api/categories', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => setCats(d.categories || []))
  }, [id])

  async function setCategory(cid: string) {
    setCategoryId(cid)
    const res = await fetch(`/api/articles/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categoryId: cid || null }),
    })
    if (res.ok) toast.success('Category updated')
  }

  async function del() {
    if (!confirm('Delete this article permanently?')) return
    const res = await fetch(`/api/articles/${id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('Deleted')
      router.push('/articles')
    }
  }

  async function writeClipboard(text: string) {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return
    }
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.left = '-9999px'
    document.body.appendChild(textarea)
    textarea.focus()
    textarea.select()
    document.execCommand('copy')
    textarea.remove()
  }

  async function copyMarkdown(includeImages: boolean) {
    const mode = includeImages ? 'images' : 'text'
    setCopying(mode)
    try {
      const res = await fetch(`/api/articles/${id}/markdown?images=${includeImages ? '1' : '0'}`, { cache: 'no-store' })
      if (!res.ok) {
        toast.error('Markdown export failed')
        return
      }
      await writeClipboard(await res.text())
      toast.success(includeImages ? 'Markdown with images copied' : 'Text-only Markdown copied')
    } catch {
      toast.error('Could not copy Markdown')
    } finally {
      setCopying(null)
    }
  }

  if (!article) return <p className="text-sm text-muted-fg">Loading…</p>
  const threadCount = Array.isArray(article.contentJson?.thread)
    ? article.contentJson.thread.length
    : article.contentJson?.threadCount || 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/articles" className="inline-flex items-center text-sm text-muted-fg hover:text-fg">
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back
        </Link>
        <div className="flex gap-1">
          <a href={`/api/articles/${id}/pdf`} target="_blank" rel="noreferrer">
            <Button variant="outline" size="sm">
              <FileDown className="h-4 w-4" />
              PDF
            </Button>
          </a>
          <a href={`/api/articles/${id}/html`} target="_blank" rel="noreferrer">
            <Button variant="outline" size="sm">
              <FileCode className="h-4 w-4" />
              HTML
            </Button>
          </a>
          <a href={article.url} target="_blank" rel="noreferrer">
            <Button variant="ghost" size="sm">
              <ExternalLink className="h-4 w-4" />
              Source
            </Button>
          </a>
          <Button variant="ghost" size="sm" className="text-destructive" onClick={del}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          {article.author && <Badge variant="muted">@{article.author}</Badge>}
          {threadCount > 1 && (
            <Badge variant="outline" className="gap-1">
              <MessagesSquare className="h-3 w-3" />
              Complete thread · {threadCount} posts
            </Badge>
          )}
          <span className="text-xs text-muted-fg">{formatDate(article.extractedAt)}</span>
        </div>
        <h1 className="text-xl font-semibold leading-snug">{article.title}</h1>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-fg">Category:</span>
        <select
          value={categoryId}
          onChange={(e) => setCategory(e.target.value)}
          className="h-8 rounded-md border border-input bg-bg px-3 text-sm"
        >
          <option value="">None</option>
          {cats.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium">Markdown</p>
            <p className="mt-1 text-sm text-muted-fg">
              Copy or download this archive as `.md`, either text-only or with embedded image data.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:flex lg:flex-wrap lg:justify-end">
            <Button variant="outline" size="sm" onClick={() => copyMarkdown(false)} disabled={copying !== null}>
              {copying === 'text' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
              Copy text
            </Button>
            <Button variant="outline" size="sm" onClick={() => copyMarkdown(true)} disabled={copying !== null}>
              {copying === 'images' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
              Copy + images
            </Button>
            <a href={`/api/articles/${id}/markdown?images=0`} target="_blank" rel="noreferrer">
              <Button variant="outline" size="sm" className="w-full">
                <FileText className="h-4 w-4" />
                .md text
              </Button>
            </a>
            <a href={`/api/articles/${id}/markdown?images=1`} target="_blank" rel="noreferrer">
              <Button variant="outline" size="sm" className="w-full">
                <FileDown className="h-4 w-4" />
                .md + images
              </Button>
            </a>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <iframe
            srcDoc={article.html}
            title="Article preview"
            className="h-[70vh] w-full rounded-b-xl border-0"
            sandbox="allow-same-origin"
          />
        </CardContent>
      </Card>
    </div>
  )
}
