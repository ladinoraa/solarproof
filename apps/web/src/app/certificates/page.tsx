'use client'

import { useMemo, useState, useEffect, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, ArrowRight, Filter, Zap } from 'lucide-react'

interface Certificate {
  id: string
  meter_id: string | null
  reading_id: string
  reading_hash: string
  mint_tx_hash: string
  anchor_tx_hash: string
  kwh: number
  issued_at: string
  retired: boolean
  retired_at: string | null
  retired_by: string | null
}

interface CertificateResponse {
  certificates: Certificate[]
  total: number
  page: number
  pageSize: number
}

function normalizeSearchParams(searchParams: URLSearchParams) {
  return {
    page: Number(searchParams.get('page') ?? 1),
    pageSize: Number(searchParams.get('pageSize') ?? 10),
    status: searchParams.get('status') ?? '',
    meterId: searchParams.get('meterId') ?? '',
    startDate: searchParams.get('startDate') ?? '',
    endDate: searchParams.get('endDate') ?? '',
  }
}

export default function CertificatesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [formState, setFormState] = useState(() => normalizeSearchParams(new URLSearchParams()))

  const params = useMemo(() => normalizeSearchParams(searchParams ?? new URLSearchParams()), [searchParams])

  useEffect(() => {
    setFormState(params)
  }, [params])

  const queryString = useMemo(() => {
    const next = new URLSearchParams()
    next.set('page', String(params.page))
    next.set('pageSize', String(params.pageSize))
    if (params.status) next.set('status', params.status)
    if (params.meterId) next.set('meterId', params.meterId)
    if (params.startDate) next.set('startDate', params.startDate)
    if (params.endDate) next.set('endDate', params.endDate)
    return next.toString()
  }, [params])

  const {
    data,
    isLoading,
    error,
  } = useQuery<CertificateResponse>({
    queryKey: ['certificates', queryString],
    queryFn: async () => {
      const response = await fetch(`/api/certificates?${queryString}`)
      if (!response.ok) {
        throw new Error('Failed to load certificates')
      }
      return response.json()
    },
    keepPreviousData: true,
  })

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const next = new URLSearchParams()
    next.set('page', '1')
    next.set('pageSize', String(formState.pageSize))
    if (formState.status) next.set('status', formState.status)
    if (formState.meterId) next.set('meterId', formState.meterId)
    if (formState.startDate) next.set('startDate', formState.startDate)
    if (formState.endDate) next.set('endDate', formState.endDate)
    router.push(`/certificates?${next.toString()}`)
  }

  function updatePage(page: number) {
    const next = new URLSearchParams(searchParams ?? new URLSearchParams())
    next.set('page', String(page))
    router.push(`/certificates?${next.toString()}`)
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Certificates</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Browse certificates with pagination, filtering, and status controls.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200">
          <Zap className="h-4 w-4 text-yellow-500" aria-hidden="true" />
          Page size: {params.pageSize}
        </div>
      </div>

      <form onSubmit={applyFilters} className="mb-6 grid gap-4 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950">
        <div className="grid gap-4 md:grid-cols-3">
          <label className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
            Status
            <select
              value={formState.status}
              onChange={(event) => setFormState((current) => ({ ...current, status: event.target.value }))}
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-yellow-400 focus:ring-2 focus:ring-yellow-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-yellow-400 dark:focus:ring-yellow-500/20"
            >
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="retired">Retired</option>
            </select>
          </label>

          <label className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
            Meter ID
            <input
              value={formState.meterId}
              onChange={(event) => setFormState((current) => ({ ...current, meterId: event.target.value }))}
              type="text"
              placeholder="Meter UUID"
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-yellow-400 focus:ring-2 focus:ring-yellow-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-yellow-400 dark:focus:ring-yellow-500/20"
            />
          </label>

          <label className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
            Page size
            <select
              value={formState.pageSize}
              onChange={(event) => setFormState((current) => ({ ...current, pageSize: Number(event.target.value) }))}
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-yellow-400 focus:ring-2 focus:ring-yellow-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-yellow-400 dark:focus:ring-yellow-500/20"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
            Start date
            <input
              type="date"
              value={formState.startDate}
              onChange={(event) => setFormState((current) => ({ ...current, startDate: event.target.value }))}
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-yellow-400 focus:ring-2 focus:ring-yellow-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-yellow-400 dark:focus:ring-yellow-500/20"
            />
          </label>
          <label className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
            End date
            <input
              type="date"
              value={formState.endDate}
              onChange={(event) => setFormState((current) => ({ ...current, endDate: event.target.value }))}
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-yellow-400 focus:ring-2 focus:ring-yellow-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-yellow-400 dark:focus:ring-yellow-500/20"
            />
          </label>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-2xl bg-yellow-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-400"
          >
            <Filter className="h-4 w-4" aria-hidden="true" />
            Apply filters
          </button>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Showing {data?.certificates.length ?? 0} of {data?.total ?? 0} certificates.
          </p>
        </div>
      </form>

      {error && (
        <p className="mb-4 rounded-3xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/50 dark:text-red-300">
          Unable to load certificates. Please try again.
        </p>
      )}

      <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm text-gray-700 dark:text-gray-200">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:bg-gray-900 dark:text-gray-400">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Meter ID</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">kWh</th>
                <th className="px-4 py-3">Issued</th>
                <th className="px-4 py-3">Anchor tx</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {isLoading ? (
                Array.from({ length: params.pageSize }).map((_, index) => (
                  <tr key={index} className="animate-pulse">
                    <td className="px-4 py-4 h-12 bg-gray-100 dark:bg-gray-900" colSpan={6} />
                  </tr>
                ))
              ) : data && data.certificates.length > 0 ? (
                data.certificates.map((certificate) => (
                  <tr key={certificate.id} className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-900/50">
                    <td className="px-4 py-4 font-mono text-xs text-gray-700 dark:text-gray-300">{certificate.id}</td>
                    <td className="px-4 py-4 text-gray-900 dark:text-gray-100">{certificate.meter_id ?? 'N/A'}</td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                          certificate.retired
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                            : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                        }`}
                      >
                        {certificate.retired ? 'Retired' : 'Active'}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-gray-900 dark:text-gray-100">{certificate.kwh}</td>
                    <td className="px-4 py-4 text-gray-600 dark:text-gray-400">
                      {new Date(certificate.issued_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-4 break-all text-blue-600 dark:text-blue-300">{certificate.anchor_tx_hash}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                    No certificates match the current filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between rounded-3xl border border-gray-200 bg-white px-4 py-4 text-sm text-gray-700 shadow-sm dark:border-gray-800 dark:bg-gray-950 dark:text-gray-200">
        <button
          type="button"
          onClick={() => updatePage(Math.max(1, params.page - 1))}
          disabled={params.page <= 1}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-800"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Previous
        </button>
        <span>
          Page {params.page} of {Math.max(1, Math.ceil((data?.total ?? 0) / params.pageSize))}
        </span>
        <button
          type="button"
          onClick={() => updatePage(params.page + 1)}
          disabled={data ? params.page >= Math.ceil(data.total / params.pageSize) : false}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-800"
        >
          Next
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
