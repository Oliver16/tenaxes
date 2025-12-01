import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'
import Header from '@/components/Header'

export const metadata: Metadata = {
  title: 'TenAxes',
  description: 'A 98-item survey measuring political orientation across 10 core axes and 3 behavioral facets.',
  openGraph: {
    title: 'TenAxes',
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
      <body className="font-sans">
        <AuthProvider>
          <Header />
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
