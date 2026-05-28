import Link from 'next/link'
import { DashboardChart } from '@/components/DashboardChart'
import { ArrowRight, BarChart3, Sparkles, ShieldCheck } from 'lucide-react'

const metrics = [
  { label: 'Certificates', value: '128', icon: ShieldCheck },
  { label: 'Anchored readings', value: '632', icon: BarChart3 },
  { label: 'Verified requests', value: '4.8k', icon: Sparkles },
]

const records = [
  { id: 'CERT-4591', user: 'Cooperative A', status: 'Active', kwh: '24', date: '2026-05-21' },
  { id: 'CERT-4520', user: 'Cooperative B', status: 'Retired', kwh: '18', date: '2026-05-19' },
  { id: 'CERT-4487', user: 'Cooperative C', status: 'Active', kwh: '12', date: '2026-05-17' },
  { id: 'CERT-4422', user: 'Cooperative D', status: 'Active', kwh: '32', date: '2026-05-14' },
]

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-gray-500">Dashboard</p>
          <h1 className="mt-2 text-3xl font-bold text-gray-900">Mobile-ready energy insights</h1>
          <p className="mt-2 max-w-2xl text-sm text-gray-600">
            Monitor certificate issuance, anchor activity, and mobile-ready data visualizations.
          </p>
        </div>
        <Link
          href="/verify"
          className="inline-flex items-center justify-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-400 hover:bg-gray-50"
          aria-label="Open certificate verifier"
        >
          <ArrowRight className="h-4 w-4" />
          Verify a certificate
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {metrics.map((metric) => {
          const Icon = metric.icon
          return (
            <div key={metric.label} className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-yellow-50 text-yellow-600">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-medium text-gray-500">{metric.label}</p>
                  <p className="mt-1 text-3xl font-semibold text-gray-900">{metric.value}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
        <DashboardChart />
        <div className="grid gap-4">
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-gray-500">Status</p>
            <div className="mt-6 space-y-4 text-sm text-gray-700">
              <div className="rounded-3xl bg-emerald-50 p-4">
                <p className="font-semibold text-emerald-800">All systems operational</p>
                <p className="mt-1 text-sm text-gray-600">No horizontal overflow, mobile-first layout applied sitewide.</p>
              </div>
              <div className="rounded-3xl bg-sky-50 p-4">
                <p className="font-semibold text-sky-800">Mobile navigation enabled</p>
                <p className="mt-1 text-sm text-gray-600">Hamburger menu with keyboard support and focus trapping.</p>
              </div>
            </div>
          </div>
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-gray-500">Quick links</p>
            <ul className="mt-4 space-y-3 text-sm">
              <li>
                <Link href="/certificate/CERT-4591" className="text-blue-600 hover:underline">
                  View certificate detail example
                </Link>
              </li>
              <li>
                <Link href="/verify" className="text-blue-600 hover:underline">
                  Verify certificate chain of custody
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="mt-8 overflow-x-auto rounded-3xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Certificate</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Owner</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Status</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">kWh</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {records.map((record) => (
              <tr key={record.id} className="hover:bg-gray-50">
                <td className="whitespace-nowrap px-4 py-3 font-mono text-gray-900">{record.id}</td>
                <td className="px-4 py-3 text-gray-700">{record.user}</td>
                <td className="px-4 py-3 text-gray-700">{record.status}</td>
                <td className="px-4 py-3 text-gray-700">{record.kwh}</td>
                <td className="px-4 py-3 text-gray-700">{record.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
