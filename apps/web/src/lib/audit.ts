import { createServiceClient } from './supabase'

export type AuditAction =
  | 'reading.submitted'
  | 'reading.anchored'
  | 'certificate.minted'
  | 'certificate.retired'
  | 'meter.registered'
  | 'meter.revoked'

export async function writeAuditLog(params: {
  actor: string
  action: AuditAction
  resource: string
  resource_id?: string
  ip?: string
  metadata?: Record<string, unknown>
}) {
  const db = createServiceClient()
  await db.from('audit_logs').insert({
    actor: params.actor,
    action: params.action,
    resource: params.resource,
    resource_id: params.resource_id ?? null,
    ip: params.ip ?? null,
    metadata: params.metadata ?? null,
  })
}
