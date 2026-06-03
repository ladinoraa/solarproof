import { describe, expect, it } from 'vitest'
import { cn } from './utils'

describe('cn helper', () => {
  it('joins class names into a single string', () => {
    expect(cn('foo', 'bar', 'baz')).toBe('foo bar baz')
  })

  it('preserves repeated class names and joins them cleanly', () => {
    expect(cn('foo', 'foo', 'bar')).toBe('foo foo bar')
  })

  it('merges Tailwind utility classes correctly', () => {
    expect(cn('px-2', 'px-4', 'text-sm')).toBe('px-4 text-sm')
  })
})
