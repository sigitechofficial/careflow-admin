import type { EmployeeListRow } from '@/features/employees/api'

export function isEmployeeEmploymentEnded(emp: Pick<EmployeeListRow, 'employmentEndDate'>): boolean {
  const raw = emp.employmentEndDate
  if (!raw) return false
  const end = new Date(raw)
  if (Number.isNaN(end.getTime())) return false
  return end.getTime() < Date.now()
}

export function formatStaffListHolidayEnd(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}
