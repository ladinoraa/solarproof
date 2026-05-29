import { getRequestConfig } from 'next-intl/server'
import { cookies } from 'next/headers'
import { locales, defaultLocale, type Locale } from '@/lib/locales'

export { locales, defaultLocale, type Locale } from '@/lib/locales'

export default getRequestConfig(async () => {
  const cookieStore = await cookies()
  const locale = (cookieStore.get('locale')?.value ?? defaultLocale) as Locale
  const safe = locales.includes(locale) ? locale : defaultLocale
  return {
    locale: safe,
    messages: (await import(`../messages/${safe}.json`)).default,
  }
})
