# LeetCollab 🔥

> Streak accountability for LeetCode friends. Solve at least one problem daily — together.

## Overview

LeetCollab is a production-quality web app for groups of 2–5 friends who want to hold each other accountable on LeetCode. Everyone in the group must solve at least one accepted LeetCode problem per day. If one person misses the day, the **entire group's streak breaks**.

**Stack:** Next.js 15 · TypeScript · Tailwind CSS · Supabase (Auth + PostgreSQL + Edge Functions) · Resend

---

## Setup

### 1. Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project
- A [Resend](https://resend.com) account (free tier works)
- Google OAuth credentials (from [Google Cloud Console](https://console.cloud.google.com))

### 2. Clone & install

```bash
git clone <repo>
cd leet-collab
npm install
```

### 3. Environment variables

```bash
cp .env.local.example .env.local
# Fill in your values
```

Required:
- `NEXT_PUBLIC_SUPABASE_URL` — from Supabase dashboard → Settings → API
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — same place
- `SUPABASE_SERVICE_ROLE_KEY` — same place (keep secret!)
- `RESEND_API_KEY` — from [resend.com/api-keys](https://resend.com/api-keys)
- `NEXT_PUBLIC_APP_URL` — `http://localhost:3000` for dev

### 4. Database migration

In Supabase dashboard → **SQL Editor**, paste and run the contents of:

```
supabase/migrations/001_initial.sql
```

This creates all tables, RLS policies, indexes, triggers, and database functions.

### 5. Google OAuth

1. [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → OAuth consent screen → Configure
2. Create OAuth 2.0 Client ID (Web application)
3. Authorized redirect URIs:
   - `http://localhost:3000/auth/callback` (dev)
   - `https://your-domain.com/auth/callback` (prod)
4. Supabase dashboard → Authentication → Providers → Google → paste Client ID & Secret

### 6. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Edge Functions (optional for local dev)

Edge functions handle background email sending and deadline reminders. For production:

```bash
# Install Supabase CLI
npm install -g supabase

# Deploy edge functions
supabase functions deploy send-emails
supabase functions deploy deadline-reminder

# Set env vars
supabase secrets set RESEND_API_KEY=your-key
supabase secrets set NEXT_PUBLIC_APP_URL=https://your-domain.com
```

Then in Supabase SQL Editor, enable `pg_cron` and schedule the functions (see commented SQL at bottom of `001_initial.sql`).

---

## Architecture

```
src/
├── app/
│   ├── login/              ← Google OAuth sign-in
│   ├── onboarding/         ← LeetCode username setup
│   ├── dashboard/          ← Main streak dashboard
│   ├── groups/new/         ← Create a group
│   ├── invite/[code]/      ← Public invite page
│   ├── settings/           ← Profile & preferences
│   └── api/
│       ├── leetcode/       ← verify-submission, verify-username
│       ├── groups/         ← create, join
│       ├── nudge/          ← send nudge + queue email
│       └── profile/        ← update profile
├── lib/
│   ├── supabase/           ← server + client helpers
│   ├── leetcode/           ← LeetCodeService (unofficial GraphQL)
│   └── email/              ← template builders + Resend
├── features/auth/          ← server actions (signIn, signOut)
└── types/database.ts       ← Full DB + app types

supabase/
├── migrations/001_initial.sql   ← All tables, RLS, functions
└── functions/
    ├── send-emails/         ← Processes email_queue (pg_cron every 5m)
    └── deadline-reminder/   ← Queues reminders (pg_cron at 21:00 UTC)
```

## Key Design Decisions

| Decision | Choice | Reason |
|---|---|---|
| Streak calculation | Server-side Postgres function | Idempotent, deterministic, no race conditions |
| LeetCode verification | Unofficial public GraphQL | No official API exists; abstracted for easy swap |
| Email delivery | Resend + email_queue table | Retry logic, no duplicate sends, observable |
| Daily deadline | Midnight UTC | Simple, consistent, deterministic for all users |
| Member cap enforcement | DB function (`join_group_by_invite`) | Atomic — prevents race condition on join |
| Auth | Google OAuth via Supabase | No password management; quick onboarding |

---

## License

MIT
