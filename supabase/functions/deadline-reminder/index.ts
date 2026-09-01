import { createClient } from 'jsr:@supabase/supabase-js@2'

const APP_URL = Deno.env.get('NEXT_PUBLIC_APP_URL') ?? 'https://leet-collab.dev'
const HOURS_LEFT = 3

Deno.serve(async (req: Request) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const todayUTC = new Date().toISOString().split('T')[0]

  // Find all active groups
  const { data: groups, error: groupsError } = await supabase
    .from('groups')
    .select('id, name')

  if (groupsError || !groups) {
    return new Response('Error fetching groups', { status: 500 })
  }

  let remindersQueued = 0

  for (const group of groups) {
    // Get all active members with email preferences
    const { data: members } = await supabase
      .from('group_members')
      .select(`
        user_id,
        profiles!inner(email, full_name, email_reminders, leetcode_verified)
      `)
      .eq('group_id', group.id)
      .eq('is_active', true)

    if (!members || members.length === 0) continue

    // Get who has already submitted today
    const { data: doneToday } = await supabase
      .from('daily_activity')
      .select('user_id')
      .eq('group_id', group.id)
      .eq('activity_date', todayUTC)

    const doneMemberIds = new Set((doneToday ?? []).map((d: { user_id: string }) => d.user_id))
    const pendingMembers = members.filter((m: { user_id: string }) => !doneMemberIds.has(m.user_id))

    // Skip groups where everyone is done
    if (pendingMembers.length === 0) continue

    // Get streak
    const { data: streak } = await supabase
      .from('group_streaks')
      .select('current_streak')
      .eq('group_id', group.id)
      .single()

    const currentStreak = streak?.current_streak ?? 0

    // Pending member names for the email
    const pendingNames = pendingMembers.map((m: { profiles: { full_name: string | null } }) =>
      m.profiles.full_name ?? 'A member'
    )

    // Queue reminder email for EACH pending member (who has reminders enabled)
    for (const member of pendingMembers) {
      const profile = member.profiles as {
        email: string
        full_name: string | null
        email_reminders: boolean
        leetcode_verified: boolean
      }
      if (!profile.email_reminders || !profile.leetcode_verified) continue

      // Build email content inline to avoid import issues in Edge Function
      const subject = `${HOURS_LEFT}h left — ${group.name} streak at risk 🔥`
      const pendingList = pendingNames.map((n: string) => `<span style="display:inline-block;padding:2px 8px;background:#1c1c1e;border:1px solid #27272a;border-radius:4px;font-size:13px;color:#a1a1aa;margin:2px">${n}</span>`).join(' ')
      const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>LeetCollab</title></head><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#09090b;color:#fafafa;margin:0;padding:0"><div style="max-width:560px;margin:0 auto;padding:48px 24px"><div style="font-size:18px;font-weight:700;color:#fafafa;letter-spacing:-0.03em;margin-bottom:40px">🔥 LeetCollab</div><div style="background:#18181b;border:1px solid #27272a;border-radius:12px;padding:32px"><h1 style="font-size:22px;font-weight:600;color:#fafafa;letter-spacing:-0.02em;margin:0 0 12px">${HOURS_LEFT} hours left to save the streak</h1><p style="font-size:15px;line-height:1.6;color:#a1a1aa;margin:0 0 16px">The <strong style="color:#fafafa">${group.name}</strong> streak will break at midnight UTC unless everyone practices.</p><hr style="border:none;border-top:1px solid #27272a;margin:24px 0"><p style="font-size:13px;color:#71717a;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 4px">Current streak</p><div style="font-size:40px;font-weight:800;color:#fafafa;letter-spacing:-0.04em;line-height:1">${currentStreak} days</div><p style="font-size:15px;color:#a1a1aa;margin:16px 0 8px">Still needs to practice:</p><p>${pendingList}</p><a href="${APP_URL}/dashboard" style="display:inline-block;margin-top:16px;padding:11px 22px;background:#fafafa;color:#09090b;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none;letter-spacing:-0.01em">Verify my practice →</a></div><div style="margin-top:32px;font-size:13px;color:#52525b;line-height:1.5"><p>To unsubscribe from reminders, update your <a href="${APP_URL}/settings" style="color:#a1a1aa">notification preferences</a>.</p></div></div></body></html>`
      const text = `${group.name} streak reminder (${currentStreak} days)\n\nStill needs to practice: ${pendingNames.join(', ')}\n\n${HOURS_LEFT} hours remaining. Verify: ${APP_URL}/dashboard`

      await supabase.from('email_queue').insert({
        recipient_email: profile.email,
        subject,
        html_body: html,
        text_body: text,
        email_type: 'reminder',
        status: 'pending',
        scheduled_for: new Date().toISOString(),
      })

      remindersQueued++
    }
  }

  return new Response(JSON.stringify({ remindersQueued, groups: groups.length }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
