import { Suspense } from 'react'
import { ResetPasswordClient } from './reset-password-client'


export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <Suspense fallback={null}>
        <ResetPasswordClient />
      </Suspense>
    </div>
  )
}
