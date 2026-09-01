'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function OnboardingForm({ userName }: { userName: string }) {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    if (!username.trim()) return

    setStatus('loading')
    setErrorMsg('')

    try {
      const res = await fetch('/api/leetcode/verify-username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leetcode_username: username.trim() }),
      })
      const data = await res.json()

      if (data.valid) {
        setStatus('success')
        setTimeout(() => router.push('/dashboard'), 800)
      } else {
        setStatus('error')
        setErrorMsg(data.error ?? 'Username not found on LeetCode.')
      }
    } catch {
      setStatus('error')
      setErrorMsg('Connection error. Please try again.')
    }
  }

  return (
    <form onSubmit={handleVerify} className="space-y-4">
      <div>
        <label htmlFor="leetcode-username" className="block text-sm font-medium mb-2">
          LeetCode username
        </label>
        <input
          id="leetcode-username"
          type="text"
          value={username}
          onChange={(e) => {
            setUsername(e.target.value)
            setStatus('idle')
            setErrorMsg('')
          }}
          placeholder="e.g. neal_wu"
          autoComplete="off"
          autoFocus
          disabled={status === 'loading' || status === 'success'}
          className="w-full px-4 py-3 rounded-lg bg-zinc-900 border border-zinc-800 text-sm placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 disabled:opacity-50 transition-colors font-mono"
        />
        <p className="mt-2 text-xs text-fg-subtle">
          Find your username at{' '}
          <a
            href="https://leetcode.com/profile"
            target="_blank"
            rel="noopener noreferrer"
            className="text-fg-muted hover:text-fg transition-colors"
          >
            leetcode.com/profile
          </a>
        </p>
      </div>

      {status === 'error' && (
        <div className="rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-400">
          {errorMsg}
        </div>
      )}

      {status === 'success' && (
        <div className="rounded-lg border border-green-900/50 bg-green-950/30 px-4 py-3 text-sm text-green-400 flex items-center gap-2">
          <span>✓</span>
          <span>Verified! Redirecting to dashboard…</span>
        </div>
      )}

      <button
        type="submit"
        disabled={!username.trim() || status === 'loading' || status === 'success'}
        className="w-full py-3 px-4 rounded-lg bg-white text-zinc-900 font-semibold text-sm hover:bg-zinc-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {status === 'loading' ? (
          <span className="flex items-center justify-center gap-2">
            <Spinner />
            Verifying…
          </span>
        ) : (
          'Verify & continue →'
        )}
      </button>
    </form>
  )
}

function Spinner() {
  return (
    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}
