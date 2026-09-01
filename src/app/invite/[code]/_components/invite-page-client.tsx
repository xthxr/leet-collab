'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  inviteCode: string
  isLoggedIn: boolean
  isMember?: boolean
}

export default function InvitePageClient({ inviteCode, isLoggedIn, isMember }: Props) {
  const router = useRouter()
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleJoin() {
    if (isMember) {
      router.push('/dashboard')
      return
    }

    if (!isLoggedIn) {
      router.push(`/login?next=/invite/${inviteCode}`)
      return
    }

    setStatus('loading')
    setErrorMsg('')

    try {
      const res = await fetch('/api/groups/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invite_code: inviteCode }),
      })
      const data = await res.json()

      if (res.ok || data.code === 'ALREADY_MEMBER') {
        router.push('/dashboard')
      } else if (data.code === 'NOT_VERIFIED') {
        router.push('/onboarding')
      } else {
        setStatus('error')
        setErrorMsg(
          data.code === 'GROUP_FULL'
            ? 'This group is full (5 members maximum).'
            : data.error ?? 'Failed to join group.'
        )
      }
    } catch {
      setStatus('error')
      setErrorMsg('Connection error. Please try again.')
    }
  }

  return (
    <div className="space-y-4">
      {status === 'error' && (
        <div className="rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-400">
          {errorMsg}
        </div>
      )}

      <button
        onClick={handleJoin}
        disabled={status === 'loading'}
        className="w-full py-3 rounded-lg bg-white text-zinc-900 text-sm font-semibold hover:bg-zinc-100 disabled:opacity-50 transition-colors"
      >
        {status === 'loading'
          ? 'Joining…'
          : isMember
          ? 'Go to dashboard →'
          : isLoggedIn
          ? 'Accept invite & join group →'
          : 'Sign in to join →'}
      </button>
    </div>
  )
}
