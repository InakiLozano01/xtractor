import { connection } from 'next/server'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { AdminUsersClient } from './users-client'


// Check the current admin role on every visit.
export const instant = false

export default async function AdminUsersPage() {
  await connection()
  const session = await auth()
  if (session?.user?.role !== 'admin') redirect('/articles')

  return <AdminUsersClient />
}
