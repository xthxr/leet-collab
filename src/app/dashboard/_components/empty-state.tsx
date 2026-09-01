import Link from 'next/link'

export default function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center animate-fade-in">
      <div className="text-4xl mb-6">🔥</div>
      <h2 className="text-xl font-semibold tracking-tight mb-3">No streak groups yet</h2>
      <p className="text-fg-muted text-sm max-w-sm leading-relaxed mb-8">
        Create a group and invite 1–4 friends, or join an existing group with an invite link.
      </p>
      <div className="flex items-center gap-3">
        <Link
          href="/groups/new"
          className="px-5 py-2.5 rounded-lg bg-white text-zinc-900 text-sm font-semibold hover:bg-zinc-100 transition-colors"
        >
          Create a group
        </Link>
        <p className="text-xs text-fg-subtle">or use an invite link from a friend</p>
      </div>
    </div>
  )
}
