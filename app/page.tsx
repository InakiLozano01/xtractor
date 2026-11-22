import { connection } from 'next/server'
import Link from 'next/link'
import {
  ArrowRight,
  Check,
  Database,
  FileCode,
  FileDown,
  KeyRound,
  LockKeyhole,
  Search,
  ShieldCheck,
  Sparkles,
  Tags,
} from 'lucide-react'
import { auth } from '@/lib/auth'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'


const archiveRows = [
  { title: 'Wiki memory for agents', author: '@hwchase17', tag: 'AI systems', state: 'PDF ready' },
  { title: 'Retrieval as continuous learning', author: '@vela_gao', tag: 'Memory', state: 'HTML saved' },
  { title: 'Operational notes on context rot', author: '@oliviaygu', tag: 'Research', state: 'Indexed' },
]

const searchResults = [
  ['Article', 'efficient retrieval', 'Found in title, body, and linked source text'],
  ['Category', 'Memory systems', '14 archived posts and X Articles'],
  ['Action', 'Extract URL', 'Open the extraction workflow'],
]

const workflow = ['Resolve X URL', 'Fetch with twscrape', 'Render HTML', 'Inline media', 'Write Postgres']

const featureCells = [
  {
    icon: Search,
    title: 'Search the whole archive',
    text: 'Find by body text, title, author, category, link, account, or app destination.',
    className: 'md:col-span-2',
  },
  {
    icon: FileDown,
    title: 'PDFs with images',
    text: 'Exports keep article media in the document, not as broken remote links.',
    className: '',
  },
  {
    icon: FileCode,
    title: 'Portable HTML',
    text: 'Download clean HTML with links parsed and media embedded.',
    className: '',
  },
  {
    icon: Database,
    title: 'Structured Postgres',
    text: 'Every extraction lands as searchable data, not just a screenshot.',
    className: '',
  },
  {
    icon: Tags,
    title: 'Categories that move',
    text: 'Sort research by project, thesis, source, or review queue.',
    className: 'md:col-span-2',
  },
]

const securityRows = [
  { icon: ShieldCheck, text: 'Email confirmation before login' },
  { icon: KeyRound, text: 'Password reset links are one-time use' },
  { icon: Sparkles, text: 'Returning users get a quieter sign-in path' },
]

// Read the current session before choosing the public or signed-in links.
export const instant = false

