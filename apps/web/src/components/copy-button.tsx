'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

interface CopyButtonProps {
  value: string
  label?: string
  className?: string
  iconSize?: number
}

export function CopyButton({ value, label, className = '', iconSize = 14 }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <button
      onClick={handleCopy}
      aria-label={label || `Copy ${value}`}
      title={copied ? 'Copied!' : 'Copy to clipboard'}
      className={`inline-flex items-center gap-1 rounded p-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-1 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200 ${className}`}
    >
      {copied ? (
        <Check className="text-green-600 dark:text-green-400" style={{ width: iconSize, height: iconSize }} aria-hidden="true" />
      ) : (
        <Copy style={{ width: iconSize, height: iconSize }} aria-hidden="true" />
      )}
      <span className="sr-only">{copied ? 'Copied' : 'Copy'}</span>
    </button>
  )
}

interface CopyableTextProps {
  value: string
  displayValue?: string
  mono?: boolean
  className?: string
}

export function CopyableText({ value, displayValue, mono = true, className = '' }: CopyableTextProps) {
  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      <span className={mono ? 'font-mono text-xs' : ''}>
        {displayValue || value}
      </span>
      <CopyButton value={value} iconSize={12} />
    </span>
  )
}
