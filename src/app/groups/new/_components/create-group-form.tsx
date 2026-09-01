'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function CreateGroupForm() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [inviteCode, setInviteCode] = useState('')
  const [copied, setCopied] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return

    setStatus('loading')
    setErrorMsg('')

    try {
      const res = await fetch('/api/groups/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      })
      const data = await res.json()

      if (res.ok && data.invite_code) {
        setInviteCode(data.invite_code)
        setStatus('success')
      } else {
        setStatus('error')
        setErrorMsg(data.error ?? 'Failed to create group.')
      }
    } catch {
      setStatus('error')
      setErrorMsg('Connection error. Please try again.')
    }
  }

  async function copyInviteLink() {
    const url = `${appUrl}/invite/${inviteCode}`
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (status === 'success') {
    const inviteUrl = `${appUrl}/invite/${inviteCode}`
    return (
      <div className="space-y-6 animate-scale-in">
        <div className="rounded-lg border border-green-900/50 bg-green-950/20 px-4 py-3">
          <p className="text-sm font-medium text-green-400">Group created! 🎉</p>
          <p className="text-xs text-green-600 mt-0.5">Share the invite link below with your friends.</p>
        </div>

        <div>
          <label className="block text-xs font-medium text-fg-subtle uppercase tracking-widest mb-2">
            Invite link
          </label>
          <div className="flex items-center gap-2">
            <div className="invite-code flex-1 truncate text-sm">{inviteUrl}</div>
            <button
              onClick={copyInviteLink}
              className="px-3 py-2 rounded-lg border border-zinc-800 text-xs text-fg-muted hover:text-fg hover:border-zinc-700 transition-colors whitespace-nowrap"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <p className="mt-2 text-xs text-fg-subtle">
            Anyone with this link can join your group (up to 5 members total).
          </p>
        </div>

        <button
          onClick={() => router.push('/dashboard')}
          className="w-full py-3 rounded-lg bg-white text-zinc-900 text-sm font-semibold hover:bg-zinc-100 transition-colors"
        >
          Go to dashboard →
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleCreate} className="space-y-5">
      <div>
        <label htmlFor="group-name" className="block text-sm font-medium mb-2">
          Group name
        </label>
        <input
          id="group-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. FAANG Grind, Algo Bros"
          maxLength={50}
          autoFocus
          disabled={status === 'loading'}
          className="w-full px-4 py-3 rounded-lg bg-zinc-900 border border-zinc-800 text-sm placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 disabled:opacity-50 transition-colors"
        />
        <p className="mt-1.5 text-xs text-fg-subtle text-right">{name.length}/50</p>
      </div>

      {status === 'error' && (
        <div className="rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-400">
          {errorMsg}
        </div>
      )}

      <button
        type="submit"
        disabled={!name.trim() || status === 'loading'}
        className="w-full py-3 rounded-lg bg-white text-zinc-900 text-sm font-semibold hover:bg-zinc-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {status === 'loading' ? 'Creating…' : 'Create group →'}
      </button>
    </form>
  )
}
