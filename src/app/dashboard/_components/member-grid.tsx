'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { MemberStatus } from '@/types/database'

interface MemberGridProps {
  members: MemberStatus[]
  currentUserId: string
  groupId: string
  today: string
}

export default function MemberGrid({ members, currentUserId, groupId, today }: MemberGridProps) {
  const router = useRouter()
  const [nudgingId, setNudgingId] = useState<string | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [nudgedIds, setNudgedIds] = useState<Set<string>>(
    new Set(members.filter(m => m.nudged_today).map(m => m.user_id))
  )
  const [nudgeErrors, setNudgeErrors] = useState<Record<string, string>>({})
  
  const currentUserIsOwner = members.find(m => m.user_id === currentUserId)?.role === 'owner'

  async function handleRemove(targetUserId: string) {
    if (!confirm('Are you sure you want to remove this member?')) return

    setRemovingId(targetUserId)
    try {
      const res = await fetch('/api/groups/remove-member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group_id: groupId, user_id: targetUserId }),
      })
      if (res.ok) {
        router.refresh()
      } else {
        const data = await res.json()
        alert(data.error ?? 'Failed to remove member')
      }
    } catch {
      alert('Network error')
    } finally {
      setRemovingId(null)
    }
  }

  async function handleNudge(toUserId: string) {
    setNudgingId(toUserId)
    setNudgeErrors(prev => ({ ...prev, [toUserId]: '' }))

    try {
      const res = await fetch('/api/nudge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group_id: groupId, to_user_id: toUserId }),
      })
      const data = await res.json()

      if (res.ok) {
        setNudgedIds(prev => new Set([...prev, toUserId]))
      } else {
        setNudgeErrors(prev => ({ ...prev, [toUserId]: data.error ?? 'Failed' }))
      }
    } catch {
      setNudgeErrors(prev => ({ ...prev, [toUserId]: 'Network error' }))
    } finally {
      setNudgingId(null)
    }
  }

  return (
    <div className="card p-5 h-full">
      <div className="text-xs font-medium text-fg-subtle uppercase tracking-widest mb-4">
        Members — Today
      </div>
      <div className="space-y-3 stagger">
        {members.map((member) => {
          const isMe = member.user_id === currentUserId
          const canNudge = !isMe && !member.done_today && !nudgedIds.has(member.user_id)
          const alreadyNudged = nudgedIds.has(member.user_id)

          return (
            <div
              key={member.user_id}
              className="flex items-center justify-between animate-fade-in"
            >
              <div className="flex items-center gap-3">
                {/* Avatar */}
                <div className="relative">
                  {member.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={member.avatar_url}
                      alt={member.full_name ?? 'Member'}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-semibold text-fg-muted">
                      {(member.full_name ?? '?').charAt(0).toUpperCase()}
                    </div>
                  )}
                  {/* Status dot */}
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 status-dot ${
                      member.done_today ? 'done' : 'pending'
                    }`}
                    aria-hidden="true"
                  />
                </div>

                {/* Name + LeetCode */}
                <div>
                  <div className="text-sm font-medium leading-tight flex items-center gap-1.5">
                    {member.full_name ?? 'Unknown'}
                    {isMe && (
                      <span className="text-xs text-fg-subtle font-normal">(you)</span>
                    )}
                    {member.role === 'owner' && (
                      <span className="text-xs text-fg-subtle">👑</span>
                    )}
                  </div>
                  {member.leetcode_username && (
                    <div className="text-xs text-fg-subtle font-mono">
                      @{member.leetcode_username}
                    </div>
                  )}
                </div>
              </div>

              {/* Status + Nudge */}
              <div className="flex items-center gap-3">
                {/* Status label */}
                <span
                  className={`text-xs font-medium ${
                    member.done_today ? 'text-green-400' : 'text-fg-subtle'
                  }`}
                >
                  {member.done_today ? '✓ Done' : 'Pending'}
                </span>

                {/* Buttons container */}
                <div className="flex items-center gap-2">
                  {/* Nudge button */}
                  {!isMe && (
                    <button
                      onClick={() => canNudge && handleNudge(member.user_id)}
                      disabled={!canNudge || nudgingId === member.user_id}
                      title={
                        member.done_today
                          ? 'Already practiced'
                          : alreadyNudged
                          ? 'Nudge sent'
                          : 'Send a nudge'
                      }
                      className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${
                        member.done_today
                          ? 'border-zinc-800 text-zinc-700 cursor-default'
                          : alreadyNudged
                          ? 'border-zinc-800 text-zinc-600 cursor-default'
                          : 'border-zinc-700 text-fg-muted hover:border-zinc-600 hover:text-fg cursor-pointer'
                      } disabled:cursor-not-allowed`}
                    >
                      {nudgingId === member.user_id
                        ? '…'
                        : alreadyNudged
                        ? 'Nudged ✓'
                        : member.done_today
                        ? '—'
                        : 'Nudge'}
                    </button>
                  )}

                  {/* Remove button */}
                  {currentUserIsOwner && !isMe && (
                    <button
                      onClick={() => handleRemove(member.user_id)}
                      disabled={removingId === member.user_id}
                      title="Remove member"
                      className="text-xs px-2.5 py-1 rounded-md border border-red-900/30 text-red-500 hover:bg-red-950/30 hover:border-red-900/50 transition-colors disabled:opacity-50"
                    >
                      {removingId === member.user_id ? '...' : 'Remove'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
