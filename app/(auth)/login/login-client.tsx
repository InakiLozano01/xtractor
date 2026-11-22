'use client'
import { useId, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowRight, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export function LoginClient() {
  const formId = useId()
  const router = useRouter()
  const params = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const callbackUrl = params.get('callbackUrl') || '/articles'

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await signIn('credentials', { email, password, redirect: false })
    setLoading(false)
    if (res?.error) {
      toast.error('Invalid email, password, or unconfirmed account')
      return
    }
    router.push(callbackUrl)
    router.refresh()
  }

  return (
    <Card className="xtractor-rise mx-auto w-full max-w-md border-white/10 bg-[#111110] text-white shadow-2xl shadow-black/50">
      <CardHeader className="space-y-3">
        <Link href="/" className="font-mono text-sm font-semibold lg:hidden">
          xTractor
        </Link>
        <div className="h-10 w-10 rounded-xl bg-white" />
        <CardTitle className="text-2xl leading-tight">Sign in</CardTitle>
        <CardDescription className="text-white/56">Use your xTractor account to open the archive.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`${formId}-email`} className="text-white/78">Email</Label>
            <Input
              id={`${formId}-email`}
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="border-white/12 bg-black/25 text-white placeholder:text-white/32"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${formId}-password`} className="text-white/78">Password</Label>
            <Input
              id={`${formId}-password`}
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="border-white/12 bg-black/25 text-white"
            />
          </div>
          <Button type="submit" className="w-full bg-white text-black hover:bg-[#cfede5]" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
            Sign in
          </Button>
        </form>
        <div className="mt-4 flex items-center justify-between text-sm">
          <Link href="/signup" className="text-[#cfede5] underline-offset-4 hover:underline">
            Sign up
          </Link>
          <Link href="/forgot-password" className="text-white/52 underline-offset-4 hover:text-white hover:underline">
            Forgot password?
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