export default async function LandingPage() {
  await connection()
  const session = await auth()
  const signedIn = Boolean(session?.user?.id)

  return (
    <main className="min-h-screen overflow-hidden bg-[#070707] text-white">
      <section className="relative min-h-[88vh] border-b border-white/10">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.055)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.045)_1px,transparent_1px)] bg-[size:72px_72px]" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,#070707_0%,rgba(7,7,7,.97)_34%,rgba(7,7,7,.72)_100%)]" />

        <header className="relative z-10 mx-auto flex h-18 max-w-7xl items-center justify-between px-5 py-5 md:px-8">
          <Link href="/" className="font-mono text-sm font-semibold">
            xTractor
          </Link>
          <nav className="flex items-center gap-2">
            <Link href="/login" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'text-white/72 hover:bg-white/10 hover:text-white')}>
              Sign in
            </Link>
            {!signedIn && (
              <Link href="/signup" className={cn(buttonVariants({ size: 'sm' }), 'bg-white text-black hover:bg-[#cfede5]')}>
                Sign up
              </Link>
            )}
          </nav>
        </header>

        <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-10 px-5 pb-16 pt-8 md:grid-cols-[.86fr_1.14fr] md:px-8 md:pt-14">
          <div className="xtractor-rise max-w-2xl">
            <h1 className="text-5xl font-semibold leading-[1.02] text-white sm:text-6xl lg:text-7xl">xTractor</h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-white/72 sm:text-lg">
              Capture X posts and articles as searchable records, clean HTML, and image-perfect PDFs.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href={signedIn ? '/articles' : '/signup'} className={cn(buttonVariants({ size: 'lg' }), 'bg-[#cfede5] text-black hover:bg-white')}>
                {signedIn ? 'Open archive' : 'Sign up'}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/login" className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'border-white/20 text-white hover:bg-white/10 hover:text-white')}>
                Sign in
              </Link>
            </div>
          </div>

          <div className="xtractor-float relative min-w-0 max-w-full">
            <div className="absolute -inset-4 border border-white/[.035]" />
            <div className="relative min-w-0 overflow-hidden rounded-2xl border border-white/12 bg-[#111110] shadow-2xl shadow-black/60">
              <div className="xtractor-scan pointer-events-none absolute left-0 top-0 h-20 w-full bg-[linear-gradient(180deg,transparent,rgba(207,237,229,.16),transparent)]" />
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-[#cfede5]" />
                  <span className="font-mono text-xs text-white/62">live archive</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-white/48">
                  <span>PDF</span>
                  <span>HTML</span>
                  <span>DB</span>
                </div>
              </div>
              <div className="grid gap-0 lg:grid-cols-[240px_1fr]">
                <aside className="hidden border-r border-white/10 p-4 lg:block">
                  <div className="mb-4 flex h-9 items-center gap-2 rounded-lg border border-white/10 bg-black/25 px-3 text-xs text-white/48">
                    <Search className="h-3.5 w-3.5" />
                    memory retrieval
                  </div>
                  {['Memory systems', 'Agent traces', 'AI articles', 'Research'].map((item, index) => (
                    <div key={item} className={cn('mb-2 rounded-lg px-3 py-2 text-sm text-white/60', index === 0 && 'bg-white/10 text-white')}>
                      {item}
                    </div>
                  ))}
                </aside>
                <div className="p-4 sm:p-5">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-mono text-xs text-[#cfede5]">x.com/hwchase17/status/...</p>
                      <h2 className="mt-1 text-lg font-semibold">Wiki memory for agents</h2>
                    </div>
                    <div className="rounded-md border border-[#cfede5]/25 bg-[#cfede5]/10 px-2.5 py-1 text-xs text-[#cfede5]">extracted</div>
                  </div>
                  <div className="grid gap-2">
                    {archiveRows.map((row, index) => (
                      <div key={row.title} className="grid gap-3 rounded-xl border border-white/10 bg-black/25 p-3 sm:grid-cols-[1fr_auto]">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-medium">{row.title}</span>
                            <span className="rounded-full bg-[#cfede5]/12 px-2 py-0.5 text-xs text-[#cfede5]">{row.tag}</span>
                          </div>
                          <p className="mt-1 text-xs text-white/45">{row.author} · full body text indexed</p>
                        </div>
                        <div className={cn('font-mono text-xs text-white/55', index === 0 && 'text-[#cfede5]')}>{row.state}</div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 overflow-hidden rounded-xl border border-white/10 bg-[#070707]">
                    <div className="xtractor-slide flex w-[300%]">
                      {workflow.map((step, index) => (
                        <div key={step} className="flex w-1/5 items-center gap-2 px-4 py-3 text-xs text-white/62">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#cfede5] text-[11px] font-semibold text-black">{index + 1}</span>
                          {step}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-5 py-16 md:grid-cols-[.8fr_1.2fr] md:px-8">
        <div>
          <h2 className="text-3xl font-semibold leading-tight sm:text-4xl">Search everything you saved.</h2>
          <p className="mt-4 max-w-md text-sm leading-6 text-white/58">
            xTractor searches article text, authors, links, categories, accounts, and the app actions around them.
          </p>
        </div>
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[.035]">
          <div className="border-b border-white/10 p-4">
            <div className="flex h-11 items-center gap-3 rounded-lg border border-[#cfede5]/30 bg-[#cfede5]/10 px-3 text-sm text-white">
              <Search className="h-4 w-4 text-[#cfede5]" />
              memory retrieval
              <span className="ml-auto font-mono text-xs text-white/45">⌘K</span>
            </div>
          </div>
          <div className="divide-y divide-white/10">
            {searchResults.map(([type, title, text]) => (
              <div key={title} className="grid gap-2 p-4 sm:grid-cols-[110px_1fr]">
                <span className="font-mono text-xs text-[#cfede5]">{type}</span>
                <div>
                  <p className="text-sm font-medium">{title}</p>
                  <p className="mt-1 text-sm text-white/52">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-[#0c0c0b]">
        <div className="mx-auto grid max-w-7xl gap-4 px-5 py-14 md:grid-cols-4 md:px-8">
          {featureCells.map((item) => (
            <div key={item.title} className={cn('rounded-2xl border border-white/10 bg-[#111110] p-5', item.className)}>
              <item.icon className="mb-6 h-5 w-5 text-[#cfede5]" />
              <h3 className="text-base font-semibold">{item.title}</h3>
              <p className="mt-3 max-w-md text-sm leading-6 text-white/56">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 md:px-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr]">
          <div>
            <h2 className="max-w-xl text-3xl font-semibold leading-tight sm:text-4xl">Preserve the source, not just the screen.</h2>
            <p className="mt-4 max-w-lg text-sm leading-6 text-white/58">
              Every archive keeps the source URL, parsed links, media, category, exports, and raw structured content together.
            </p>
          </div>
          <div className="grid gap-3">
            {['Authenticated twscrape fetch', 'Article parser keeps links and images', 'PDF and HTML exports generated', 'Postgres record ready for search'].map((step, index) => (
              <div key={step} className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/[.03] p-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#cfede5] text-sm font-semibold text-black">{index + 1}</span>
                <span className="text-sm text-white/76">{step}</span>
                <Check className="ml-auto h-4 w-4 text-[#cfede5]" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-16 md:px-8">
        <div className="grid overflow-hidden rounded-2xl border border-white/10 bg-[#10100f] md:grid-cols-[1fr_.9fr]">
          <div className="p-6 sm:p-8">
            <LockKeyhole className="mb-8 h-6 w-6 text-[#cfede5]" />
            <h2 className="text-2xl font-semibold">Public signup, private archive.</h2>
            <p className="mt-4 max-w-xl text-sm leading-6 text-white/58">
              New users confirm email through your SMTP server. X cookies stay encrypted at rest and are only used for requested extractions.
            </p>
          </div>
          <div className="border-t border-white/10 p-6 sm:p-8 md:border-l md:border-t-0">
            <div className="space-y-3">
              {securityRows.map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-3 text-sm text-white/70">
                  <Icon className="h-4 w-4 text-[#cfede5]" />
                  {text}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-12 md:flex-row md:items-center md:justify-between md:px-8">
          <div>
            <h2 className="text-2xl font-semibold">Build a cleaner research archive.</h2>
            <p className="mt-2 text-sm text-white/56">Start with signup, or open the archive if you already have an account.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href={signedIn ? '/articles' : '/signup'} className={cn(buttonVariants({ size: 'lg' }), 'bg-[#cfede5] text-black hover:bg-white')}>
              {signedIn ? 'Open archive' : 'Sign up'}
            </Link>
            <Link href="/login" className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'border-white/20 text-white hover:bg-white/10 hover:text-white')}>
              Sign in
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
