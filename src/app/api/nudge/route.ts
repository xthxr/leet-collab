import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { buildNudgeEmail } from '@/lib/email/templates'
import { z } from 'zod'

const nudgeSchema = z.object({
  group_id: z.string().uuid(),
  to_user_id: z.string().uuid(),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = nudgeSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const { group_id, to_user_id } = parsed.data

    // Can't nudge yourself
    if (to_user_id === user.id) {
      return NextResponse.json({ error: 'Cannot nudge yourself' }, { status: 400 })
    }

    const serviceClient = await createServiceClient()

    // Verify both users are members
    const { data: members } = await serviceClient
      .from('group_members')
      .select('user_id')
      .eq('group_id', group_id)
      .eq('is_active', true)
      .in('user_id', [user.id, to_user_id])

    if (!members || members.length !== 2) {
      return NextResponse.json({ error: 'Not both in the same group' }, { status: 403 })
    }

    // Check target hasn't already practiced today
    const today = new Date().toISOString().split('T')[0]
    const { data: alreadyDone } = await serviceClient
      .from('daily_activity')
      .select('id')
      .eq('group_id', group_id)
      .eq('user_id', to_user_id)
      .eq('activity_date', today)
      .single()

    if (alreadyDone) {
      return NextResponse.json({ error: 'User has already practiced today' }, { status: 400 })
    }

    // Insert nudge (UNIQUE constraint handles rate limiting)
    const { error: nudgeError } = await serviceClient.from('nudges').insert({
      group_id,
      from_user_id: user.id,
      to_user_id,
      nudge_type: 'manual',
    })

    if (nudgeError) {
      if (nudgeError.code === '23505') {
        return NextResponse.json({ error: 'Already nudged today' }, { status: 429 })
      }
      return NextResponse.json({ error: 'Failed to send nudge' }, { status: 500 })
    }

    // Fetch data for email
    const [fromProfile, toProfile, group, streak] = await Promise.all([
      serviceClient.from('profiles').select('full_name').eq('id', user.id).single(),
      serviceClient.from('profiles').select('email, full_name, email_nudges').eq('id', to_user_id).single(),
      serviceClient.from('groups').select('name').eq('id', group_id).single(),
      serviceClient.from('group_streaks').select('current_streak').eq('group_id', group_id).single(),
    ])

    // Queue the email if recipient has nudge emails enabled
    if (toProfile.data?.email_nudges && toProfile.data?.email && group.data && fromProfile.data) {
      const { subject, html, text } = buildNudgeEmail({
        toName: toProfile.data.full_name ?? 'there',
        fromName: fromProfile.data.full_name ?? 'A teammate',
        groupName: group.data.name,
        currentStreak: streak.data?.current_streak ?? 0,
        appUrl: process.env.NEXT_PUBLIC_APP_URL!,
      })

      await serviceClient.from('email_queue').insert({
        recipient_email: toProfile.data.email,
        subject,
        html_body: html,
        text_body: text,
        email_type: 'nudge',
        status: 'pending',
        scheduled_for: new Date().toISOString(),
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Nudge error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
