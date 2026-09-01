import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { GroupDashboard } from '@/types/database'
import StreakCard from './_components/streak-card'
import MemberGrid from './_components/member-grid'
import PracticeButton from './_components/practice-button'
import EmptyState from './_components/empty-state'
import CopyInviteButton from './_components/copy-invite-button'

export const metadata: Metadata = {
  title: 'Dashboard',
}

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, avatar_url, leetcode_username, leetcode_verified')
    .eq('id', user.id)
    .single()

  if (!profile?.leetcode_verified) redirect('/onboarding')

  // Get user's group memberships
  const { data: memberships } = await supabase
    .from('group_members')
    .select('group_id')
    .eq('user_id', user.id)
    .eq('is_active', true)

  const groupIds = (memberships ?? []).map(m => m.group_id)

  // Fetch full dashboard data for each group
  const dashboards: GroupDashboard[] = []

  for (const groupId of groupIds) {
    const { data } = await supabase.rpc('get_group_dashboard', {
      p_group_id: groupId,
      p_user_id: user.id,
    })
    if (data) dashboards.push(data as unknown as GroupDashboard)
  }

  const now = new Date()
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false
  })
  const parts = formatter.formatToParts(now)
  const p = Object.fromEntries(parts.map(p => [p.type, p.value]))
  
  const todayStr = `${p.year}-${p.month}-${p.day}`
  const hoursLeft = 24 - parseInt(p.hour, 10) - (parseInt(p.minute, 10) > 0 ? 1 : 0)

  return (
    <div className="min-h-dvh">
      {/* Top nav */}
      <nav className="border-b border-zinc-800/60 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🔥</span>
            <span className="font-bold tracking-tight text-base">LeetCollab</span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/groups/new"
              className="text-sm text-fg-muted hover:text-fg transition-colors"
            >
              + New group
            </Link>
            <Link
              href="/settings"
              className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-semibold hover:bg-zinc-700 transition-colors"
              title="Settings"
            >
              {profile.full_name?.charAt(0).toUpperCase() ?? '?'}
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-10">
        {/* Deadline banner */}
        <div className="mb-8 flex items-center justify-between rounded-lg border border-zinc-800/60 bg-zinc-900/40 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
            <span className="text-sm text-fg-muted">
              Daily deadline: <span className="text-fg font-medium">midnight IST</span>
            </span>
          </div>
          <span className="text-sm font-mono text-fg-muted">
            {hoursLeft}h remaining
          </span>
        </div>

        {groupIds.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-10">
            {dashboards.map((dashboard) => {
              const myStatus = dashboard.members?.find(m => m.user_id === user.id)
              const doneTodayCount = dashboard.members?.filter(m => m.done_today).length ?? 0
              const totalCount = dashboard.members?.length ?? 0
              const allDone = doneTodayCount === totalCount && totalCount > 0
              const myDoneToday = myStatus?.done_today ?? false

              return (
                <section key={dashboard.group.id} className="animate-fade-in">
                  {/* Group header */}
                  <div className="flex items-start justify-between mb-5">
                    <div>
                      <h2 className="text-lg font-semibold tracking-tight">
                        {dashboard.group.name}
                      </h2>
                      <p className="text-sm text-fg-muted mt-0.5">
                        {doneTodayCount}/{totalCount} practiced today
                        {allDone && ' · 🎉 All done!'}
                      </p>
                    </div>
                    {/* Invite link */}
                    {myStatus?.role === 'owner' && (
                      <CopyInviteButton inviteCode={dashboard.group.invite_code} />
                    )}
                  </div>

                  {/* Streak + Members grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
                    <StreakCard
                      currentStreak={dashboard.streak?.current_streak ?? 0}
                      longestStreak={dashboard.streak?.longest_streak ?? 0}
                      lastActiveDate={dashboard.streak?.last_active_date}
                      brokenAt={dashboard.streak?.broken_at}
                    />
                    <div className="lg:col-span-2">
                      <MemberGrid
                        members={dashboard.members ?? []}
                        currentUserId={user.id}
                        groupId={dashboard.group.id}
                        today={todayStr}
                      />
                    </div>
                  </div>

                  {/* Practice CTA */}
                  <PracticeButton
                    groupId={dashboard.group.id}
                    alreadyDone={myDoneToday}
                    leetcodeUsername={profile.leetcode_username ?? ''}
                  />
                </section>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
