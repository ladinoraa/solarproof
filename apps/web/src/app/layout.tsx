import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import { Navbar } from '@/components/navbar'
import { ErrorBoundary } from '@/components/error-boundary'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'SolarProof — Cryptographic Renewable Energy Certification on Stellar',
  description:
    'End-to-end cryptographic proof of renewable energy. Every kWh signed at the meter, anchored on Stellar, publicly verifiable.',
  openGraph: {
    title: 'SolarProof',
    description: 'Cryptographic renewable energy certification on Stellar',
    url: 'https://solarproof.vercel.app',
    siteName: 'SolarProof',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          <Navbar />
          <main className="min-h-screen bg-gray-50 dark:bg-gray-950">
            <ErrorBoundary>{children}</ErrorBoundary>
          </main>
        </Providers>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
