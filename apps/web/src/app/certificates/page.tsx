import Link from 'next/link'
import type { Metadata } from 'next'
import { Award, ExternalLink, FlameKindling } from 'lucide-react'
import { createServiceClient } from '@/lib/supabase'
import type { Database } from '@/lib/database.types'
import { PageSizeSelect } from './page-size-select'

export const metadata: Metadata = {
  title: 'Certificates — SolarProof',
  description: 'Browse all issued renewable energy certificates.',
}

type CertRow = Pick<
  Database['public']['Tables']['certificates']['Row'],
  'id' | 'kwh' | 'issued_at' | 'retired' | 'retired_at' | 'cooperative_id' | 'mint_tx_hash'
>

const PAGE_SIZES = [10, 25, 50] as const
const DEFAULT_LIMIT = 25

// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------
async function getCertificates(cursor: string | null, limit: number) {
  const db = createServiceClient()

  let query = db
    .from('certificates')
    .select('id, kwh, issued_at, retired, retired_at, cooperative_id, mint_tx_hash')
    .order('issued_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit + 1) // fetch one extra to know if there's a next page

  if (cursor) {
    // cursor = base64(JSON({ issued_at, id }))
    try {
      const { issued_at, id } = JSON.parse(atob(cursor)) as { issued_at: string; id: string }
      query = query.or(`issued_at.lt.${issued_at},and(issued_at.eq.${issued_at},id.lt.${id})`)
    } catch {
      // invalid cursor — ignore and start from beginning
    }
  }

  const { data, error } = await query
  if (error || !data) return { rows: [] as CertRow[], nextCursor: null }

  const hasNext = data.length > limit
  const rows = hasNext ? data.slice(0, limit) : data

  let nextCursor: string | null = null
  if (hasNext) {
    const last = rows[rows.length - 1]
    nextCursor = btoa(JSON.stringify({ issued_at: last.issued_at, id: last.id }))
  }

  return { rows, nextCursor }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default async function CertificatesPage({
  searchParams,
}: {
  searchParams: Promise<{ cursor?: string; limit?: string }>
}) {
  const { cursor, limit: limitParam } = await searchParams
  const limit = PAGE_SIZES.includes(Number(limitParam) as typeof PAGE_SIZES[number])
    ? Number(limitParam)
    : DEFAULT_LIMIT

  const { rows, nextCursor } = await getCertificates(cursor ?? null, limit)

  // Build prev cursor from URL (we store it as a query param when navigating forward)
  const hasPrev = Boolean(cursor)

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:py-10">
      {/* Header */}
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Award className="h-6 w-6 shrink-0 text-yellow-500" aria-hidden="true" />
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 sm:text-2xl">
            Certificates
          </h1>
        </div>
        <PageSizeSelect current={limit} />
      </header>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
        <div className="overflow-x-auto">
          <table
            className="min-w-full divide-y divide-gray-200 bg-white text-sm dark:divide-gray-800 dark:bg-gray-900"
            aria-label="Certificates list"
          >
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/50">
                {['ID', 'kWh', 'Issued', 'Status', 'Mint tx'].map((h) => (
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
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400"
                  >
                    No certificates found.
                  </td>
                </tr>
              ) : (
                rows.map((cert: CertRow) => (
                  <tr
                    key={cert.id}
                    className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/40"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/certificate/${cert.id}`}
                        className="font-mono text-xs text-blue-600 hover:underline focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-1 rounded dark:text-blue-400"
                      >
                        {cert.id.slice(0, 8)}…
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-900 dark:text-gray-100">
                      {cert.kwh}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                      <time dateTime={cert.issued_at}>
                        {new Date(cert.issued_at).toLocaleDateString()}
                      </time>
                    </td>
                    <td className="px-4 py-3">
                      {cert.retired ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                          <FlameKindling className="h-3 w-3" aria-hidden="true" />
                          Retired
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <a
                        href={`https://stellar.expert/explorer/testnet/tx/${cert.mint_tx_hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Mint transaction for certificate ${cert.id.slice(0, 8)} — opens Stellar explorer`}
                        className="inline-flex items-center gap-1 font-mono text-xs text-blue-600 hover:underline focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-1 rounded dark:text-blue-400"
                      >
                        {cert.mint_tx_hash.slice(0, 8)}…
                        <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination controls */}
      <nav
        aria-label="Pagination"
        className="mt-4 flex items-center justify-between gap-4"
      >
        <span className="text-xs text-gray-500 dark:text-gray-400">
          Showing {rows.length} certificate{rows.length !== 1 ? 's' : ''}
        </span>
        <div className="flex gap-2">
          {hasPrev && (
            <Link
              href={`/certificates?limit=${limit}`}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              ← First
            </Link>
          )}
          {nextCursor && (
            <Link
              href={`/certificates?cursor=${encodeURIComponent(nextCursor)}&limit=${limit}`}
              className="rounded-lg bg-yellow-400 px-3 py-1.5 text-sm font-medium text-gray-900 hover:bg-yellow-300 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2"
            >
              Next →
            </Link>
          )}
        </div>
      </nav>
    </div>
  )
}
