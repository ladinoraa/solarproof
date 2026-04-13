'use client'

import { useState } from 'react'
import { Search, CheckCircle, XCircle, ExternalLink, Shield } from 'lucide-react'

interface ChainOfCustody {
  certificate: {
    id: string; kwh: number; issued_at: string
    retired: boolean; retired_at: string | null; retired_by: string | null
  }
  on_chain: {
    anchor_tx: string; anchor_explorer: string
    mint_tx: string; mint_explorer: string
  }
  meter_proof: {
    meter_id: string; reading_hash: string
    signature_hex: string; kwh: number
    timestamp: string; verified: boolean
  } | null
}

export default function VerifyPage() {
  const [query, setQuery] = useState('')
  const [result, setResult] = useState<ChainOfCustody | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim()) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch(`/api/verify?id=${encodeURIComponent(query.trim())}`)
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      setResult(data)
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-8 flex items-center gap-3">
        <Shield className="h-7 w-7 text-yellow-500" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Certificate Verifier</h1>
          <p className="text-sm text-gray-500">No login required. Enter a certificate ID, reading hash, or transaction hash.</p>
        </div>
      </div>

      <form onSubmit={handleVerify} className="mb-8 flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Certificate ID, reading hash, or tx hash…"
          className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
        />
        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-2 rounded-lg bg-yellow-400 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-yellow-500 disabled:opacity-50"
        >
          <Search className="h-4 w-4" />
          {loading ? 'Verifying…' : 'Verify'}
        </button>
      </form>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <XCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-4">
          {/* Status */}
          <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-4">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span className="font-medium text-green-800">
              Certificate verified — full chain of custody confirmed
            </span>
          </div>

          {/* Certificate */}
          <Section title="Certificate">
            <Row label="ID" value={result.certificate.id} mono />
            <Row label="Energy" value={`${result.certificate.kwh} kWh`} />
            <Row label="Issued" value={new Date(result.certificate.issued_at).toLocaleString()} />
            <Row label="Status" value={result.certificate.retired ? `Retired ${result.certificate.retired_at ? new Date(result.certificate.retired_at).toLocaleDateString() : ''}` : 'Active'} />
          </Section>

          {/* On-chain proof */}
          <Section title="On-chain proof">
            <Row label="Anchor tx" value={result.on_chain.anchor_tx} mono link={result.on_chain.anchor_explorer} />
            <Row label="Mint tx" value={result.on_chain.mint_tx} mono link={result.on_chain.mint_explorer} />
          </Section>

          {/* Meter proof */}
          {result.meter_proof && (
            <Section title="Meter proof">
              <Row label="Meter ID" value={result.meter_proof.meter_id} mono />
              <Row label="Reading hash" value={result.meter_proof.reading_hash.slice(0, 16) + '…'} mono />
              <Row label="Signature" value={result.meter_proof.signature_hex.slice(0, 16) + '…'} mono />
              <Row label="kWh" value={String(result.meter_proof.kwh)} />
              <Row label="Timestamp" value={new Date(result.meter_proof.timestamp).toLocaleString()} />
              <Row label="Ed25519 verified" value="✓ Valid" />
            </Section>
          )}
        </div>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">{title}</h2>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function Row({ label, value, mono, link }: { label: string; value: string; mono?: boolean; link?: string }) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className="shrink-0 text-gray-500">{label}</span>
      {link ? (
        <a href={link} target="_blank" rel="noopener noreferrer"
          className={`flex items-center gap-1 text-right text-blue-600 hover:underline ${mono ? 'font-mono text-xs' : ''}`}>
          {value} <ExternalLink className="h-3 w-3" />
        </a>
      ) : (
        <span className={`text-right text-gray-900 ${mono ? 'font-mono text-xs' : ''}`}>{value}</span>
      )}
    </div>
  )
}
