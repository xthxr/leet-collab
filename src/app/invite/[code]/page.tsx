import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import InvitePageClient from './_components/invite-page-client'

interface Props {
  params: Promise<{ code: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params
  const supabase = await createClient()
  const { data: group } = await supabase
    .from('groups')
    .select('name')
    .eq('invite_code', code)
    .single()

  return {
    title: group ? `Join ${group.name} on LeetCollab` : 'Join a streak group',
    description: 'Accept the invite and start your shared LeetCode streak.',
  }
}

export default async function InvitePage({ params }: Props) {
  const { code } = await params
  const supabase = await createClient()

  // Fetch group info (public — no auth needed to view)
  const { data: group } = await supabase
    .from('groups')
    .select('id, name, invite_code, created_at')
    .eq('invite_code', code)
    .single()

  if (!group) {
    return (
      <main className="min-h-dvh flex items-center justify-center px-6">
        <div className="text-center animate-fade-in">
          <div className="text-4xl mb-6">🤷</div>
          <h1 className="text-2xl font-bold tracking-tight mb-3">Invite not found</h1>
          <p className="text-fg-muted text-sm">This invite link may have expired or the group may be full.</p>
        </div>
      </main>
    )
  }

  // Get member count
  const { count } = await supabase
    .from('group_members')
    .select('*', { count: 'exact', head: true })
    .eq('group_id', group.id)
    .eq('is_active', true)

  // Get streak
  const { data: streak } = await supabase
    .from('group_streaks')
    .select('current_streak')
    .eq('group_id', group.id)
    .single()

  // Check if user is already logged in
  const { data: { user } } = await supabase.auth.getUser()

  let isMember = false
  if (user) {
    const { data: membership } = await supabase
      .from('group_members')
      .select('id')
      .eq('group_id', group.id)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()
    
    if (membership) isMember = true
  }

  return (
    <main className="min-h-dvh flex items-center justify-center px-6">
      <div className="w-full max-w-sm animate-scale-in">
        <div className="flex items-center gap-2 mb-10">
          <span className="text-2xl">🔥</span>
          <span className="text-lg font-bold tracking-tight">LeetCollab</span>
        </div>

        <div className="card p-6 mb-6">
          <div className="text-xs text-fg-subtle uppercase tracking-widest mb-4">You&apos;re invited to join</div>
          <h1 className="text-2xl font-bold tracking-tight mb-4" style={{ letterSpacing: '-0.03em' }}>
            {group.name}
          </h1>

          <div className="grid grid-cols-2 gap-4">
            <div className="border border-zinc-800 rounded-lg p-3">
              <div className="text-xs text-fg-subtle mb-1">Current streak</div>
              <div className="text-2xl font-bold streak-number">{streak?.current_streak ?? 0}</div>
              <div className="text-xs text-fg-muted">days</div>
            </div>
            <div className="border border-zinc-800 rounded-lg p-3">
              <div className="text-xs text-fg-subtle mb-1">Members</div>
              <div className="text-2xl font-bold streak-number">{count ?? 0}</div>
              <div className="text-xs text-fg-muted">of 5</div>
            </div>
          </div>
        </div>

        <InvitePageClient
          inviteCode={code}
          isLoggedIn={!!user}
          isMember={isMember}
        />

        <p className="text-xs text-fg-subtle text-center mt-6 leading-relaxed">
          Everyone in the group must solve at least 1 LeetCode problem per day.
          If anyone misses, the group streak breaks.
        </p>
      </div>
    </main>
  )
}
