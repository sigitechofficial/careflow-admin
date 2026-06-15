import { ApiError } from '@/shared/api/api-client'

export type AllocationWarning = { type: string; message: string; severity: string }

export function warningsFromAllocateError(e: unknown): AllocationWarning[] {
  if (!(e instanceof ApiError)) return []
  const body = e.body
  if (!body || typeof body !== 'object') return []
  const record = body as Record<string, unknown>
  if (Array.isArray(record.warnings)) return record.warnings as AllocationWarning[]
  const msg = record.message
  if (msg && typeof msg === 'object' && !Array.isArray(msg)) {
    const nested = msg as Record<string, unknown>
    if (Array.isArray(nested.warnings)) return nested.warnings as AllocationWarning[]
  }
  return []
}

export function allocationWarningsSummary(warnings: AllocationWarning[]): string {
  const blocking = warnings.filter((w) => w.severity === 'blocking')
  const list = (blocking.length > 0 ? blocking : warnings).map((w) => w.message)
  return list.slice(0, 2).join(' · ')
}
