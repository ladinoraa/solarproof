'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Sun, Moon, Menu, X, Wallet, LogOut } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useRef, useState } from 'react'
import { useWallet } from '@/hooks/useWallet'
import { useTranslations } from 'next-intl'
import { LanguageSwitcher } from '@/components/language-switcher'
import type { Locale } from '@/lib/locales'

interface NavbarProps {
  locale: Locale
}

export function Navbar({ locale }: NavbarProps) {
  const t = useTranslations('nav')
  const pathname = usePathname()
  const { resolvedTheme, setTheme } = useTheme()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const { address, connected, loading: walletLoading, connect, disconnect } = useWallet()

  const links = [
    { href: '/dashboard', label: t('dashboard') },
    { href: '/meters', label: t('meters') },
    { href: '/certificates', label: t('certificates') },
    { href: '/governance', label: t('governance') },
    { href: '/verify', label: t('verify') },
  ]

  // Close menu on route change
  useEffect(() => { setMenuOpen(false) }, [pathname])

  // Close menu on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        !menuButtonRef.current?.contains(e.target as Node)
      ) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])

  // Trap focus inside mobile menu when open
  useEffect(() => {
    if (!menuOpen) return
    const focusable = menuRef.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])')
    focusable?.[0]?.focus()

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setMenuOpen(false)
        menuButtonRef.current?.focus()
      }
      if (e.key === 'Tab' && focusable && focusable.length > 0) {
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault(); last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault(); first.focus()
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [menuOpen])

  return (
    <nav
      className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
      aria-label="Main navigation"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 font-semibold text-gray-900 dark:text-gray-100"
          aria-label="SolarProof home"
        >
          <Sun className="h-5 w-5 text-yellow-500" aria-hidden="true" />
          SolarProof
        </Link>

        {/* Desktop nav links */}
        <div className="hidden items-center gap-6 md:flex" role="list">
          {links.map((l) => {
            const active = pathname === l.href
            return (
              <Link
                key={l.href}
                href={l.href}
                role="listitem"
                aria-current={active ? 'page' : undefined}
                className={`text-sm transition-colors ${
                  active
                    ? 'font-medium text-gray-900 dark:text-gray-100'
                    : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
                }`}
              >
                {l.label}
              </Link>
            )
          })}
        </div>

        {/* Right side: language switcher + theme toggle + wallet + hamburger */}
        <div className="flex items-center gap-2">
          {/* Language switcher */}
          <div className="hidden md:block">
            <LanguageSwitcher current={locale} />
          </div>

          {/* Wallet connect */}
          {!walletLoading && (
            connected && address ? (
              <button
                onClick={disconnect}
                title={address}
                aria-label={`${t('disconnectWallet')} ${address.slice(0, 6)}…`}
                className="hidden items-center gap-1.5 rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 md:flex"
              >
                <Wallet className="h-3.5 w-3.5" aria-hidden="true" />
                {address.slice(0, 4)}…{address.slice(-4)}
                <LogOut className="h-3 w-3 ml-0.5 text-gray-400" aria-hidden="true" />
              </button>
            ) : (
              <button
                onClick={() => connect().catch(() => {})}
                aria-label={t('connectWallet')}
                className="hidden items-center gap-1.5 rounded-md bg-yellow-400 px-3 py-1.5 text-xs font-medium text-gray-900 transition-colors hover:bg-yellow-500 md:flex"
              >
                <Wallet className="h-3.5 w-3.5" aria-hidden="true" />
                {t('connectWallet')}
              </button>
            )
          )}

          {/* Dark mode toggle */}
          <button
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            aria-label={resolvedTheme === 'dark' ? t('switchLight') : t('switchDark')}
            className="rounded-md p-2 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
          >
            {resolvedTheme === 'dark' ? (
              <Sun className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Moon className="h-4 w-4" aria-hidden="true" />
            )}
          </button>

          {/* Hamburger — mobile only */}
          <button
            ref={menuButtonRef}
            onClick={() => setMenuOpen((o) => !o)}
            aria-label={menuOpen ? t('closeMenu') : t('openMenu')}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            className="rounded-md p-2 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100 md:hidden"
          >
            {menuOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div
          id="mobile-menu"
          ref={menuRef}
          role="dialog"
          aria-label="Navigation menu"
          aria-modal="true"
          className="border-t border-gray-200 bg-white px-4 pb-4 pt-2 dark:border-gray-800 dark:bg-gray-900 md:hidden"
        >
          <nav aria-label="Mobile navigation">
            <ul className="space-y-1">
              {links.map((l) => {
                const active = pathname === l.href
                return (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      aria-current={active ? 'page' : undefined}
                      className={`block rounded-md px-3 py-2 text-sm transition-colors ${
                        active
                          ? 'bg-yellow-50 font-medium text-gray-900 dark:bg-yellow-900/20 dark:text-yellow-300'
                          : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-gray-100'
                      }`}
                    >
                      {l.label}
                    </Link>
                  </li>
                )
              })}
            </ul>
            {/* Language switcher in mobile menu */}
            <div className="mt-3 px-3">
              <LanguageSwitcher current={locale} />
            </div>
          </nav>
        </div>
      )}
    </nav>
  )
}
