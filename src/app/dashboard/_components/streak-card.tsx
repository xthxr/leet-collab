interface StreakCardProps {
  currentStreak: number
  longestStreak: number
  lastActiveDate: string | null | undefined
  brokenAt: string | null | undefined
}

export default function StreakCard({
  currentStreak,
  longestStreak,
  lastActiveDate,
  brokenAt,
}: StreakCardProps) {
  const isActive = currentStreak > 0
  const wasBroken = !!brokenAt && currentStreak === 0

  return (
    <div className="card p-6 flex flex-col justify-between min-h-[160px] animate-scale-in">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-medium text-fg-subtle uppercase tracking-widest">
          Streak
        </span>
        {isActive && (
          <span className="text-base animate-pulse-fire">🔥</span>
        )}
        {wasBroken && (
          <span className="text-xs text-red-400 font-medium">Broken</span>
        )}
      </div>

      {/* Main streak number */}
      <div className="mb-4">
        <div
          className="streak-number font-bold text-fg animate-count-up"
          style={{ fontSize: 'clamp(3rem, 6vw, 4.5rem)' }}
        >
          {currentStreak}
        </div>
        <div className="text-sm text-fg-muted mt-1">
          {currentStreak === 1 ? 'day' : 'days'}
        </div>
      </div>

      {/* Best streak */}
      <div className="border-t border-zinc-800 pt-3 flex items-center justify-between">
        <span className="text-xs text-fg-subtle">Best streak</span>
        <span className="text-xs font-mono font-medium text-fg-muted">
          {longestStreak}d
        </span>
      </div>
    </div>
  )
}
