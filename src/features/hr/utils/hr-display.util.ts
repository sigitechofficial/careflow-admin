import type { Permission } from '@/features/auth/types'
import type {
  CareWorkforceCategory,
  EmployeeLifecycleStatus,
  HrDeploymentStatus,
  HrDocumentStatus,
  HrDocumentType,
} from '@/features/hr/api/hr.api'

export const CARE_WORKFORCE_CATEGORY_OPTIONS: { value: CareWorkforceCategory; label: string }[] = [
  { value: 'NEW_TO_CARE', label: 'New to Care' },
  { value: 'CARE_OR_SUPPORT_WORKER', label: 'Care or Support Worker' },
  { value: 'SUPERVISOR_OR_LEADER', label: 'Supervisor or Leader' },
  { value: 'PRACTITIONER', label: 'Practitioner' },
  { value: 'DEPUTY_MANAGER', label: 'Deputy Manager' },
  { value: 'REGISTERED_MANAGER', label: 'Registered Manager' },
  { value: 'NON_DIRECT_CARE', label: 'Non-direct-care' },
]

export const LIFECYCLE_STATUS_OPTIONS: { value: EmployeeLifecycleStatus; label: string }[] = [
  { value: 'PRE_EMPLOYMENT', label: 'Pre-employment' },
  { value: 'CLEARED', label: 'Cleared' },
  { value: 'ONBOARDING', label: 'Onboarding' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'ACTIVE_PAUSED', label: 'Active (Paused)' },
  { value: 'LEAVING', label: 'Leaving' },
  { value: 'LEFT', label: 'Left' },
  { value: 'ALUMNI', label: 'Alumni' },
]

export const DEPLOYMENT_STATUS_OPTIONS: { value: HrDeploymentStatus; label: string }[] = [
  { value: 'GREEN', label: 'Green' },
  { value: 'AMBER', label: 'Amber' },
  { value: 'RED', label: 'Red' },
]

export const HR_DOCUMENT_TYPE_OPTIONS: { value: HrDocumentType; label: string }[] = [
  { value: 'ID_DOCUMENT', label: 'ID Document' },
  { value: 'CONTRACT', label: 'Contract' },
  { value: 'QUALIFICATION', label: 'Qualification' },
  { value: 'CERTIFICATE', label: 'Certificate' },
  { value: 'OTHER', label: 'Other' },
]

export const HR_DOCUMENT_STATUS_OPTIONS: { value: HrDocumentStatus; label: string }[] = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
]

export function lifecycleStatusLabel(status: EmployeeLifecycleStatus): string {
  return LIFECYCLE_STATUS_OPTIONS.find(o => o.value === status)?.label ?? status
}

export function deploymentStatusLabel(status: HrDeploymentStatus): string {
  return DEPLOYMENT_STATUS_OPTIONS.find(o => o.value === status)?.label ?? status
}

export function documentTypeLabel(type: HrDocumentType | null | undefined): string {
  if (!type) return '—'
  return HR_DOCUMENT_TYPE_OPTIONS.find(o => o.value === type)?.label ?? type
}

export function documentStatusLabel(status: HrDocumentStatus | null | undefined): string {
  if (!status) return '—'
  return HR_DOCUMENT_STATUS_OPTIONS.find(o => o.value === status)?.label ?? status
}

/** "DBS (EXPIRING_SOON)" → "DBS (expiring soon)". */
export function complianceIssueLabel(label: string): string {
  return label.replace(/\(([A-Z_]+)\)$/, (_, s: string) => `(${s.toLowerCase().replace(/_/g, ' ')})`)
}

export function canWriteHrProfile(can: (p: Permission | Permission[]) => boolean): boolean {
  return can('hr.profile.update') || can('hr.profile.create')
}

export function canUploadHrDocuments(can: (p: Permission | Permission[]) => boolean): boolean {
  return can('hr.documents.upload')
}

export function canDeleteHrDocuments(can: (p: Permission | Permission[]) => boolean): boolean {
  return can('hr.documents.delete')
}

/** How close a document is to its expiry date (whole days, today = 0). Null when it has no expiry. */
export function documentExpiry(
  expiryDate: string | null | undefined,
  today = new Date(),
): { tone: 'expired' | 'soon' | 'ok'; days: number; label: string } | null {
  if (!expiryDate) return null
  const [y = 0, m = 1, d = 1] = expiryDate.slice(0, 10).split('-').map(Number)
  const days = Math.round(
    (Date.UTC(y, m - 1, d) - Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())) / 86_400_000,
  )
  if (days < 0) return { tone: 'expired', days, label: days === -1 ? 'Expired yesterday' : `Expired ${-days} days ago` }
  if (days === 0) return { tone: 'soon', days, label: 'Expires today' }
  if (days <= 30) return { tone: 'soon', days, label: days === 1 ? 'Expires tomorrow' : `Expires in ${days} days` }
  return { tone: 'ok', days, label: 'Valid' }
}
