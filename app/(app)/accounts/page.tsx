'use client'
import { useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Cookie, ExternalLink, KeyRound, Plus, ShieldCheck, Trash2 } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { toast } from 'sonner'

const linkSteps = [
  'Open x.com in a separate browser tab and sign in there. Complete 2FA on X if your account asks for it.',
  'Open your browser developer tools on x.com, then find the Cookies storage for https://x.com.',
  'Copy the Value field for the auth_token cookie and paste it below.',
  'Copy the Value field for the ct0 cookie and paste it below.',
  'Add a label and your X username, then save the account.',
]

const browserPaths = [
  ['Chrome / Edge', 'DevTools -> Application -> Storage -> Cookies -> https://x.com'],
  ['Firefox', 'DevTools -> Storage -> Cookies -> https://x.com'],
  ['Safari', 'Develop -> Show Web Inspector -> Storage -> Cookies -> https://x.com'],
]

type Account = {
  id: string
  label: string
  accountName: string
  status: string
  errorMsg: string | null
  lastUsedAt: string | null
  createdAt: string
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [label, setLabel] = useState('')
  const [accountName, setAccountName] = useState('')
  const [authToken, setAuthToken] = useState('')
  const [ct0, setCt0] = useState('')
  const [loading, setLoading] = useState(false)

  const load = useCallback(() => {
    return fetch('/api/accounts', { cache: 'no-store' })
      .then(async (response) => response.ok ? response.json() : null)
      .then((data) => { if (data) setAccounts(data.accounts || []) })
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await fetch('/api/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label, accountName, authToken, ct0 }),
    })
    setLoading(false)
    if (!res.ok) {
      toast.error((await res.json()).error || 'Failed to add')
      return
    }
    toast.success('Account added')
    setLabel(''); setAccountName(''); setAuthToken(''); setCt0('')
    load()
  }

  async function del(id: string) {
    if (!confirm('Delete this account?')) return
    const res = await fetch(`/api/accounts/${id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('Deleted')
      setAccounts((a) => a.filter((x) => x.id !== id))
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">X accounts</h1>
        <p className="text-sm text-muted-fg">
          Log in to X in your browser, complete 2FA there, then add the session cookies. X passwords are not stored.
        </p>
      </div>

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Cookie className="h-4 w-4" />
            How to link your X/Twitter account
          </CardTitle>
          <CardDescription>
            xTractor uses the browser session you already created on X. Do not paste your X password here.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <ol className="grid gap-3 md:grid-cols-5">
            {linkSteps.map((step, index) => (
              <li key={step} className="rounded-lg border border-border bg-bg p-3">
                <span className="mb-3 flex h-7 w-7 items-center justify-center rounded-md bg-fg text-xs font-semibold text-bg">
                  {index + 1}
                </span>
                <p className="text-sm leading-5 text-muted-fg">{step}</p>
              </li>
            ))}
          </ol>

          <div className="grid gap-3 rounded-xl border border-border bg-muted/35 p-4 lg:grid-cols-[1fr_1fr]">
            <div>
              <h3 className="flex items-center gap-2 text-sm font-medium">
                <KeyRound className="h-4 w-4" />
                Browser paths
              </h3>
              <div className="mt-3 space-y-2">
                {browserPaths.map(([browser, path]) => (
                  <div key={browser} className="grid gap-1 text-sm sm:grid-cols-[120px_1fr]">
                    <span className="font-medium">{browser}</span>
                    <span className="font-mono text-xs leading-5 text-muted-fg">{path}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-3 text-sm leading-6 text-muted-fg">
              <p className="flex gap-2">
                <ShieldCheck className="mt-1 h-4 w-4 shrink-0 text-fg" />
                <span>
                  Only the <code className="font-mono text-xs text-fg">auth_token</code> and{' '}
                  <code className="font-mono text-xs text-fg">ct0</code> values are needed. They are encrypted before being stored.
                </span>
              </p>
              <p className="flex gap-2">
                <ExternalLink className="mt-1 h-4 w-4 shrink-0 text-fg" />
                <span>
                  If the cookies are missing, refresh x.com after signing in and select the exact{' '}
                  <code className="font-mono text-xs text-fg">https://x.com</code> cookie origin.
                </span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add account</CardTitle>
          <CardDescription>
            Paste the two cookie values from the signed-in X browser tab. Logging out of X can revoke them.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="label">Label</Label>
              <Input id="label" required value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Main account" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="acc">X username</Label>
              <Input id="acc" required value={accountName} onChange={(e) => setAccountName(e.target.value)} placeholder="yourname" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="at">auth_token</Label>
              <Input
                id="at"
                type="password"
                autoComplete="off"
                required
                value={authToken}
                onChange={(e) => setAuthToken(e.target.value)}
                placeholder="cookie value"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ct0">ct0</Label>
              <Input
                id="ct0"
                type="password"
                autoComplete="off"
                required
                value={ct0}
                onChange={(e) => setCt0(e.target.value)}
                placeholder="cookie value"
              />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={loading}>
                <Plus className="h-4 w-4" />
                Add account
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {accounts.length === 0 ? (
          <p className="text-sm text-muted-fg">No accounts yet.</p>
        ) : (
          accounts.map((a) => (
            <Card key={a.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{a.label}</span>
                    <Badge variant="outline">@{a.accountName}</Badge>
                    <Badge
                      variant={a.status === 'active' ? 'default' : a.status === 'error' ? 'outline' : 'muted'}
                    >
                      {a.status}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-fg">
                    {a.lastUsedAt ? `Last used ${formatDate(a.lastUsedAt)}` : 'Never used'}
                    {a.errorMsg ? ` · ${a.errorMsg}` : ''}
                  </p>
                </div>
                <Button variant="ghost" size="icon" className="text-muted-fg" onClick={() => del(a.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
