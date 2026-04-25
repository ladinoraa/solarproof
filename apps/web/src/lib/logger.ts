/**
 * Structured JSON logger — ships to Logtail (Better Stack) in production.
 *
 * Usage:
 *   import { logger } from '@/lib/logger'
 *   logger.info('reading.anchored', { txHash, kwh })
 *   logger.error('mint.failed', { error, readingId })
 *
 * Required env var (production):
 *   LOGTAIL_SOURCE_TOKEN — from Better Stack → Sources → your source
 */

type Level = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  level: Level
  event: string
  timestamp: string
  [key: string]: unknown
}

async function ship(entry: LogEntry) {
  const token = process.env.LOGTAIL_SOURCE_TOKEN
  if (!token) return // local dev — stdout only

  await fetch('https://in.logs.betterstack.com', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(entry),
  }).catch(() => {
    // never let logging break the request
  })
}

function log(level: Level, event: string, meta: Record<string, unknown> = {}) {
  const entry: LogEntry = {
    level,
    event,
    timestamp: new Date().toISOString(),
    ...meta,
  }
  // Always write to stdout (captured by Vercel function logs too)
  console[level === 'debug' ? 'log' : level](JSON.stringify(entry))
  // Ship to Logtail asynchronously — do not await
  void ship(entry)
}

export const logger = {
  debug: (event: string, meta?: Record<string, unknown>) => log('debug', event, meta),
  info:  (event: string, meta?: Record<string, unknown>) => log('info',  event, meta),
  warn:  (event: string, meta?: Record<string, unknown>) => log('warn',  event, meta),
  error: (event: string, meta?: Record<string, unknown>) => log('error', event, meta),
}
