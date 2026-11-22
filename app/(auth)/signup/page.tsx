import Link from 'next/link'
import { SignupClient } from './signup-client'


export default function SignupPage() {
  return (
    <div className="min-h-screen bg-[#070707] text-white">
      <div className="mx-auto grid min-h-screen max-w-6xl items-center gap-10 px-5 py-10 lg:grid-cols-[1fr_.95fr]">
        <section className="xtractor-rise">
          <Link href="/" className="font-mono text-sm font-semibold">
            xTractor
          </Link>
          <div className="mt-14 max-w-xl">
            <p className="font-mono text-xs text-[#cfede5]">new archive</p>
            <h1 className="mt-4 text-5xl font-semibold leading-tight">Create the account, confirm the email, start saving.</h1>
            <p className="mt-5 max-w-md text-sm leading-6 text-white/58">
              Signup is public, but every archive stays private behind verified email, encrypted X cookies, and your own login.
            </p>
          </div>
          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            {['Create account', 'Confirm email', 'Add X cookies'].map((item, index) => (
              <div key={item} className="rounded-xl border border-white/10 bg-white/[.035] p-4">
                <span className="font-mono text-xs text-[#cfede5]">0{index + 1}</span>
                <p className="mt-4 text-sm font-medium">{item}</p>
              </div>
            ))}
          </div>
        </section>
        <SignupClient />
      </div>
    </div>
  )
}
