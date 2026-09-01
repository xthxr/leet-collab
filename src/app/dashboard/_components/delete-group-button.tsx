'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function DeleteGroupButton({ groupId }: { groupId: string }) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (!confirm('Are you absolutely sure you want to delete this group? This action cannot be undone and will permanently delete all streak history and member records.')) {
      return
    }

    setIsDeleting(true)
    try {
      const res = await fetch('/api/groups/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group_id: groupId }),
      })
      
      if (res.ok) {
        router.refresh()
      } else {
        const data = await res.json()
        alert(data.error ?? 'Failed to delete group')
      }
    } catch (err) {
      console.error('Failed to delete group', err)
      alert('Network error')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isDeleting}
      className="text-xs text-red-500 hover:text-red-400 hover:bg-red-950/30 transition-colors border border-red-900/30 rounded-md px-3 py-1.5 flex items-center gap-2 disabled:opacity-50"
    >
      {isDeleting ? 'Deleting...' : 'Delete group'}
    </button>
  )
}
