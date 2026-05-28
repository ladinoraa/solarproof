'use client'

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

const data = [
  { day: 'Mon', energy: 14 },
  { day: 'Tue', energy: 18 },
  { day: 'Wed', energy: 16 },
  { day: 'Thu', energy: 22 },
  { day: 'Fri', energy: 20 },
  { day: 'Sat', energy: 26 },
  { day: 'Sun', energy: 24 },
]

export function DashboardChart() {
  return (
    <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-gray-500">Energy trend</p>
          <h2 className="mt-2 text-2xl font-semibold text-gray-900">Weekly generation</h2>
        </div>
        <p className="text-sm text-gray-500">Responsive chart for mobile and desktop</p>
      </div>
      <div className="h-72 min-h-[18rem] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="energyGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#6b7280' }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280' }} />
            <Tooltip wrapperStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)' }} />
            <Area type="monotone" dataKey="energy" stroke="#f59e0b" fill="url(#energyGradient)" strokeWidth={3} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}
