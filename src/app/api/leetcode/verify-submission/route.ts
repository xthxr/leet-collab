import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { leetCodeService } from '@/lib/leetcode/client'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { group_id } = body as { group_id: string }

    if (!group_id) {
      return NextResponse.json({ error: 'group_id required' }, { status: 400 })
    }

    // Get the user's LeetCode username
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('leetcode_username, leetcode_verified')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.leetcode_username || !profile.leetcode_verified) {
      return NextResponse.json({ error: 'LeetCode username not verified' }, { status: 400 })
    }

    // Verify membership
    const { data: membership } = await supabase
      .from('group_members')
      .select('id')
      .eq('group_id', group_id)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'Not a group member' }, { status: 403 })
    }

    // Check if already verified today
    const today = new Date().toISOString().split('T')[0]
    const { data: existing } = await supabase
      .from('daily_activity')
      .select('id, problem_title')
      .eq('group_id', group_id)
      .eq('user_id', user.id)
      .eq('activity_date', today)
      .single()

    if (existing) {
      return NextResponse.json({
        verified: true,
        already_verified: true,
        problem_title: existing.problem_title,
      })
    }

    // Check LeetCode for today's submission
    const { hasSubmitted, submission } = await leetCodeService.hasSubmittedToday(
      profile.leetcode_username
    )

    if (!hasSubmitted || !submission) {
      return NextResponse.json({
        verified: false,
        message: "No accepted submission found for today (UTC). Solve a problem on LeetCode first.",
      })
    }

    // Record the activity using service client (bypasses RLS for the recalculation)
    const serviceClient = await createServiceClient()

    // Insert daily activity
    const { error: activityError } = await serviceClient
      .from('daily_activity')
      .insert({
        group_id,
        user_id: user.id,
        activity_date: today,
        submission_id: submission.id,
        problem_title: submission.title,
        problem_slug: submission.titleSlug,
        language: submission.lang,
      })

    if (activityError && activityError.code !== '23505') {
      // 23505 = unique violation (already inserted) — safe to ignore
      console.error('Activity insert error:', activityError)
      return NextResponse.json({ error: 'Failed to record activity' }, { status: 500 })
    }

    // Trigger streak recalculation
    await serviceClient.rpc('recalculate_group_streak', { p_group_id: group_id })

    return NextResponse.json({
      verified: true,
      submission: {
        title: submission.title,
        lang: submission.lang,
        titleSlug: submission.titleSlug,
      },
    })
  } catch (error) {
    console.error('Verify submission error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
