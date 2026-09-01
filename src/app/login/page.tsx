import type { Metadata } from 'next'
import LoginForm from './_components/login-form'

export const metadata: Metadata = {
  title: 'Sign in',
  description: 'Sign in to LeetCollab with your Google account.',
}

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>
}) {
  return (
    <main className="min-h-dvh flex items-center justify-center px-6">
      <div className="w-full max-w-sm animate-scale-in">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-10">
          <span className="text-2xl">🔥</span>
          <span className="text-lg font-bold tracking-tight">LeetCollab</span>
        </div>

        <h1 className="text-2xl font-bold tracking-tight mb-2" style={{ letterSpacing: '-0.03em' }}>
          Welcome back
        </h1>
        <p className="text-fg-muted text-sm mb-8">
          Sign in to continue your streak.
        </p>

        <LoginForm searchParams={searchParams} />

        <p className="text-center text-xs text-fg-subtle mt-8 leading-relaxed">
          By signing in, you agree to our terms of service and privacy policy.
        </p>
      </div>
    </main>
  )
}
