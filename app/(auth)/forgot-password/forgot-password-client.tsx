'use client'

import { useId, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, MailCheck } from 'lucide-react'
import { toast } from 'sonner'

export function ForgotPasswordClient() {
  const formId = useId()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    setLoading(false)
    if (!res.ok) {
      toast.error('Could not send reset email')
      return
    }
    setSent(true)
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="space-y-2 text-center">
        {sent && <MailCheck className="mx-auto h-8 w-8 text-primary" />}
        <CardTitle className="text-xl">{sent ? 'Check your inbox' : 'Reset password'}</CardTitle>
        <CardDescription>
          {sent ? 'If that address exists, a reset link is on the way.' : 'Enter your email and we will send a one-time reset link.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!sent && (
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor={`${formId}-email`}>Email</Label>
              <Input id={`${formId}-email`} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Send reset link
            </Button>
          </form>
        )}
        <p className="mt-4 text-center text-sm text-muted-fg">
          <Link href="/login" className="text-fg underline-offset-4 hover:underline">
            Back to sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
