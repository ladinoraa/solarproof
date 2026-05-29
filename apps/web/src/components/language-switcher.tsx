'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { locales, LOCALE_LABELS, LOCALE_NAMES, type Locale } from '@/lib/locales'

interface Props {
  current: Locale
}

export function LanguageSwitcher({ current }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  function switchLocale(locale: Locale) {
    document.cookie = `locale=${locale};path=/;max-age=31536000;SameSite=Lax`
    startTransition(() => router.refresh())
  }

  return (
    <div role="group" aria-label="Language selector">
      <select
        value={current}
        onChange={(e) => switchLocale(e.target.value as Locale)}
        aria-label="Select language"
        className="cursor-pointer appearance-none rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-yellow-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
      >
        {locales.map((l) => (
          <option key={l} value={l} aria-label={LOCALE_NAMES[l]}>
            {LOCALE_LABELS[l]}
          </option>
        ))}
      </select>
    </div>
  )
}
