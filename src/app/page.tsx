import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="min-h-dvh flex flex-col items-center justify-center px-6">
      <div className="max-w-2xl w-full text-center animate-fade-in">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-16">
          <span className="text-3xl animate-pulse-fire">🔥</span>
          <span className="text-xl font-bold tracking-tight">LeetCollab</span>
        </div>

        {/* Headline */}
        <h1 className="text-5xl font-bold tracking-tight leading-tight mb-6"
          style={{ letterSpacing: '-0.04em' }}>
          Streak together,<br />code together.
        </h1>
        <p className="text-lg text-fg-muted mb-12 max-w-lg mx-auto leading-relaxed">
          Groups of 2–5 friends. One shared LeetCode streak. Everyone practices daily — or the streak breaks for everyone.
        </p>

        {/* CTA */}
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-zinc-900 rounded-lg font-semibold text-sm hover:bg-zinc-100 transition-colors"
          >
            Get started free
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-sm border border-zinc-800 text-fg-muted hover:text-fg hover:border-zinc-700 transition-colors"
          >
            Sign in
          </Link>
        </div>

        {/* Features */}
        <div className="mt-24 grid grid-cols-1 sm:grid-cols-3 gap-4 text-left stagger">
          {[
            {
              icon: '🔗',
              title: 'Shareable invite links',
              desc: 'Create a group and invite up to 4 friends with a single link.',
            },
            {
              icon: '✅',
              title: 'Auto-verified practice',
              desc: 'Connect your LeetCode account. We verify your submissions automatically.',
            },
            {
              icon: '📬',
              title: 'Smart nudges',
              desc: 'Poke friends who haven\'t practiced. Get deadline alerts before midnight.',
            },
          ].map((f) => (
            <div key={f.title} className="card p-5 animate-fade-in">
              <div className="text-2xl mb-3">{f.icon}</div>
              <div className="font-semibold text-sm mb-1">{f.title}</div>
              <div className="text-fg-muted text-sm leading-relaxed">{f.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
