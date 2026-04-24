'use client'

import { useQuery } from '@tanstack/react-query'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from 'recharts'
import { useTheme } from 'next-themes'
import { Zap, Award, Leaf, TrendingUp } from 'lucide-react'
import { StatCardSkeleton, ChartSkeleton, TableRowSkeleton } from '@/components/skeleton'
import { ErrorBoundary } from '@/components/error-boundary'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Reading {
  id: string
  meter_id: string
  kwh: number
  timestamp: string
  verified: boolean
}

interface Stats {
  total_kwh: number
  certificates_issued: number
  certificates_retired: number
  active_meters: number
}

// ---------------------------------------------------------------------------
// Mock fetch helpers (replace with real API calls)
// ---------------------------------------------------------------------------
async function fetchStats(): Promise<Stats> {
  const res = await fetch('/api/readings?type=stats')
  if (!res.ok) throw new Error('Failed to load stats')
  return res.json()
}

async function fetchReadings(): Promise<Reading[]> {
  const res = await fetch('/api/readings')
  if (!res.ok) throw new Error('Failed to load readings')
  return res.json()
}

// ---------------------------------------------------------------------------
// Stat card
// ---------------------------------------------------------------------------
interface StatCardProps {
  label: string
  value: string | number
  icon: React.ElementType
  description?: string
}

