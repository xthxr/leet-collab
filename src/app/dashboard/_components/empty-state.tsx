'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function EmptyState() {
  const router = useRouter()
  const [inviteLink, setInviteLink] = useState('')
  const [isJoining, setIsJoining] = useState(false)

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteLink.trim()) return

    setIsJoining(true)
    
    let code = inviteLink.trim()
    try {
      if (code.includes('/invite/')) {
        const url = new URL(code.startsWith('http') ? code : `https://${code}`)
        const parts = url.pathname.split('/')
        code = parts[parts.length - 1]
      }
    } catch {
      if (code.includes('/invite/')) {
        code = code.split('/invite/')[1]
      }
    }

    if (code) {
      router.push(`/invite/${code}`)
    } else {
      setIsJoining(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center py-24 text-center animate-fade-in">
      <div className="text-4xl mb-6">🔥</div>
      <h2 className="text-xl font-semibold tracking-tight mb-3">No streak groups yet</h2>
      <p className="text-fg-muted text-sm max-w-sm leading-relaxed mb-8">
        Create a group and invite 1–4 friends, or join an existing group with an invite link.
      </p>
      
      <div className="flex flex-col gap-6 w-full max-w-sm">
        <Link
          href="/groups/new"
          className="w-full px-5 py-2.5 rounded-lg bg-white text-zinc-900 text-sm font-semibold hover:bg-zinc-100 transition-colors"
        >
          Create a group
        </Link>
        
        <div className="relative flex items-center py-1">
          <div className="flex-grow border-t border-zinc-800"></div>
          <span className="flex-shrink-0 mx-4 text-zinc-500 text-xs uppercase tracking-wider">or</span>
          <div className="flex-grow border-t border-zinc-800"></div>
        </div>

        <form onSubmit={handleJoin} className="flex gap-2">
          <input
            type="text"
            placeholder="Paste invite link or code..."
            value={inviteLink}
            onChange={(e) => setInviteLink(e.target.value)}
            className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-zinc-600 transition-colors"
          />
          <button
            type="submit"
            disabled={!inviteLink.trim() || isJoining}
            className="px-4 py-2 rounded-lg bg-zinc-800 text-white text-sm font-medium hover:bg-zinc-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isJoining ? '...' : 'Join'}
          </button>
        </form>
      </div>
    </div>
  )
}
