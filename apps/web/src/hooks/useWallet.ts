'use client'

import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'solarproof-wallet'

interface WalletState {
  address: string | null
  connected: boolean
}

const initial: WalletState = { address: null, connected: false }

function isFreighterAvailable(): boolean {
  return typeof window !== 'undefined' && 'freighter' in window
}

export function useWallet() {
  const [state, setState] = useState<WalletState>(initial)
  const [loading, setLoading] = useState(true)

  // Restore persisted state on mount and verify the wallet is still authorised
  useEffect(() => {
    async function restore() {
      try {
        const stored = sessionStorage.getItem(STORAGE_KEY)
        if (!stored) return

        const { address } = JSON.parse(stored) as WalletState
        if (!address || !isFreighterAvailable()) return

        // Re-check authorisation without prompting the user
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const freighter = (window as any).freighter
        const isAllowed: boolean = await freighter.isAllowed()
        if (isAllowed) {
          setState({ address, connected: true })
        } else {
          sessionStorage.removeItem(STORAGE_KEY)
        }
      } catch {
        sessionStorage.removeItem(STORAGE_KEY)
      } finally {
        setLoading(false)
      }
    }
    restore()
  }, [])

  const connect = useCallback(async () => {
    if (!isFreighterAvailable()) {
      throw new Error('Freighter wallet extension not found. Please install it.')
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const freighter = (window as any).freighter
    await freighter.requestAccess()
    const address: string = await freighter.getPublicKey()
    const next: WalletState = { address, connected: true }
    setState(next)
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    return address
  }, [])

  const disconnect = useCallback(() => {
    setState(initial)
    sessionStorage.removeItem(STORAGE_KEY)
  }, [])

  return { ...state, loading, connect, disconnect }
}
