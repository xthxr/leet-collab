# LeetCollab - Context

## 💡 Idea & Core Concept
**Elevator Pitch:** Streak accountability for LeetCode friends.

**The Problem & Solution:** 
Practicing LeetCode consistently is hard. LeetCollab gamifies accountability by leveraging peer pressure among friends. It's built for small groups (2–5 friends) who commit to solving at least one accepted LeetCode problem every single day. 

**The Catch:** 
If one person in the group misses a day, the **entire group's streak breaks**. This shared consequence ensures everyone stays motivated and nudges their friends to complete their daily problem.

---

## 🛠️ Technical Stack
**Frontend & Framework:**
*   **Next.js 15** (App Router)
*   **React 19**
*   **TypeScript** for type safety across the stack.
*   **Tailwind CSS (v4)** for styling.
*   **Lucide React** for icons.
*   **Zod** for schema validation.

**Backend as a Service (BaaS):**
*   **Supabase** handles the core backend infrastructure:
    *   **PostgreSQL Database**: Stores users, groups, streaks, and an email queue.
    *   **Auth**: Google OAuth handling (passwordless, quick onboarding).
    *   **Edge Functions**: Handles background tasks (like sending emails or checking daily deadlines).
    *   **pg_cron**: Schedules Edge Functions to run automatically.

**Email Delivery:**
*   **Resend** is used for transactional emails (e.g., reminders, nudges). Emails are queued in a database table and processed by an edge function to ensure retry logic and prevent duplicate sends.

---

## 🏗️ Architecture & Key Design Decisions

### 1. LeetCode Verification
Because LeetCode does not have an official public REST API, the project uses their **unofficial public GraphQL API** to verify a user's submissions. This logic is abstracted into a `LeetCodeService` so it can be easily swapped or updated if the unofficial API changes.

### 2. Deterministic Deadlines
The daily deadline for solving a problem is strictly set to **Midnight UTC** for everyone. 
*   *Why?* It keeps the database logic simple, consistent, and deterministic across all users regardless of their local timezone.

### 3. Server-Side Streak Calculation
Streaks are calculated using **Server-side Postgres functions**.
*   *Why?* This ensures the calculation is idempotent, deterministic, and free of race conditions that might occur if handled purely in client-side or Next.js API route logic.

### 4. Atomic Group Joins
Group membership has a strict cap. This is enforced directly via a database function (`join_group_by_invite`).
*   *Why?* It prevents race conditions where multiple users try to join a nearly full group simultaneously. 

### 5. Routing Structure
*   `/login`: Handles Google OAuth sign-in.
*   `/onboarding`: Where users link and verify their LeetCode username.
*   `/dashboard`: The main view showing the group's current streak and individual member statuses.
*   `/groups/new` & `/invite/[code]`: Flows for creating a group and joining via a shareable link.
*   `/api/leetcode`: Next.js Route Handlers for verifying LeetCode submissions and usernames securely.
*   `/api/nudge`: Route handlers for triggering nudge emails to lazy friends.
