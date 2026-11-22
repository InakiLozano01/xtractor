'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Download, MessagesSquare } from 'lucide-react'
import { toast } from 'sonner'

type Account = { id: string; label: string; accountName: string; status: string }
type Category = { id: string; name: string; color: string }

export default function ExtractPage() {
  const router = useRouter()
  const [url, setUrl] = useState('')
  const [accounts, setAccounts] = useState<Account[]>([])
  const [cats, setCats] = useState<Category[]>([])
  const [accountId, setAccountId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [includeThread, setIncludeThread] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/accounts', { cache: 'no-store' }).then((r) => r.json()),
      fetch('/api/categories', { cache: 'no-store' }).then((r) => r.json()),
    ]).then(([a, c]) => {
      setAccounts(a.accounts || [])
      setCats(c.categories || [])
      if ((a.accounts || []).length > 0) setAccountId(a.accounts[0].id)
    })
  }, [])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!accountId) {
      toast.error('Add an X account first')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, accountId, categoryId: categoryId || null, includeThread }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Extraction failed')
        return
      }
      toast.success(includeThread && data.threadCount > 1 ? `Extracted ${data.threadCount} thread posts` : 'Extracted successfully')
      router.push(`/articles/${data.id}`)
    } catch (err) {
      toast.error('Extraction failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Extract</h1>
        <p className="text-sm text-muted-fg">Paste an X/Twitter post URL, complete thread, or X Article URL to archive it.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">New extraction</CardTitle>
          <CardDescription>Saves to PDF, HTML, and your database.</CardDescription>
        </CardHeader>
        <CardContent>
          {accounts.length === 0 ? (
            <div className="rounded-md border border-dashed border-border p-6 text-center">
              <p className="text-sm text-muted-fg">No X accounts configured.</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => router.push('/accounts')}>
                Add an account
              </Button>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="url">X post URL</Label>
                <Input
                  id="url"
                  required
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://x.com/user/status/123456789"
                />
                <p className="text-xs text-muted-fg">Accepts status URLs, X Article URLs, or a bare post ID.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="account">X account</Label>
                <select
                  id="account"
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-bg px-3 text-sm"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.label} (@{a.accountName}) — {a.status}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cat">Category (optional)</Label>
                <select
                  id="cat"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-bg px-3 text-sm"
                >
                  <option value="">None</option>
                  {cats.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <label className="flex cursor-pointer gap-3 rounded-lg border border-border bg-muted/30 p-3">
                <input
                  type="checkbox"
                  checked={includeThread}
                  onChange={(e) => setIncludeThread(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-input"
                />
                <span className="min-w-0">
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <MessagesSquare className="h-4 w-4" />
                    Download complete thread
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-muted-fg">
                    Saves the author&apos;s self-reply chain as one HTML/PDF archive. Replies and comments from other users are excluded.
                  </span>
                </span>
              </label>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                {loading ? (includeThread ? 'Downloading thread… this can take a moment' : 'Extracting… this can take a moment') : 'Extract & save'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-fg">
        Use your own account responsibly. X/Twitter ToS discourage automated access. Cookies are stored
        encrypted at rest and used only to fetch the post you request.
      </p>
    </div>
  )
}
