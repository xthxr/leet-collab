import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import CreateGroupForm from './_components/create-group-form'

export const metadata: Metadata = {
  title: 'Create a group',
}

export default async function NewGroupPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('leetcode_verified')
    .eq('id', user.id)
    .single()

  if (!profile?.leetcode_verified) redirect('/onboarding')

  return (
    <main className="min-h-dvh flex items-center justify-center px-6">
      <div className="w-full max-w-sm animate-scale-in">
        {/* Back */}
        <a href="/dashboard" className="text-sm text-fg-muted hover:text-fg transition-colors mb-10 block">
          ← Back to dashboard
        </a>

        <h1 className="text-2xl font-bold tracking-tight mb-2" style={{ letterSpacing: '-0.03em' }}>
          Create a streak group
        </h1>
        <p className="text-fg-muted text-sm mb-8 leading-relaxed">
          Give your group a name, then share the invite link with 1–4 friends.
          Everyone must practice daily — or the streak breaks for everyone.
        </p>

        <CreateGroupForm />
      </div>
    </main>
  )
}
