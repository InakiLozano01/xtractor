'use client'

import { useId, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowRight, Loader2, MailCheck } from 'lucide-react'
import { toast } from 'sonner'

export function SignupClient() {
  const formId = useId()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    })
    setLoading(false)
    if (!res.ok) {
      toast.error((await res.json()).error || 'Could not create account')
      return
    }
    setSent(true)
  }

  if (sent) {
    return (
      <Card className="mx-auto w-full max-w-md border-white/10 bg-[#111110] text-white shadow-2xl shadow-black/50">
        <CardHeader className="text-center">
          <MailCheck className="mx-auto mb-2 h-8 w-8 text-[#cfede5]" />
          <CardTitle>Check your inbox</CardTitle>
          <CardDescription className="text-white/56">Confirm your email address to activate xTractor.</CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Link href="/login" className="text-sm text-[#cfede5] underline-offset-4 hover:underline">
            Back to sign in
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="xtractor-rise mx-auto w-full max-w-md border-white/10 bg-[#111110] text-white shadow-2xl shadow-black/50">
      <CardHeader className="space-y-3">
        <div className="h-10 w-10 rounded-xl bg-[#cfede5]" />
        <CardTitle className="text-2xl leading-tight">Sign up</CardTitle>
        <CardDescription className="text-white/56">Create an account, then confirm your email to activate it.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`${formId}-name`} className="text-white/78">Name</Label>
            <Input id={`${formId}-name`} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" className="border-white/12 bg-black/25 text-white" />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${formId}-email`} className="text-white/78">Email</Label>
            <Input id={`${formId}-email`} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" className="border-white/12 bg-black/25 text-white" />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${formId}-password`} className="text-white/78">Password</Label>
            <Input
              id={`${formId}-password`}
              type="password"
              required
              minLength={10}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              className="border-white/12 bg-black/25 text-white"
            />
            <p className="text-xs text-white/48">Use at least 10 characters with uppercase, lowercase, and a number.</p>
          </div>
          <Button type="submit" className="w-full bg-[#cfede5] text-black hover:bg-white" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
            Sign up
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-white/52">
          Already have an account?{' '}
          <Link href="/login" className="text-white underline-offset-4 hover:underline">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
