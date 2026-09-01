'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Profile } from '@/types/database'

interface Membership {
  group_id: string
  role: string
  groups: { id: string; name: string }
}

interface SettingsFormProps {
  profile: Pick<Profile, 'full_name' | 'email' | 'avatar_url' | 'leetcode_username' | 'leetcode_verified' | 'email_nudges' | 'email_reminders' | 'timezone'>
  memberships: Membership[]
}

export default function SettingsForm({ profile, memberships }: SettingsFormProps) {
  const router = useRouter()

  // Profile
  const [fullName, setFullName] = useState(profile.full_name ?? '')
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileSaved, setProfileSaved] = useState(false)

  // LeetCode
  const [leetcodeUsername, setLeetcodeUsername] = useState(profile.leetcode_username ?? '')
  const [verifyStatus, setVerifyStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [verifyMsg, setVerifyMsg] = useState('')

  // Notifications
  const [emailNudges, setEmailNudges] = useState(profile.email_nudges)
  const [emailReminders, setEmailReminders] = useState(profile.email_reminders)
  const [savingNotifs, setSavingNotifs] = useState(false)

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault()
    setSavingProfile(true)
    setProfileSaved(false)
    try {
      const res = await fetch('/api/profile/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: fullName }),
      })
      if (res.ok) {
        setProfileSaved(true)
        setTimeout(() => setProfileSaved(false), 3000)
        router.refresh()
      }
    } finally {
      setSavingProfile(false)
    }
  }

  async function verifyLeetCode(e: React.FormEvent) {
    e.preventDefault()
    if (!leetcodeUsername.trim()) return
    setVerifyStatus('loading')
    setVerifyMsg('')
    try {
      const res = await fetch('/api/leetcode/verify-username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leetcode_username: leetcodeUsername.trim() }),
      })
      const data = await res.json()
      if (data.valid) {
        setVerifyStatus('success')
        setVerifyMsg('LeetCode username verified and saved.')
        router.refresh()
      } else {
        setVerifyStatus('error')
        setVerifyMsg(data.error ?? 'Username not found.')
      }
    } catch {
      setVerifyStatus('error')
      setVerifyMsg('Connection error.')
    }
  }

  async function saveNotifications() {
    setSavingNotifs(true)
    try {
      await fetch('/api/profile/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email_nudges: emailNudges, email_reminders: emailReminders }),
      })
      router.refresh()
    } finally {
      setSavingNotifs(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Profile */}
      <section className="card p-6">
        <h2 className="text-sm font-medium text-fg-subtle uppercase tracking-widest mb-5">Profile</h2>
        <div className="flex items-center gap-4 mb-6">
          {profile.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatar_url} alt="Avatar" className="w-12 h-12 rounded-full object-cover" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-lg font-semibold">
              {(profile.full_name ?? '?').charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <p className="font-medium">{profile.full_name}</p>
            <p className="text-sm text-fg-muted">{profile.email}</p>
          </div>
        </div>
        <form onSubmit={saveProfile} className="space-y-4">
          <div>
            <label htmlFor="full-name" className="block text-sm font-medium mb-2">Display name</label>
            <input
              id="full-name"
              type="text"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              maxLength={50}
              className="w-full px-4 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-sm focus:outline-none focus:border-zinc-600 transition-colors"
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={savingProfile}
              className="px-4 py-2 rounded-lg bg-white text-zinc-900 text-sm font-semibold hover:bg-zinc-100 disabled:opacity-50 transition-colors"
            >
              {savingProfile ? 'Saving…' : 'Save name'}
            </button>
            {profileSaved && <span className="text-xs text-green-400">✓ Saved</span>}
          </div>
        </form>
      </section>

      {/* LeetCode */}
      <section className="card p-6">
        <h2 className="text-sm font-medium text-fg-subtle uppercase tracking-widest mb-5">LeetCode</h2>
        {profile.leetcode_verified && (
          <div className="flex items-center gap-2 mb-4 text-sm text-green-400">
            <span>✓</span>
            <span>Verified as <span className="font-mono">@{profile.leetcode_username}</span></span>
          </div>
        )}
        <form onSubmit={verifyLeetCode} className="space-y-4">
          <div>
            <label htmlFor="lc-username" className="block text-sm font-medium mb-2">LeetCode username</label>
            <input
              id="lc-username"
              type="text"
              value={leetcodeUsername}
              onChange={e => { setLeetcodeUsername(e.target.value); setVerifyStatus('idle') }}
              placeholder="your-username"
              className="w-full px-4 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-sm font-mono focus:outline-none focus:border-zinc-600 transition-colors"
            />
          </div>
          {verifyStatus === 'success' && (
            <p className="text-xs text-green-400">{verifyMsg}</p>
          )}
          {verifyStatus === 'error' && (
            <p className="text-xs text-red-400">{verifyMsg}</p>
          )}
          <button
            type="submit"
            disabled={!leetcodeUsername.trim() || verifyStatus === 'loading'}
            className="px-4 py-2 rounded-lg bg-white text-zinc-900 text-sm font-semibold hover:bg-zinc-100 disabled:opacity-50 transition-colors"
          >
            {verifyStatus === 'loading' ? 'Verifying…' : 'Verify & save'}
          </button>
        </form>
      </section>

      {/* Notifications */}
      <section className="card p-6">
        <h2 className="text-sm font-medium text-fg-subtle uppercase tracking-widest mb-5">Notifications</h2>
        <div className="space-y-4">
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <p className="text-sm font-medium">Nudge emails</p>
              <p className="text-xs text-fg-muted">Receive email when a teammate nudges you</p>
            </div>
            <button
              role="switch"
              aria-checked={emailNudges}
              onClick={() => { setEmailNudges(!emailNudges); setTimeout(saveNotifications, 0) }}
              className={`relative w-10 h-5 rounded-full transition-colors ${emailNudges ? 'bg-white' : 'bg-zinc-700'}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-zinc-900 transition-transform ${emailNudges ? 'translate-x-5' : 'translate-x-0'}`}
              />
            </button>
          </label>
          <div className="divider" />
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <p className="text-sm font-medium">Deadline reminder emails</p>
              <p className="text-xs text-fg-muted">Receive reminder 3 hours before streak deadline</p>
            </div>
            <button
              role="switch"
              aria-checked={emailReminders}
              onClick={() => { setEmailReminders(!emailReminders); setTimeout(saveNotifications, 0) }}
              className={`relative w-10 h-5 rounded-full transition-colors ${emailReminders ? 'bg-white' : 'bg-zinc-700'}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-zinc-900 transition-transform ${emailReminders ? 'translate-x-5' : 'translate-x-0'}`}
              />
            </button>
          </label>
        </div>
        {savingNotifs && <p className="text-xs text-fg-subtle mt-3">Saving…</p>}
      </section>

      {/* Groups */}
      {memberships.length > 0 && (
        <section className="card p-6">
          <h2 className="text-sm font-medium text-fg-subtle uppercase tracking-widest mb-5">Your groups</h2>
          <div className="space-y-3">
            {memberships.map((m) => {
              return (
                <div key={m.group_id} className="flex items-center justify-between py-2 border-b border-zinc-800 last:border-0">
                  <div>
                    <p className="text-sm font-medium">{m.groups.name}</p>
                    <p className="text-xs text-fg-subtle capitalize">{m.role}</p>
                  </div>
                  <a
                    href={`/dashboard`}
                    className="text-xs text-fg-subtle hover:text-fg-muted transition-colors"
                  >
                    View →
                  </a>
                </div>
              )
            })}

          </div>
        </section>
      )}
    </div>
  )
}
