import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'
import Header from '@/components/Header'

export const metadata: Metadata = {
  title: 'Polyaxis',
  description: 'The most rigorous ideological evaluation you can take: 350 questions measuring political orientation across 11 core axes and 7 style facets, including the value tensions where your beliefs collide.',
  openGraph: {
    title: 'Polyaxis',
    description: 'A 350-question ideological evaluation across 18 dimensions — no four-quadrant shortcuts',
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
      <body className="font-sans">
        <AuthProvider>
          <Header />
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
