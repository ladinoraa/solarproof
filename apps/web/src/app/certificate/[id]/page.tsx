'use client'

import { useEffect, useState } from 'react'
import { ExternalLink, Shield, CheckCircle, AlertTriangle, Clock } from 'lucide-react'
import { useToast } from '@/components/ToastProvider'
import Link from 'next/link'

interface ChainOfCustody {
  certificate: {
    id: string
    kwh: number
    issued_at: string
    retired: boolean
    retired_at: string | null
    retired_by: string | null
  }
  on_chain: {
    anchor_tx: string
    anchor_explorer: string
    mint_tx: string
    mint_explorer: string
  }
  meter_proof: {
    meter_id: string
    reading_hash: string
    signature_hex: string
    kwh: number
    timestamp: string
    verified: boolean
  } | null
}

export default function CertificateDetailPage({ params }: { params: { id: string } }) {
  const { id } = params
  const [chain, setChain] = useState<ChainOfCustody | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const { pushToast } = useToast()

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    setChain(null)

    async function load() {
      try {
        const response = await fetch(`/api/verify?id=${encodeURIComponent(id)}`)
        const payload = await response.json()
        if (!response.ok) {
          throw new Error(payload.error || 'Unable to load certificate')
        }
        if (!active) return
        setChain(payload)
        pushToast({
          variant: 'success',
          title: 'Certificate loaded',
          description: `Loaded chain-of-custody details for ${id}.`,
        })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        if (!active) return
        setError(message)
        pushToast({
          variant: 'error',
          title: 'Unable to load certificate',
          description: message,
        })
      } finally {
        if (active) setLoading(false)
      }
    }

    load()
    return () => {
      active = false
    }
  }, [id, pushToast])

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-3 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Shield className="h-7 w-7 text-yellow-500" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-gray-500">Certificate details</p>
            <h1 className="mt-2 text-3xl font-bold text-gray-900">Chain of custody</h1>
          </div>
        </div>
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-400 hover:bg-gray-50"
          aria-label="Back to dashboard"
        >
          Back to dashboard
        </Link>
      </div>

      <div className="space-y-4">
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Certificate ID</p>
          <p className="mt-2 break-all text-xl font-semibold text-gray-900">{id}</p>
        </div>

        {loading && (
          <div className="rounded-3xl border border-gray-200 bg-slate-50 p-6 text-sm text-gray-600">Loading certificate details…</div>
        )}

        {error && (
          <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-sm text-red-700" role="alert">
            {error}
          </div>
        )}

        {chain && (
          <div className="grid gap-4 lg:grid-cols-2">
            <DetailCard title="Ledger anchor" icon={<Clock className="h-5 w-5 text-yellow-500" />}>
              <p className="text-sm text-gray-600">Anchor transaction recorded on Stellar with a public explorer link.</p>
              <a
                href={chain.on_chain.anchor_explorer}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:underline"
              >
                {chain.on_chain.anchor_tx.slice(0, 16)}… <ExternalLink className="h-4 w-4" aria-hidden="true" />
              </a>
            </DetailCard>

            <DetailCard title="Certificate mint" icon={<CheckCircle className="h-5 w-5 text-yellow-500" />}>
              <p className="text-sm text-gray-600">Mint transaction that created the energy certificate token.</p>
              <a
                href={chain.on_chain.mint_explorer}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:underline"
              >
                {chain.on_chain.mint_tx.slice(0, 16)}… <ExternalLink className="h-4 w-4" aria-hidden="true" />
              </a>
            </DetailCard>

            <DetailCard title="Meter reading" icon={<Shield className="h-5 w-5 text-yellow-500" />}>
              <p className="text-sm text-gray-600">Meter reading and signature verified against the registry.</p>
              <ul className="mt-4 space-y-2 text-sm text-gray-700">
                <li>
                  <strong>Meter:</strong> {chain.meter_proof?.meter_id ?? 'Unavailable'}
                </li>
                <li>
                  <strong>Reading hash:</strong> <span className="font-mono">{chain.meter_proof?.reading_hash}</span>
                </li>
                <li>
                  <strong>Signature:</strong> <span className="font-mono">{chain.meter_proof?.signature_hex.slice(0, 18)}…</span>
                </li>
              </ul>
            </DetailCard>

            <DetailCard title="Retirement status" icon={<AlertTriangle className="h-5 w-5 text-yellow-500" />}>
              <p className="text-sm text-gray-600">Certificate status for active and retired energy credits.</p>
              <div className="mt-4 text-sm text-gray-700">
                <p>Status: <span className="font-semibold">{chain.certificate.retired ? 'Retired' : 'Active'}</span></p>
                {chain.certificate.retired && (
                  <p className="mt-1">Retired on {new Date(chain.certificate.retired_at ?? '').toLocaleDateString()}</p>
                )}
              </div>
            </DetailCard>
          </div>
        )}
      </div>
    </div>
  )
}

function DetailCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-yellow-50 text-yellow-600">{icon}</span>
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  )
}
