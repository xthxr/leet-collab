import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import OnboardingForm from './_components/onboarding-form'

export const metadata: Metadata = {
  title: 'Set up your profile',
  description: 'Connect your LeetCode account to get started with LeetCollab.',
}

export default async function OnboardingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, leetcode_username, leetcode_verified')
    .eq('id', user.id)
    .single()

  // Already onboarded
  if (profile?.leetcode_verified) redirect('/dashboard')

  return (
    <main className="min-h-dvh flex items-center justify-center px-6">
      <div className="w-full max-w-sm animate-scale-in">
        <div className="flex items-center gap-2 mb-10">
          <span className="text-2xl">🔥</span>
          <span className="text-lg font-bold tracking-tight">LeetCollab</span>
        </div>

        <div className="mb-8">
          <p className="text-xs font-medium text-fg-subtle uppercase tracking-widest mb-2">Step 1 of 1</p>
          <h1 className="text-2xl font-bold tracking-tight mb-2" style={{ letterSpacing: '-0.03em' }}>
            Connect your LeetCode account
          </h1>
          <p className="text-fg-muted text-sm leading-relaxed">
            Enter your LeetCode username so we can verify your daily submissions.
            Your recent accepted submissions are public — no login required.
          </p>
        </div>

        <OnboardingForm userName={profile?.full_name ?? user.email ?? ''} />
      </div>
    </main>
  )
}
