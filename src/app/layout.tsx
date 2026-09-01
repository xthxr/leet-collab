import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: {
    default: 'LeetCollab — Streak Together, Code Together',
    template: '%s | LeetCollab',
  },
  description:
    'LeetCollab is a streak accountability app for groups of 2–5 friends. Solve at least one LeetCode problem every day — together.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'https://leet-collab.dev'),
  openGraph: {
    title: 'LeetCollab',
    description: 'Streak accountability for LeetCode friends.',
    type: 'website',
  },
}

import { AndroidWidgetProvider } from '@/components/android-widget-provider'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <AndroidWidgetProvider />
        {children}
      </body>
    </html>
  )
}
