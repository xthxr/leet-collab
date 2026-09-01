import { createClient } from 'jsr:@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const FROM_EMAIL = 'LeetCollab <noreply@leet-collab.dev>'
const BATCH_SIZE = 10

Deno.serve(async (req: Request) => {
  // Verify this is called from pg_cron / authorized source
  const authHeader = req.headers.get('Authorization')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!authHeader || !authHeader.includes(serviceKey?.slice(0, 20) ?? '')) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Fetch pending emails (scheduled_for <= now, attempts < 3)
  const { data: emails, error } = await supabase
    .from('email_queue')
    .select('*')
    .eq('status', 'pending')
    .lte('scheduled_for', new Date().toISOString())
    .lt('attempts', 3)
    .order('created_at', { ascending: true })
    .limit(BATCH_SIZE)

  if (error) {
    console.error('Fetch email queue error:', error)
    return new Response('Error', { status: 500 })
  }

  if (!emails || emails.length === 0) {
    return new Response(JSON.stringify({ processed: 0 }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let sent = 0
  let failed = 0

  for (const email of emails) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: email.recipient_email,
          subject: email.subject,
          html: email.html_body,
          text: email.text_body ?? undefined,
        }),
      })

      if (res.ok) {
        await supabase
          .from('email_queue')
          .update({ status: 'sent', sent_at: new Date().toISOString() })
          .eq('id', email.id)
        sent++
      } else {
        const errorText = await res.text()
        await supabase
          .from('email_queue')
          .update({
            attempts: email.attempts + 1,
            last_attempted: new Date().toISOString(),
            error_message: errorText.slice(0, 500),
            status: email.attempts + 1 >= 3 ? 'failed' : 'pending',
          })
          .eq('id', email.id)
        failed++
      }
    } catch (err) {
      await supabase
        .from('email_queue')
        .update({
          attempts: email.attempts + 1,
          last_attempted: new Date().toISOString(),
          error_message: String(err).slice(0, 500),
          status: email.attempts + 1 >= 3 ? 'failed' : 'pending',
        })
        .eq('id', email.id)
      failed++
    }
  }

  return new Response(JSON.stringify({ processed: emails.length, sent, failed }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
