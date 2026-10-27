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

/**
 * True when drag-assign should fail (rota clash, blocked carer, compliance block, missing employee,
 * or over the carer's weekly hours with Settings → Dom Rules on "Don't allow").
 */
export function isDragAllocationHardBlock(warnings: AllocationWarning[]): boolean {
  return warnings.some((w) => {
    if (w.severity !== 'blocking') return false
    if (
      w.type === 'TIME_CONFLICT' ||
      w.type === 'BLOCKED_CARER' ||
      w.type === 'COMPLIANCE_BLOCK' ||
      w.type === 'CAPACITY_EXCEEDED'
    ) {
      return true
    }
    if (w.type !== 'EMPLOYEE_NOT_AVAILABLE') return false
    return (
      w.message.includes('not found') ||
      w.message.includes('inactive') ||
      w.message.includes('no active personal')
    )
  })
}

export type TeamCarerWarnings = {
  employeeId: string
  name: string
  hardBlocked: boolean
  requiresConfirmation: boolean
  warnings: AllocationWarning[]
}

/** Per-carer warnings from POST /scheduled-jobs/:id/allocate-team (nothing was saved). */
export function teamWarningsFromAllocateError(e: unknown): {
  carers: TeamCarerWarnings[]
  /** True when every warning can be overridden with "Assign anyway". */
  canForce: boolean
} | null {
  if (!(e instanceof ApiError)) return null
  const body = e.body
  if (!body || typeof body !== 'object') return null
  const record = body as Record<string, unknown>
  if (!Array.isArray(record.carers)) return null
  const carers = (record.carers as TeamCarerWarnings[]).filter(
    (c) => c && typeof c.employeeId === 'string',
  )
  const flagged = carers.filter((c) => c.hardBlocked || c.warnings?.length)
  if (!flagged.length) return null
  const anyHardBlock = carers.some((c) => c.hardBlocked)
  return {
    carers: flagged,
    canForce: !anyHardBlock && record.requiresConfirmation === true,
  }
}
