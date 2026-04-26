/**
 * Structured JSON logger — ships to Logtail (Better Stack) in production.
 *
 * Usage:
 *   import { logger } from '@/lib/logger'
 *   logger.info('reading.anchored', { txHash, kwh })
 *   logger.error('mint.failed', { error, readingId })
 *
 *   // With correlation ID:
 *   const log = logger.withCorrelationId('req-abc-123')
 *   log.info('reading.anchored', { txHash })
 *
 * Required env var (production):
 *   LOGTAIL_SOURCE_TOKEN — from Better Stack → Sources → your source
 *
 * Optional env var:
 *   LOG_LEVEL — one of debug|info|warn|error (default: info)
 */

type Level = 'debug' | 'info' | 'warn' | 'error'

const LEVELS: Record<Level, number> = { debug: 0, info: 1, warn: 2, error: 3 }

function configuredLevel(): Level {
  const raw = (process.env.LOG_LEVEL ?? 'info').toLowerCase()
  return (raw in LEVELS ? raw : 'info') as Level
}

interface LogEntry {
  level: Level
  event: string
  timestamp: string
  correlationId?: string
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

function log(level: Level, event: string, meta: Record<string, unknown> = {}, correlationId?: string) {
  if (LEVELS[level] < LEVELS[configuredLevel()]) return

  const entry: LogEntry = {
    level,
    event,
    timestamp: new Date().toISOString(),
    ...(correlationId ? { correlationId } : {}),
    ...meta,
  }
  // Always write to stdout (captured by Vercel function logs too)
  console[level === 'debug' ? 'log' : level](JSON.stringify(entry))
  // Ship to Logtail asynchronously — do not await
  void ship(entry)
}

export interface Logger {
  debug: (event: string, meta?: Record<string, unknown>) => void
  info:  (event: string, meta?: Record<string, unknown>) => void
  warn:  (event: string, meta?: Record<string, unknown>) => void
  error: (event: string, meta?: Record<string, unknown>) => void
  withCorrelationId: (id: string) => Omit<Logger, 'withCorrelationId'>
}

export const logger: Logger = {
  debug: (event, meta) => log('debug', event, meta),
  info:  (event, meta) => log('info',  event, meta),
  warn:  (event, meta) => log('warn',  event, meta),
  error: (event, meta) => log('error', event, meta),
  withCorrelationId: (id: string) => ({
    debug: (event, meta) => log('debug', event, meta, id),
    info:  (event, meta) => log('info',  event, meta, id),
    warn:  (event, meta) => log('warn',  event, meta, id),
    error: (event, meta) => log('error', event, meta, id),
  }),
}
