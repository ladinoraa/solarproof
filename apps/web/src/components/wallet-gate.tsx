'use client'

import { useEffect, useState } from 'react'
import { Wallet } from 'lucide-react'
import { useWallet } from '@/hooks/useWallet'

/**
 * Wraps protected pages. Shows a connect-wallet prompt until a wallet is
 * connected; once connected, renders children normally.
 *
 * Usage:
 *   export default function DashboardPage() {
 *     return <WalletGate>{/* page content *\/}</WalletGate>
 *   }
 */
export function WalletGate({ children }: { children: React.ReactNode }) {
  const { connected, loading, connect } = useWallet()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // During SSR or before wallet state is resolved, render nothing to avoid
  // flashing the gate on pages where the wallet is already connected.
  if (!mounted || loading) return null

  if (!connected) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/30">
          <Wallet className="h-8 w-8 text-yellow-600 dark:text-yellow-400" aria-hidden="true" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Wallet required
          </h2>
          <p className="max-w-sm text-sm text-gray-600 dark:text-gray-400">
            Connect your Freighter wallet to access this page.
          </p>
        </div>
        <button
          onClick={() => connect().catch(() => {})}
          className="inline-flex items-center gap-2 rounded-md bg-yellow-400 px-5 py-2.5 text-sm font-medium text-gray-900 transition-colors hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2"
        >
          <Wallet className="h-4 w-4" aria-hidden="true" />
          Connect wallet
        </button>
      </div>
    )
  }

  return <>{children}</>
}