function StatCard({ label, value, icon: Icon, description }: StatCardProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</span>
        <Icon className="h-5 w-5 text-yellow-500" aria-hidden="true" />
      </div>
      <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
      {description && (
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">{description}</p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Chart colours that respect dark mode
// ---------------------------------------------------------------------------
function useChartColors() {
  const { resolvedTheme } = useTheme()
  const dark = resolvedTheme === 'dark'
  return {
    grid: dark ? '#374151' : '#e5e7eb',
    text: dark ? '#9ca3af' : '#6b7280',
    area: dark ? '#fbbf24' : '#f59e0b',
    areaFill: dark ? '#fbbf2440' : '#fef3c7',
    bar1: dark ? '#fbbf24' : '#f59e0b',
    bar2: dark ? '#34d399' : '#10b981',
    tooltip: {
      bg: dark ? '#1f2937' : '#ffffff',
      border: dark ? '#374151' : '#e5e7eb',
      text: dark ? '#f9fafb' : '#111827',
    },
  }
}

// ---------------------------------------------------------------------------
// Dashboard page
// ---------------------------------------------------------------------------
export default function DashboardPage() {
  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
  } = useQuery({ queryKey: ['stats'], queryFn: fetchStats })

  const {
    data: readings,
    isLoading: readingsLoading,
    error: readingsError,
  } = useQuery({ queryKey: ['readings'], queryFn: fetchReadings })

  const colors = useChartColors()

  // Build chart data from readings (group by date)
  const chartData = readings
    ? Object.entries(
        readings.reduce<Record<string, number>>((acc, r) => {
          const date = new Date(r.timestamp).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          })
          acc[date] = (acc[date] ?? 0) + r.kwh
          return acc
        }, {})
      )
        .slice(-14)
        .map(([date, kwh]) => ({ date, kwh }))
    : []

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>

      {/* ------------------------------------------------------------------ */}
      {/* Stat cards                                                           */}
      {/* ------------------------------------------------------------------ */}
      <section aria-labelledby="stats-heading" className="mb-8">
        <h2 id="stats-heading" className="sr-only">
          Key statistics
        </h2>
        <ErrorBoundary inline>
        {statsError && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            Failed to load statistics.
          </p>
        )}

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {statsLoading ? (
            <>
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
            </>
          ) : stats ? (
            <>
              <StatCard
                label="Total energy"
                value={`${stats.total_kwh.toLocaleString()} kWh`}
                icon={Zap}
                description="All verified readings"
              />
              <StatCard
                label="Certificates issued"
                value={stats.certificates_issued.toLocaleString()}
                icon={Award}
                description="Minted on Stellar"
              />
              <StatCard
                label="Certificates retired"
                value={stats.certificates_retired.toLocaleString()}
                icon={Leaf}
                description="Permanently burned"
              />
              <StatCard
                label="Active meters"
                value={stats.active_meters.toLocaleString()}
                icon={TrendingUp}
                description="Reporting in last 24 h"
              />
            </>
          ) : null}
        </div>
        </ErrorBoundary>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Charts                                                               */}
      {/* ------------------------------------------------------------------ */}
      <section aria-labelledby="charts-heading" className="mb-8">
        <h2 id="charts-heading" className="sr-only">
          Energy charts
        </h2>
        <ErrorBoundary inline>
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Area chart — daily kWh */}
          {readingsLoading ? (
            <ChartSkeleton title="Daily energy output" />
          ) : (
            <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
              <h3 className="mb-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                Daily energy output (kWh)
              </h3>
              <div
                role="img"
                aria-label="Area chart showing daily energy output in kWh over the last 14 days"
                className="h-48 w-full"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11, fill: colors.text }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: colors.text }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: colors.tooltip.bg,
                        border: `1px solid ${colors.tooltip.border}`,
                        borderRadius: '8px',
                        color: colors.tooltip.text,
                        fontSize: '12px',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="kwh"
                      stroke={colors.area}
                      fill={colors.areaFill}
                      strokeWidth={2}
                      name="kWh"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Bar chart — verified vs unverified */}
          {readingsLoading ? (
            <ChartSkeleton title="Verification status" />
          ) : (
            <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
              <h3 className="mb-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                Verification status by meter
              </h3>
              <div
                role="img"
                aria-label="Bar chart showing verified and unverified readings per meter"
                className="h-48 w-full"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={
                      readings
                        ? Object.entries(
                            readings.reduce<Record<string, { verified: number; unverified: number }>>(
                              (acc, r) => {
                                if (!acc[r.meter_id])
                                  acc[r.meter_id] = { verified: 0, unverified: 0 }
                                if (r.verified) acc[r.meter_id].verified++
                                else acc[r.meter_id].unverified++
                                return acc
                              },
                              {}
                            )
                          ).map(([meter, counts]) => ({ meter, ...counts }))
                        : []
                    }
                    margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
                    <XAxis
                      dataKey="meter"
                      tick={{ fontSize: 11, fill: colors.text }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: colors.text }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: colors.tooltip.bg,
                        border: `1px solid ${colors.tooltip.border}`,
                        borderRadius: '8px',
                        color: colors.tooltip.text,
                        fontSize: '12px',
                      }}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: '12px', color: colors.text }}
                    />
                    <Bar dataKey="verified" fill={colors.bar1} name="Verified" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="unverified" fill={colors.bar2} name="Unverified" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
        </ErrorBoundary>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Recent readings table                                                */}
      {/* ------------------------------------------------------------------ */}
      <section aria-labelledby="readings-heading">
        <h2
          id="readings-heading"
          className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100"
        >
          Recent readings
        </h2>
        <ErrorBoundary inline>

        {readingsError && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            Failed to load readings.
          </p>
        )}

        {/* Responsive table wrapper — prevents horizontal scroll on mobile */}
        <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
          <div className="overflow-x-auto">
            <table
              className="min-w-full divide-y divide-gray-200 bg-white text-sm dark:divide-gray-800 dark:bg-gray-900"
              aria-label="Recent meter readings"
              aria-busy={readingsLoading}
            >
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/50">
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
                  >
                    Meter ID
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
                  >
                    kWh
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
                  >
                    Timestamp
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
                  >
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {readingsLoading ? (
                  <>
                    <TableRowSkeleton cols={4} />
                    <TableRowSkeleton cols={4} />
                    <TableRowSkeleton cols={4} />
                    <TableRowSkeleton cols={4} />
                    <TableRowSkeleton cols={4} />
                  </>
                ) : readings && readings.length > 0 ? (
                  readings.slice(0, 20).map((r) => (
                    <tr
                      key={r.id}
                      className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/40"
                    >
                      <td className="px-4 py-3 font-mono text-xs text-gray-700 dark:text-gray-300">
                        {r.meter_id}
                      </td>
                      <td className="px-4 py-3 text-gray-900 dark:text-gray-100">
                        {r.kwh}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                        {new Date(r.timestamp).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            r.verified
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                          }`}
                        >
                          {r.verified ? 'Verified' : 'Pending'}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400"
                    >
                      No readings found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        </ErrorBoundary>
      </section>
    </div>
  )
}
