import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SettingsForm from './_components/settings-form'
import { signOut } from '@/features/auth/actions'

export const metadata: Metadata = {
  title: 'Settings',
}

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email, avatar_url, leetcode_username, leetcode_verified, email_nudges, email_reminders, timezone')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  // Get user's groups for group management section
  const { data: rawMemberships } = await supabase
    .from('group_members')
    .select('group_id, role')
    .eq('user_id', user.id)
    .eq('is_active', true)

  // Fetch group names separately
  const groupIds = (rawMemberships ?? []).map(m => m.group_id)
  const { data: groupData } = groupIds.length > 0
    ? await supabase.from('groups').select('id, name').in('id', groupIds)
    : { data: [] }

  const groupMap = Object.fromEntries((groupData ?? []).map(g => [g.id, g]))
  const memberships = (rawMemberships ?? []).map(m => ({
    group_id: m.group_id,
    role: m.role,
    groups: groupMap[m.group_id] ?? { id: m.group_id, name: 'Unknown group' },
  }))


  return (
    <div className="min-h-dvh">
      <nav className="border-b border-zinc-800/60 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <a href="/dashboard" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <span className="text-xl">🔥</span>
            <span className="font-bold tracking-tight text-base">LeetCollab</span>
          </a>
          <a href="/dashboard" className="text-sm text-fg-muted hover:text-fg transition-colors">
            ← Dashboard
          </a>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold tracking-tight mb-8" style={{ letterSpacing: '-0.03em' }}>
          Settings
        </h1>

        <SettingsForm
          profile={profile}
          memberships={memberships ?? []}
        />

        {/* Danger zone */}
        <div className="mt-12 pt-8 border-t border-zinc-800">
          <h2 className="text-sm font-medium text-red-400 mb-4">Account</h2>
          <form action={signOut}>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg border border-zinc-800 text-sm text-fg-muted hover:text-red-400 hover:border-red-900 transition-colors"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
