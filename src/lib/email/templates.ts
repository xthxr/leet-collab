import { Resend } from 'resend'

const FROM_EMAIL = 'LeetCollab <noreply@leet-collab.dev>'

// Lazy client — not instantiated at module load (avoids build errors when key is absent)
function getResend() {
  return new Resend(process.env.RESEND_API_KEY)
}

// ============================================================
// Email Templates
// ============================================================

function baseTemplate(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LeetCollab</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #09090b; color: #fafafa; }
    .container { max-width: 560px; margin: 0 auto; padding: 48px 24px; }
    .logo { font-size: 18px; font-weight: 700; color: #fafafa; letter-spacing: -0.03em; margin-bottom: 40px; display: flex; align-items: center; gap: 8px; }
    .logo-icon { font-size: 20px; }
    .card { background: #18181b; border: 1px solid #27272a; border-radius: 12px; padding: 32px; }
    h1 { font-size: 22px; font-weight: 600; line-height: 1.3; color: #fafafa; letter-spacing: -0.02em; margin-bottom: 12px; }
    p { font-size: 15px; line-height: 1.6; color: #a1a1aa; margin-bottom: 16px; }
    .highlight { color: #fafafa; font-weight: 500; }
    .btn { display: inline-block; margin-top: 8px; padding: 11px 22px; background: #fafafa; color: #09090b; border-radius: 8px; font-size: 14px; font-weight: 600; text-decoration: none; letter-spacing: -0.01em; }
    .streak { font-size: 40px; font-weight: 800; color: #fafafa; letter-spacing: -0.04em; line-height: 1; }
    .divider { border: none; border-top: 1px solid #27272a; margin: 24px 0; }
    .footer { margin-top: 32px; font-size: 13px; color: #52525b; line-height: 1.5; }
    .badge { display: inline-block; padding: 2px 8px; background: #1c1c1e; border: 1px solid #27272a; border-radius: 4px; font-size: 13px; color: #a1a1aa; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo"><span class="logo-icon">🔥</span> LeetCollab</div>
    <div class="card">
      ${content}
    </div>
    <div class="footer">
      <p>You received this because you're a member of a LeetCollab streak group. To unsubscribe from nudge emails, update your <a href="${process.env.NEXT_PUBLIC_APP_URL}/settings" style="color: #a1a1aa;">notification preferences</a>.</p>
    </div>
  </div>
</body>
</html>`
}

export function buildNudgeEmail({
  toName,
  fromName,
  groupName,
  currentStreak,
  appUrl,
}: {
  toName: string
  fromName: string
  groupName: string
  currentStreak: number
  appUrl: string
}): { subject: string; html: string; text: string } {
  const subject = `${fromName} wants you to keep the streak alive 🔥`
  const html = baseTemplate(`
    <h1>Time to practice 👋</h1>
    <p><span class="highlight">${fromName}</span> sent you a nudge — the <span class="highlight">${groupName}</span> streak is on the line.</p>
    <hr class="divider">
    <p style="margin-bottom: 4px; font-size: 13px; color: #71717a; text-transform: uppercase; letter-spacing: 0.05em;">Current streak</p>
    <div class="streak">${currentStreak} days</div>
    <p style="margin-top: 16px;">Solve any LeetCode problem today to keep it going. You've got this.</p>
    <a href="${appUrl}/dashboard" class="btn">Practice on LeetCode →</a>
  `)
  const text = `${fromName} nudged you to practice on LeetCollab.\n\nCurrent streak: ${currentStreak} days\n\nSolve any problem today: ${appUrl}/dashboard`
  return { subject, html, text }
}

export function buildReminderEmail({
  toName,
  groupName,
  currentStreak,
  pendingMembers,
  hoursLeft,
  appUrl,
}: {
  toName: string
  groupName: string
  currentStreak: number
  pendingMembers: string[]
  hoursLeft: number
  appUrl: string
}): { subject: string; html: string; text: string } {
  const subject = `${hoursLeft}h left — ${groupName} streak at risk 🔥`
  const pendingList = pendingMembers.map(n => `<span class="badge">${n}</span>`).join(' ')
  const html = baseTemplate(`
    <h1>${hoursLeft} hours left to save the streak</h1>
    <p>The <span class="highlight">${groupName}</span> streak will break at midnight UTC unless everyone practices.</p>
    <hr class="divider">
    <p style="margin-bottom: 4px; font-size: 13px; color: #71717a; text-transform: uppercase; letter-spacing: 0.05em;">Current streak</p>
    <div class="streak">${currentStreak} days</div>
    <p style="margin-top: 16px; margin-bottom: 8px;">Still needs to practice:</p>
    <p>${pendingList}</p>
    <a href="${appUrl}/dashboard" class="btn">Verify my practice →</a>
  `)
  const text = `${groupName} streak reminder (${currentStreak} days)\n\nStill needs to practice: ${pendingMembers.join(', ')}\n\n${hoursLeft} hours remaining. Verify: ${appUrl}/dashboard`
  return { subject, html, text }
}

// ============================================================
// Send email via Resend
// ============================================================

export async function sendEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string
  subject: string
  html: string
  text?: string
}) {
  return getResend().emails.send({
    from: FROM_EMAIL,
    to,
    subject,
    html,
    text,
  })
}
