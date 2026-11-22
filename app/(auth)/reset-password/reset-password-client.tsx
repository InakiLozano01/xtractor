'use client'

import { useId, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'

export function ResetPasswordClient() {
  const formId = useId()
  const params = useSearchParams()
  const token = params.get('token') || ''
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
    })
    setLoading(false)
    if (!res.ok) {
      toast.error((await res.json()).error || 'Could not reset password')
      return
    }
    setDone(true)
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="space-y-2 text-center">
        {done && <ShieldCheck className="mx-auto h-8 w-8 text-primary" />}
        <CardTitle className="text-xl">{done ? 'Password updated' : 'Choose a new password'}</CardTitle>
        <CardDescription>
          {done ? 'You can sign in with the new password now.' : 'Reset links are one-time use and expire after one hour.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!done && token && (
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor={`${formId}-password`}>New password</Label>
              <Input
                id={`${formId}-password`}
                type="password"
                required
                minLength={10}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
              <p className="text-xs text-muted-fg">Use at least 10 characters with uppercase, lowercase, and a number.</p>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Update password
            </Button>
          </form>
        )}
        {!token && !done && <p className="text-center text-sm text-muted-fg">This reset link is missing a token.</p>}
        <p className="mt-4 text-center text-sm text-muted-fg">
          <Link href="/login" className="text-fg underline-offset-4 hover:underline">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
