import type { EmployeeListRow } from '@/features/employees/api'
import { formatOrganisationDate } from '@/shared/lib/organisation-display-format.store'

export function isEmployeeEmploymentEnded(emp: Pick<EmployeeListRow, 'employmentEndDate'>): boolean {
  const raw = emp.employmentEndDate
  if (!raw) return false
  const end = new Date(raw)
  if (Number.isNaN(end.getTime())) return false
  return end.getTime() < Date.now()
}

export function formatStaffListHolidayEnd(iso: string | null | undefined): string {
  if (!iso) return ''
  const formatted = formatOrganisationDate(iso)
  return formatted === '—' ? '' : formatted
}
