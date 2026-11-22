import { connection } from 'next/server'
import Link from 'next/link'
import { auth, signOut } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { FileText, FolderTree, Plus, KeyRound, ShieldCheck, LogOut, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { GlobalSearch } from '@/components/global-search'


const nav = [
  { href: '/articles', label: 'Articles', icon: FileText },
  { href: '/extract', label: 'Extract', icon: Plus },
  { href: '/categories', label: 'Categories', icon: FolderTree },
  { href: '/accounts', label: 'X accounts', icon: KeyRound },
  { href: '/settings', label: 'Security', icon: ShieldCheck },
]

// Verify the session before rendering private archive navigation.
export const instant = false

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await connection()
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  const isAdmin = session.user.role === 'admin'

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-card/40 md:flex">
        <div className="flex h-14 items-center gap-2 border-b border-border px-5">
          <div className="h-6 w-6 rounded-md bg-primary" />
          <Link href="/articles" className="font-mono text-sm font-semibold">
            xTractor
          </Link>
        </div>
        <div className="border-b border-border p-3">
          <GlobalSearch />
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-fg transition-colors hover:bg-accent hover:text-fg"
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
          {isAdmin && (
            <Link
              href="/admin/users"
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-fg transition-colors hover:bg-accent hover:text-fg"
            >
              <Users className="h-4 w-4" />
              Users
            </Link>
          )}
        </nav>
        <div className="border-t border-border p-3">
          <div className="mb-2 px-3 text-xs text-muted-fg truncate">{session.user.email}</div>
          <form
            action={async () => {
              'use server'
              await signOut({ redirectTo: '/login' })
            }}
          >
            <Button type="submit" variant="ghost" size="sm" className="w-full justify-start text-muted-fg">
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </form>
        </div>
      </aside>

      {/* mobile top bar */}
      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-border px-4 md:hidden">
          <span className="font-mono text-sm font-semibold">xTractor</span>
          <form
            action={async () => {
              'use server'
              await signOut({ redirectTo: '/login' })
            }}
          >
            <Button type="submit" variant="ghost" size="icon" className="text-muted-fg">
              <LogOut className="h-4 w-4" />
            </Button>
          </form>
        </header>
        <div className="border-b border-border px-3 py-2 md:hidden">
          <GlobalSearch />
        </div>
        <nav className="flex gap-1 overflow-x-auto border-b border-border px-3 py-2 md:hidden">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="inline-flex h-8 shrink-0 items-center gap-2 rounded-md px-3 text-xs text-muted-fg hover:bg-accent hover:text-fg"
            >
              <item.icon className="h-3.5 w-3.5" />
              {item.label}
            </Link>
          ))}
          {isAdmin && (
            <Link
              href="/admin/users"
              className="inline-flex h-8 shrink-0 items-center gap-2 rounded-md px-3 text-xs text-muted-fg hover:bg-accent hover:text-fg"
            >
              <Users className="h-3.5 w-3.5" />
              Users
            </Link>
          )}
        </nav>
        <main className="flex-1 overflow-x-hidden">
          <div className="mx-auto w-full max-w-5xl px-4 py-8 md:px-8">{children}</div>
        </main>
      </div>
    </div>
  )
}
