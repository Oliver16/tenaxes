import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Multidimensional Political Compass',
  description: 'A 98-item survey measuring political orientation across 10 core axes and 3 behavioral facets.',
  openGraph: {
    title: 'Multidimensional Political Compass',
    description: 'Discover your political profile across 10 dimensions',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
