'use client'
import { useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, ShieldCheck, KeyRound } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { toast } from 'sonner'

type User = {
  id: string
  email: string
  name: string
  role: string
  emailVerifiedAt: string | null
  createdAt: string
}

export function AdminUsersClient() {
  const [users, setUsers] = useState<User[]>([])
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState('user')

  const load = useCallback(() => {
    return fetch('/api/admin/users', { cache: 'no-store' })
      .then(async (response) => response.ok ? response.json() : null)
      .then((data) => { if (data) setUsers(data.users || []) })
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name, role }),
    })
    if (!res.ok) {
      toast.error((await res.json()).error || 'Failed')
      return
    }
    toast.success('User created')
    setEmail('')
    setPassword('')
    setName('')
    setRole('user')
    load()
  }

  async function resetPassword(id: string) {
    const pw = prompt('Enter new password (min 10 chars, uppercase, lowercase, number):')
    if (!pw) return
    const res = await fetch(`/api/admin/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pw }),
    })
    if (res.ok) toast.success('Password reset')
  }

  async function del(id: string) {
    if (!confirm('Delete this user and all their data?')) return
    const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('Deleted')
      setUsers((u) => u.filter((x) => x.id !== id))
    } else {
      toast.error((await res.json()).error || 'Failed')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-primary" />
        <div>
          <h1 className="text-2xl font-semibold">Users</h1>
          <p className="text-sm text-muted-fg">Admin-only. Create and manage user accounts.</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pw">Password</Label>
              <Input id="pw" type="password" required minLength={10} value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-bg px-3 text-sm"
              >
                <option value="user">user</option>
                <option value="admin">admin</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <Button type="submit">
                <Plus className="h-4 w-4" />
                Create user
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {users.map((u) => (
          <Card key={u.id}>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{u.email}</span>
                  {u.role === 'admin' && <Badge variant="default">admin</Badge>}
                  {!u.emailVerifiedAt && <Badge variant="muted">unverified</Badge>}
                </div>
                <p className="mt-1 text-xs text-muted-fg">
                  {u.name || '-'} · joined {formatDate(u.createdAt)}
                </p>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => resetPassword(u.id)}>
                  <KeyRound className="h-4 w-4" />
                  Reset
                </Button>
                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => del(u.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
