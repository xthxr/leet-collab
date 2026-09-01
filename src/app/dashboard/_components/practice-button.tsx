'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface PracticeButtonProps {
  groupId: string
  alreadyDone: boolean
  leetcodeUsername: string
}

export default function PracticeButton({ groupId, alreadyDone, leetcodeUsername }: PracticeButtonProps) {
  const router = useRouter()
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'not_found' | 'error'>(
    alreadyDone ? 'done' : 'idle'
  )
  const [problemTitle, setProblemTitle] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  async function handleVerify() {
    if (status === 'loading' || status === 'done') return
    setStatus('loading')
    setErrorMsg('')

    try {
      const res = await fetch('/api/leetcode/verify-submission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group_id: groupId }),
      })
      const data = await res.json()

      if (data.verified) {
        setStatus('done')
        setProblemTitle(data.submission?.title ?? null)
        router.refresh() // Re-fetch server component data
      } else {
        setStatus('not_found')
        setErrorMsg(data.message ?? 'No submission found for today.')
      }
    } catch {
      setStatus('error')
      setErrorMsg('Connection error. Please try again.')
    }
  }

  if (status === 'done') {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-green-900/50 bg-green-950/20 px-4 py-3">
        <span className="text-green-400 text-base">✓</span>
        <div>
          <p className="text-sm font-medium text-green-400">Practice verified for today</p>
          {problemTitle && (
            <p className="text-xs text-green-600 mt-0.5">Solved: {problemTitle}</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <button
          onClick={handleVerify}
          disabled={status === 'loading'}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white text-zinc-900 text-sm font-semibold hover:bg-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {status === 'loading' ? (
            <>
              <Spinner />
              Checking LeetCode…
            </>
          ) : (
            <>
              <span>✓</span>
              Verify today&apos;s practice
            </>
          )}
        </button>

        <a
          href={`https://leetcode.com/problemset/`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-zinc-800 text-sm text-fg-muted hover:text-fg hover:border-zinc-700 transition-colors"
        >
          Practice on LeetCode ↗
        </a>
      </div>

      {(status === 'not_found' || status === 'error') && (
        <p className="text-xs text-fg-muted leading-relaxed">
          {errorMsg}{' '}
          {status === 'not_found' && (
            <span>
              Your profile is{' '}
              <a
                href={`https://leetcode.com/${leetcodeUsername}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-fg hover:underline"
              >
                @{leetcodeUsername}
              </a>
              .
            </span>
          )}
        </p>
      )}
    </div>
  )
}

function Spinner() {
  return (
    <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}
