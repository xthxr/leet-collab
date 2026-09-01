// LeetCode GraphQL service
// Uses the unofficial public GraphQL endpoint.
// Abstracted behind an interface for easy future replacement.

export interface LeetCodeSubmission {
  id: string
  title: string
  titleSlug: string
  timestamp: string
  statusDisplay: string
  lang: string
}

export interface LeetCodeService {
  verifyUsername(username: string): Promise<boolean>
  getRecentAcSubmissions(username: string): Promise<LeetCodeSubmission[]>
  hasSubmittedToday(username: string): Promise<{ hasSubmitted: boolean; submission?: LeetCodeSubmission }>
}

const LEETCODE_GRAPHQL = 'https://leetcode.com/graphql'

const RECENT_AC_SUBMISSIONS_QUERY = `
  query recentAcSubmissions($username: String!, $limit: Int!) {
    recentAcSubmissionList(username: $username, limit: $limit) {
      id
      title
      titleSlug
      timestamp
      statusDisplay
      lang
    }
  }
`

const USER_PROFILE_QUERY = `
  query userPublicProfile($username: String!) {
    matchedUser(username: $username) {
      username
      submitStats {
        acSubmissionNum {
          difficulty
          count
          submissions
        }
      }
    }
  }
`

async function fetchLeetCode(query: string, variables: Record<string, unknown>) {
  const response = await fetch(LEETCODE_GRAPHQL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Referer': 'https://leetcode.com',
      'User-Agent': 'Mozilla/5.0',
    },
    body: JSON.stringify({ query, variables }),
    next: { revalidate: 0 }, // Never cache — always fresh
  })

  if (!response.ok) {
    throw new Error(`LeetCode GraphQL error: ${response.status}`)
  }

  return response.json()
}

export const leetCodeService: LeetCodeService = {
  async verifyUsername(username: string): Promise<boolean> {
    try {
      const data = await fetchLeetCode(USER_PROFILE_QUERY, { username })
      return !!data?.data?.matchedUser?.username
    } catch {
      return false
    }
  },

  async getRecentAcSubmissions(username: string): Promise<LeetCodeSubmission[]> {
    try {
      const data = await fetchLeetCode(RECENT_AC_SUBMISSIONS_QUERY, {
        username,
        limit: 20,
      })
      return data?.data?.recentAcSubmissionList ?? []
    } catch {
      return []
    }
  },

  async hasSubmittedToday(username: string): Promise<{ hasSubmitted: boolean; submission?: LeetCodeSubmission }> {
    try {
      const submissions = await this.getRecentAcSubmissions(username)

      // Get today's date boundaries in IST
      const now = new Date()
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric', month: '2-digit', day: '2-digit'
      })
      const parts = formatter.formatToParts(now)
      const p = Object.fromEntries(parts.map(p => [p.type, p.value]))
      const todayDateStr = `${p.year}-${p.month}-${p.day}`

      const todayStartIST = new Date(`${todayDateStr}T00:00:00+05:30`)
      const todayEndIST = new Date(`${todayDateStr}T23:59:59.999+05:30`)

      const todaySubmission = submissions.find((s) => {
        const submittedAt = new Date(parseInt(s.timestamp) * 1000)
        return submittedAt >= todayStartIST && submittedAt <= todayEndIST
      })

      return {
        hasSubmitted: !!todaySubmission,
        submission: todaySubmission,
      }
    } catch {
      return { hasSubmitted: false }
    }
  },
}
