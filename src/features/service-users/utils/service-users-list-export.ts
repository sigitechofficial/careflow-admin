import type { ServiceUserListRow } from '@/features/service-users/types'
import { formatServiceUserBranchLabel } from '@/features/settings/location-management/format-service-user-branch-label'

function csvEscape(value: string | number | null | undefined): string {
  const s = value == null ? '' : String(value)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function employeeName(
  brief: ServiceUserListRow['keyWorker'] | ServiceUserListRow['namedNurse'],
): string {
  if (!brief) return ''
  const name = [brief.firstName, brief.lastName].filter(Boolean).join(' ').trim()
  return name || brief.id
}

function displayName(row: ServiceUserListRow): string {
  const legal = [row.firstName, row.lastName].filter(Boolean).join(' ').trim()
  if (row.preferredName?.trim()) {
    return legal ? `${legal} (${row.preferredName.trim()})` : row.preferredName.trim()
  }
  return legal
}

const CSV_HEADERS = [
  'Service user number',
  'First name',
  'Last name',
  'Preferred name',
  'Display name',
  'Date of birth',
  'Status',
  'Active',
  'Care type',
  'Funding type',
  'Risk level',
  'Location',
  'Key worker',
  'Named nurse',
  'Service start date',
  'Care plan status',
  'Active flash',
  'Active absence',
  'Created at',
  'Created by',
  'Id',
] as const

function rowToCsvCells(row: ServiceUserListRow): string[] {
  const location = formatServiceUserBranchLabel({
    locationId: row.location?.id,
    locationName: row.location?.name,
    zoneName: row.location?.zoneName,
    branchName: row.location?.branchName,
    branchLayers: row.location?.branchLayers,
    displayLabel: row.location?.displayLabel,
  })
  return [
    row.serviceUserNumber ?? '',
    row.firstName,
    row.lastName,
    row.preferredName ?? '',
    displayName(row),
    row.dateOfBirth ?? '',
    row.status?.name ?? '',
    row.isActive ? 'Yes' : 'No',
    row.careType?.name ?? '',
    row.fundingType?.name ?? '',
    row.riskLevel?.name ?? row.riskLevel?.code ?? '',
    location,
    employeeName(row.keyWorker),
    employeeName(row.namedNurse),
    row.serviceStartDate ?? '',
    row.carePlanListStatus ?? '',
    row.hasActiveFlashMessage ? 'Yes' : 'No',
    row.hasActiveAbsence ? 'Yes' : 'No',
    row.createdAt ?? '',
    row.createdByName ?? '',
    row.id,
  ]
}

/** Download a CSV of the given service-user list rows (client-side). */
export function exportServiceUsersListCsv(
  rows: ServiceUserListRow[],
  filenameStem = 'service-users',
): void {
  const lines = [
    CSV_HEADERS.join(','),
    ...rows.map((row) => rowToCsvCells(row).map(csvEscape).join(',')),
  ]
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const stamp = new Date().toISOString().slice(0, 10)
  a.download = `${filenameStem}-${stamp}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
