'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { Menu, Sun, X } from 'lucide-react'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/meters', label: 'Meters' },
  { href: '/certificates', label: 'Certificates' },
  { href: '/governance', label: 'Governance' },
  { href: '/verify', label: 'Verify' },
]

export function Navbar() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open || !menuRef.current) return

    const focusableElements = Array.from(
      menuRef.current.querySelectorAll<HTMLElement>('a, button')
    ).filter((element) => !element.hasAttribute('disabled'))

    focusableElements[0]?.focus()

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        setOpen(false)
      }

      if (event.key !== 'Tab' || focusableElements.length === 0) {
        return
      }

      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault()
        lastElement.focus()
      }

      if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault()
        firstElement.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-semibold text-gray-900" aria-label="SolarProof home">
          <Sun className="h-5 w-5 text-yellow-500" aria-hidden="true" />
          SolarProof
        </Link>

        <div className="hidden items-center gap-6 md:flex" role="menubar" aria-label="Primary navigation">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm ${pathname === link.href ? 'font-semibold text-gray-900' : 'text-gray-600 hover:text-gray-900'}`}
              aria-current={pathname === link.href ? 'page' : undefined}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center justify-center rounded-full border border-gray-200 bg-white p-2 text-gray-700 transition hover:bg-gray-50 md:hidden"
          aria-label="Open mobile menu"
          aria-expanded={open}
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      {open && (
        <div className="md:hidden">
          <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={() => setOpen(false)} aria-hidden="true" />
          <div
            ref={menuRef}
            className="fixed inset-x-4 top-4 z-50 rounded-3xl border border-gray-200 bg-white p-6 shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-label="Mobile navigation menu"
          >
            <div className="mb-6 flex items-center justify-between">
              <span className="flex items-center gap-2 font-semibold text-gray-900">
                <Sun className="h-5 w-5 text-yellow-500" aria-hidden="true" />
                Menu
              </span>
              <button
                type="button"
                ref={(button) => button && button.focus()}
                onClick={() => setOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-gray-700 transition hover:bg-gray-50"
                aria-label="Close mobile menu"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <div className="space-y-3">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`block rounded-2xl px-4 py-3 text-base ${pathname === link.href ? 'bg-gray-100 font-semibold text-gray-900' : 'text-gray-700 hover:bg-gray-50'}`}
                  aria-current={pathname === link.href ? 'page' : undefined}
                  onClick={() => setOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
