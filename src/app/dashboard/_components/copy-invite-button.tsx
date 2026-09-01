'use client'

import { useState } from 'react'

export default function CopyInviteButton({ inviteCode }: { inviteCode: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      const url = `${window.location.origin}/invite/${inviteCode}`
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy invite link', err)
    }
  }

  return (
    <button
      onClick={handleCopy}
      className="text-xs text-fg-subtle hover:text-fg-muted transition-colors border border-zinc-800 rounded-md px-3 py-1.5 flex items-center gap-2"
    >
      {copied ? 'Copied!' : 'Copy invite link'}
    </button>
  )
}
