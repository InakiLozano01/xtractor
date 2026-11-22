import Link from 'next/link'
import { Suspense } from 'react'
import { LoginClient } from './login-client'


export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#070707] text-white">
      <div className="mx-auto grid min-h-screen max-w-6xl items-center gap-10 px-5 py-10 lg:grid-cols-[.9fr_1fr]">
        <section className="hidden lg:block">
          <Link href="/" className="font-mono text-sm font-semibold">
            xTractor
          </Link>
          <div className="mt-16 max-w-md">
            <p className="font-mono text-xs text-[#cfede5]">returning archive</p>
            <h1 className="mt-4 text-5xl font-semibold leading-tight">Pick up where your research left off.</h1>
            <p className="mt-5 text-sm leading-6 text-white/58">
              Sign in to search saved articles, export PDFs, manage categories, and run new extractions.
            </p>
          </div>
          <div className="mt-10 rounded-2xl border border-white/10 bg-white/[.035] p-4">
            {['Search full article text', 'Open recent extractions', 'Change password in Security'].map((item) => (
              <div key={item} className="flex items-center gap-3 border-b border-white/10 py-3 text-sm text-white/70 last:border-0">
                <span className="h-1.5 w-1.5 rounded-full bg-[#cfede5]" />
                {item}
              </div>
            ))}
          </div>
        </section>
        <Suspense fallback={null}>
          <LoginClient />
        </Suspense>
      </div>
    </div>
  )
}
