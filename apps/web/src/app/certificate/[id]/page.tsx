import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import {
  Zap,
  ShieldCheck,
  Link2,
  Award,
  FlameKindling,
  ExternalLink,
  CheckCircle2,
  Clock,
} from 'lucide-react'
import { createServiceClient } from '@/lib/supabase'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface ChainStep {
  icon: React.ElementType
  label: string
  timestamp: string | null
  hash: string | null
  hashLabel: string
  explorerUrl?: string
  status: 'done' | 'pending'
  detail?: string
}

// ---------------------------------------------------------------------------
// Data fetching (server-side, no auth required)
// ---------------------------------------------------------------------------
async function getCertificateChain(id: string) {
  const db = createServiceClient()

  const { data: cert } = await db
    .from('certificates')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (!cert) return null

  const { data: reading } = await db
    .from('readings')
    .select('*')
    .eq('id', cert.reading_id)
    .maybeSingle()

  return { cert, reading }
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  return {
    title: `Certificate ${id.slice(0, 8)}… — SolarProof`,
    description: 'Full chain of custody: meter reading → Ed25519 proof → ledger anchor → certificate → retirement.',
  }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default async function CertificatePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const data = await getCertificateChain(id)
  if (!data) notFound()

  // notFound() throws, so data is non-null here
  const { cert, reading } = data!

  const steps: ChainStep[] = [
    {
      icon: Zap,
      label: 'Meter reading',
      timestamp: reading?.timestamp ?? null,
      hash: reading?.reading_hash ?? null,
      hashLabel: 'Reading hash',
      status: reading ? 'done' : 'pending',
      detail: reading ? `${reading.kwh} kWh · Meter ${reading.meter_id}` : undefined,
    },
    {
      icon: ShieldCheck,
      label: 'Ed25519 signature',
      timestamp: reading?.timestamp ?? null,
      hash: reading?.signature_hex ?? null,
      hashLabel: 'Signature',
      status: reading?.signature_hex ? 'done' : 'pending',
      detail: reading?.signature_hex ? 'Verified against meter public key' : undefined,
    },
    {
      icon: Link2,
      label: 'Ledger anchor',
      timestamp: cert.issued_at,
      hash: cert.anchor_tx_hash,
      hashLabel: 'Anchor tx',
      explorerUrl: `https://stellar.expert/explorer/testnet/tx/${cert.anchor_tx_hash}`,
      status: cert.anchor_tx_hash ? 'done' : 'pending',
    },
    {
      icon: Award,
      label: 'Certificate minted',
      timestamp: cert.issued_at,
      hash: cert.mint_tx_hash,
      hashLabel: 'Mint tx',
      explorerUrl: `https://stellar.expert/explorer/testnet/tx/${cert.mint_tx_hash}`,
      status: 'done',
      detail: `${cert.kwh} kWh`,
    },
    {
      icon: FlameKindling,
      label: 'Retirement',
      timestamp: cert.retired_at,
      hash: cert.retired_by,
      hashLabel: 'Retired by',
      status: cert.retired ? 'done' : 'pending',
      detail: cert.retired
        ? `Retired ${cert.retired_at ? new Date(cert.retired_at).toLocaleString() : ''}`
        : 'Not yet retired — certificate is active',
    },
  ]

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
      {/* Header */}
      <header className="mb-8">
        <div className="mb-1 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <Link
            href="/verify"
            className="hover:underline focus:outline-none focus:ring-2 focus:ring-yellow-400 rounded"
          >
            Verify
          </Link>
          <span aria-hidden="true">/</span>
          <span className="font-mono">{id.slice(0, 8)}…</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 sm:text-3xl">
          Certificate
        </h1>
        <p className="mt-1 font-mono text-xs text-gray-400 dark:text-gray-500 break-all">{id}</p>

        {/* Status badge */}
        <div className="mt-3">
          {cert.retired ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
              <FlameKindling className="h-3.5 w-3.5" aria-hidden="true" />
              Retired
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              Active · {cert.kwh} kWh
            </span>
          )}
        </div>
      </header>

      {/* Chain of custody stepper */}
      <ol aria-label="Chain of custody" className="relative space-y-0">
        {steps.map((step, i) => {
          const isLast = i === steps.length - 1
          const Icon = step.icon
          return (
            <li key={step.label} className="relative flex gap-4">
              {/* Connector line */}
              {!isLast && (
                <span
                  aria-hidden="true"
                  className="absolute left-[19px] top-10 h-full w-px bg-gray-200 dark:bg-gray-700"
                />
              )}

              {/* Step icon */}
              <div
                className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 ${
                  step.status === 'done'
                    ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20'
                    : 'border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-gray-800'
                }`}
              >
                <Icon
                  className={`h-4 w-4 ${
                    step.status === 'done'
                      ? 'text-yellow-600 dark:text-yellow-400'
                      : 'text-gray-400 dark:text-gray-500'
                  }`}
                  aria-hidden="true"
                />
              </div>

              {/* Step content */}
              <div className={`pb-8 ${isLast ? 'pb-0' : ''} min-w-0 flex-1`}>
                <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                      {step.label}
                    </span>
                    {step.status === 'done' ? (
                      <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                        Confirmed
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                        <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                        Pending
                      </span>
                    )}
                  </div>

                  {step.detail && (
                    <p className="mb-2 text-sm text-gray-600 dark:text-gray-400">{step.detail}</p>
                  )}

                  {step.timestamp && (
                    <p className="mb-1 text-xs text-gray-500 dark:text-gray-500">
                      <time dateTime={step.timestamp}>
                        {new Date(step.timestamp).toLocaleString()}
                      </time>
                    </p>
                  )}

                  {step.hash && (
                    <div className="mt-1 flex flex-wrap items-center gap-1 text-xs">
                      <span className="text-gray-500 dark:text-gray-400">{step.hashLabel}:</span>
                      {step.explorerUrl ? (
                        <a
                          href={step.explorerUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`${step.hashLabel} ${step.hash} — opens Stellar explorer`}
                          className="flex items-center gap-1 break-all font-mono text-blue-600 hover:underline focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-1 rounded dark:text-blue-400"
                        >
                          {step.hash.slice(0, 16)}…
                          <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
                        </a>
                      ) : (
                        <span className="break-all font-mono text-gray-700 dark:text-gray-300">
                          {step.hash.slice(0, 16)}…
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </li>
          )
        })}
      </ol>

      {/* Footer actions */}
      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href={`/verify?id=${id}`}
          className="rounded-lg bg-yellow-400 px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-yellow-300 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2"
        >
          Verify this certificate
        </Link>
        <Link
          href="/dashboard"
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          Dashboard
        </Link>
      </div>
    </div>
  )
}
