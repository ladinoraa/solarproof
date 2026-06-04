'use client'

import { useTheme } from 'next-themes'
import { Moon, Sun } from 'lucide-react'

export default function SettingsPage() {
  const { resolvedTheme, setTheme, systemTheme } = useTheme()
  const theme = resolvedTheme === 'system' ? systemTheme : resolvedTheme

  function toggleTheme() {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-4 text-2xl font-bold text-gray-900 dark:text-gray-100">User settings</h1>
      <div className="grid gap-6 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950">
        <section>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Theme</h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Use dark mode for better low-light readability. Your preference is saved in localStorage.
              </p>
            </div>
            <button
              type="button"
              onClick={toggleTheme}
              className="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-900 transition hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" aria-hidden="true" /> : <Moon className="h-4 w-4" aria-hidden="true" />}
              {theme === 'dark' ? 'Light mode' : 'Dark mode'}
            </button>
          </div>
        </section>

        <section className="rounded-3xl bg-gray-50 p-5 dark:bg-gray-900">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            Current theme: <span className="font-semibold text-gray-900 dark:text-gray-100">{theme || 'system'}</span>
          </p>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            SolarProof stores your theme selection in localStorage under <code className="rounded bg-gray-100 px-1.5 py-0.5 dark:bg-gray-800">solarproof-theme</code>.
          </p>
        </section>
      </div>
    </div>
  )
}
