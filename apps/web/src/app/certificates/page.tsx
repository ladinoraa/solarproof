'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Award, Leaf } from 'lucide-react'
import { RetireModal } from '@/components/retire-modal'
import { useToast } from '@/components/toast'
import { useWallet } from '@/hooks/useWallet'
import { CopyableText } from '@/components/copy-button'

interface Certificate {
  id: string
  kwh: number
  minted_at: string
  retired: boolean
  retired_at: string | null
  retired_by: string | null
  tx_hash: string | null
}

async function fetchCertificates(): Promise<Certificate[]> {
  const res = await fetch('/api/certificates')
  if (!res.ok) throw new Error('Failed to load certificates')
  return res.json()
}

export default function CertificatesPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['certificates'],
    queryFn: fetchCertificates,
  })
  const qc = useQueryClient()
  const { toast, dismiss } = useToast()
  const { address, connected, connect } = useWallet()
  const [retiring, setRetiring] = useState<Certificate | null>(null)

  async function handleRetire(reason: string) {
    if (!retiring) return
    const pendingId = toast('pending', 'Submitting retirement transaction…')
    try {
      const res = await fetch(`/api/certificates/${retiring.id}/retire`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet_address: address, reason }),
      })
      dismiss(pendingId)
      if (!res.ok) {
        const { error: msg } = await res.json().catch(() => ({ error: 'Unknown error' }))
        toast('error', msg ?? 'Retirement failed')
        return
      }
      toast('success', 'Certificate retired successfully')
      setRetiring(null)
      qc.invalidateQueries({ queryKey: ['certificates'] })
    } catch (err) {
      dismiss(pendingId)
      toast('error', err instanceof Error ? err.message : 'Retirement failed')
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900 dark:text-gray-100">Certificates</h1>

      {!connected && (
        <div className="mb-6 flex items-center justify-between rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 dark:border-yellow-800 dark:bg-yellow-950">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            Connect your wallet to retire certificates.
          </p>
          <button
            onClick={() => connect().catch(() => {})}
            className="rounded-md bg-yellow-400 px-3 py-1.5 text-xs font-medium text-gray-900 hover:bg-yellow-500"
          >
            Connect wallet
          </button>
        </div>
      )}

      {error && (
        <p role="alert" className="mb-4 text-sm text-red-600 dark:text-red-400">
          Failed to load certificates.
        </p>
      )}

      <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
        <div className="overflow-x-auto">
          <table
            className="min-w-full divide-y divide-gray-200 bg-white text-sm dark:divide-gray-800 dark:bg-gray-900"
            aria-label="Energy certificates"
            aria-busy={isLoading}
          >
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/50">
                {['Certificate ID', 'kWh', 'Minted', 'Status', 'Action'].map((h) => (
                  <th
                    key={h}
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400">
                    Loading…
                  </td>
                </tr>
              ) : data && data.length > 0 ? (
                data.map((cert) => (
                  <tr key={cert.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                      <CopyableText value={cert.id} displayValue={`${cert.id.slice(0, 8)}…`} />
                    </td>
                    <td className="px-4 py-3 text-gray-900 dark:text-gray-100">{cert.kwh}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                      {new Date(cert.minted_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      {cert.retired ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                          <Leaf className="h-3 w-3" aria-hidden="true" />
                          Retired
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                          <Award className="h-3 w-3" aria-hidden="true" />
                          Active
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {!cert.retired && (
                        <button
                          onClick={() => setRetiring(cert)}
                          disabled={!connected}
                          aria-label={`Retire certificate ${cert.id.slice(0, 8)}`}
                          className="rounded-md bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Retire
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                    No certificates found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {retiring && (
        <RetireModal
          certificateId={retiring.id}
          kwh={retiring.kwh}
          onConfirm={handleRetire}
          onClose={() => setRetiring(null)}
        />
      )}
    </div>
  )
}
