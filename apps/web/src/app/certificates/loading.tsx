import { Award } from 'lucide-react'
import { Skeleton, TableRowSkeleton } from '@/components/skeleton'

export default function CertificatesLoading() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:py-10">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Award className="h-6 w-6 shrink-0 text-yellow-500" aria-hidden="true" />
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 sm:text-2xl">
            Certificates
          </h1>
        </div>
        <Skeleton className="h-8 w-32" />
      </header>

      <div
        aria-busy="true"
        aria-label="Loading certificates"
        className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800"
      >
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 bg-white text-sm dark:divide-gray-800 dark:bg-gray-900">
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
              {Array.from({ length: 10 }).map((_, i) => (
                <TableRowSkeleton key={i} cols={5} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
