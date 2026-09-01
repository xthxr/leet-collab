import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()

    // Retrieve user via the Authorization header or session cookie
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get active group memberships
    const { data: memberships } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('user_id', user.id)
      .eq('is_active', true)

    if (!memberships || memberships.length === 0) {
      return NextResponse.json({ current_streak: 0, completed_today: false })
    }

    const groupIds = memberships.map(m => m.group_id)

    // Fetch streaks for all active groups
    const { data: streaks } = await supabase
      .from('group_streaks')
      .select('current_streak')
      .in('group_id', groupIds)

    let maxStreak = 0
    if (streaks && streaks.length > 0) {
      maxStreak = Math.max(...streaks.map(s => s.current_streak))
    }

    // Determine today's date in IST
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric', month: '2-digit', day: '2-digit'
    })
    const parts = formatter.formatToParts(new Date())
    const p = Object.fromEntries(parts.map(pt => [pt.type, pt.value]))
    const today = `${p.year}-${p.month}-${p.day}`

    // Check if user completed a problem today in ANY of their active groups
    const { data: dailyActivities } = await supabase
      .from('daily_activity')
      .select('id')
      .eq('user_id', user.id)
      .eq('activity_date', today)
      .limit(1)

    const completedToday = dailyActivities !== null && dailyActivities.length > 0

    return NextResponse.json({
      current_streak: maxStreak,
      completed_today: completedToday
    })
  } catch (error) {
    console.error('Widget status error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
