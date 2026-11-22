import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ShieldCheck, TriangleAlert } from 'lucide-react'


export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams
  const ok = status === 'success'

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-2 text-center">
          {ok ? (
            <ShieldCheck className="mx-auto h-8 w-8 text-primary" />
          ) : (
            <TriangleAlert className="mx-auto h-8 w-8 text-muted-fg" />
          )}
          <CardTitle>{ok ? 'Email confirmed' : 'Link invalid'}</CardTitle>
          <CardDescription>
            {ok ? 'Your account is active. You can sign in now.' : 'This confirmation link is invalid or expired.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Link href={ok ? '/login' : '/signup'} className="text-sm text-fg underline-offset-4 hover:underline">
            {ok ? 'Sign in' : 'Create a new account'}
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
