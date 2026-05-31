'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { Award, ExternalLink } from 'lucide-react'
import { CertificateListSkeleton } from '@/components/skeleton'

interface Certificate {
  id: string
  kwh: number
  issued_at: string
  retired: boolean
  retired_at: string | null
  mint_tx_hash: string
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

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <header className="mb-6 flex items-center gap-3">
        <Award className="h-6 w-6 text-yellow-500" aria-hidden="true" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Certificates</h1>
      </header>

      {error && (
        <p role="alert" className="mb-4 text-sm text-red-600 dark:text-red-400">
          Failed to load certificates.
        </p>
      )}

      {isLoading ? (
        <CertificateListSkeleton count={6} />
      ) : data && data.length > 0 ? (
        <ul
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          aria-label="Certificate list"
        >
          {data.map((cert) => (
            <li
              key={cert.id}
              className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"
            >
              <p className="mb-1 font-mono text-xs text-gray-500 dark:text-gray-400 truncate">
                {cert.id}
              </p>
              <p className="mb-1 text-2xl font-bold text-gray-900 dark:text-gray-100">
                {cert.kwh} kWh
              </p>
              <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
                Issued {new Date(cert.issued_at).toLocaleDateString()}
              </p>
              <div className="flex items-center justify-between">
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    cert.retired
                      ? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                      : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  }`}
                >
                  {cert.retired ? 'Retired' : 'Active'}
                </span>
                <Link
                  href={`/verify?id=${cert.id}`}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:underline dark:text-blue-400"
                  aria-label={`Verify certificate ${cert.id}`}
                >
                  Verify <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </Link>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        !error && (
          <p className="text-sm text-gray-500 dark:text-gray-400">No certificates found.</p>
        )
      )}
    </div>
  )
}
