import type {
  ComplianceChecklistItem,
  EmployeeComplianceDocumentRow,
  EmployeeComplianceStatus,
} from '@/features/employees/api/employee-compliance-api'

export type ComplianceStatusFilter =
  | 'all'
  | 'missing_pending'
  | 'not_required'
  | 'provided'
  | 'expired'
  | 'near_expiry'
  | 'recently_updated'

export type ComplianceDocumentVersionFilter = 'new' | 'previous' | 'all'

/** Default window for “Recently updated” (latest upload or record update). */
export const COMPLIANCE_RECENTLY_UPDATED_DAYS = 30

export const COMPLIANCE_STATUS_FILTER_OPTIONS: { value: ComplianceStatusFilter; label: string }[] = [
  { value: 'all', label: 'All statuses' },
  { value: 'missing_pending', label: 'Missing / pending' },
  { value: 'not_required', label: 'Not required' },
  { value: 'provided', label: 'Provided' },
  { value: 'expired', label: 'Expired' },
  { value: 'near_expiry', label: 'Near expiry' },
  { value: 'recently_updated', label: 'Recently updated' },
]

export const COMPLIANCE_DOCUMENT_VERSION_OPTIONS: {
  value: ComplianceDocumentVersionFilter
  label: string
}[] = [
  { value: 'new', label: 'New document' },
  { value: 'previous', label: 'Previous document' },
  { value: 'all', label: 'All documents' },
]

const MISSING_PENDING: EmployeeComplianceStatus[] = ['MISSING', 'REQUIRED', 'PENDING_REVIEW']
const PROVIDED: EmployeeComplianceStatus[] = ['VALID', 'SUBMITTED']

export function sortDocsNewestFirst(
  docs: EmployeeComplianceDocumentRow[],
): EmployeeComplianceDocumentRow[] {
  return [...docs].sort((a, b) => {
    const ta = Date.parse(a.uploadedAt)
    const tb = Date.parse(b.uploadedAt)
    if (Number.isFinite(tb) && Number.isFinite(ta) && tb !== ta) return tb - ta
    return b.id.localeCompare(a.id)
  })
}

function latestActivityMs(item: ComplianceChecklistItem): number | null {
  const docs = sortDocsNewestFirst(item.record?.documents ?? [])
  const uploadMs = docs[0] ? Date.parse(docs[0].uploadedAt) : NaN
  const updatedMs = item.record?.updatedAt ? Date.parse(item.record.updatedAt) : NaN
  const candidates = [uploadMs, updatedMs].filter(Number.isFinite)
  if (candidates.length === 0) return null
  return Math.max(...candidates)
}

function effectiveStatus(item: ComplianceChecklistItem): EmployeeComplianceStatus | null {
  if (item.record?.isNoLongerRequired) return 'NO_LONGER_REQUIRED'
  if (item.record?.status) return item.record.status
  return null
}

export function matchesComplianceStatusFilter(
  item: ComplianceChecklistItem,
  filter: ComplianceStatusFilter,
  now: Date = new Date(),
  recentDays = COMPLIANCE_RECENTLY_UPDATED_DAYS,
): boolean {
  if (filter === 'all') return true

  const status = effectiveStatus(item)
  const docs = item.record?.documents ?? []

  switch (filter) {
    case 'missing_pending': {
      if (!item.record) return true
      if (item.record.isNoLongerRequired) return false
      return status != null && MISSING_PENDING.includes(status)
    }
    case 'not_required':
      return Boolean(item.record?.isNoLongerRequired) || status === 'NO_LONGER_REQUIRED' || status === 'NOT_REQUIRED'
    case 'provided': {
      if (!item.record || item.record.isNoLongerRequired) return false
      if (status === 'EXPIRED' || status === 'MISSING' || status === 'REQUIRED') return false
      if (docs.length > 0) return true
      return status != null && PROVIDED.includes(status)
    }
    case 'expired':
      return status === 'EXPIRED'
    case 'near_expiry':
      return status === 'EXPIRING_SOON'
    case 'recently_updated': {
      const ms = latestActivityMs(item)
      if (ms == null) return false
      const horizon = now.getTime() - recentDays * 86_400_000
      return ms >= horizon
    }
    default:
      return true
  }
}

export function matchesComplianceDocumentVersionFilter(
  item: ComplianceChecklistItem,
  filter: ComplianceDocumentVersionFilter,
): boolean {
  if (filter === 'all' || filter === 'new') return true
  const docs = item.record?.documents ?? []
  return docs.length > 1
}

export function docsForVersionFilter(
  docs: EmployeeComplianceDocumentRow[],
  filter: ComplianceDocumentVersionFilter,
): { current: EmployeeComplianceDocumentRow | null; previous: EmployeeComplianceDocumentRow[] } {
  const sorted = sortDocsNewestFirst(docs)
  const current = sorted[0] ?? null
  const previous = sorted.slice(1)
  if (filter === 'new') return { current, previous: [] }
  if (filter === 'previous') return { current: null, previous }
  return { current, previous }
}

export function filterComplianceChecklistItems(
  items: ComplianceChecklistItem[],
  opts: {
    statusFilter: ComplianceStatusFilter
    versionFilter: ComplianceDocumentVersionFilter
    hideNoLongerRequired: boolean
    now?: Date
  },
): ComplianceChecklistItem[] {
  const now = opts.now ?? new Date()
  return items.filter(item => {
    if (
      opts.hideNoLongerRequired &&
      opts.statusFilter !== 'not_required' &&
      item.record?.isNoLongerRequired
    ) {
      return false
    }
    if (!matchesComplianceStatusFilter(item, opts.statusFilter, now)) return false
    if (!matchesComplianceDocumentVersionFilter(item, opts.versionFilter)) return false
    return true
  })
}

export function formatComplianceUploaderLabel(
  uploadedBy: EmployeeComplianceDocumentRow['uploadedBy'],
): string {
  if (!uploadedBy) return 'Unknown uploader'
  const name = [uploadedBy.firstName, uploadedBy.lastName].filter(Boolean).join(' ').trim()
  if (name) return name
  return uploadedBy.email || 'Unknown uploader'
}
