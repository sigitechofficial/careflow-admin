import type { EmployeeDetail, EmployeeListRow } from '@/features/employees/api/employees.api'

export function employeeListRowDisplayName(
  row: Pick<EmployeeListRow, 'id' | 'fullName' | 'firstName' | 'lastName'>,
): string {
  const fromFull = row.fullName?.trim()
  if (fromFull) return fromFull
  const fromParts = [row.firstName, row.lastName].filter(Boolean).join(' ').trim()
  return fromParts || 'Unknown employee'
}

export function employeeDetailDisplayName(employee: EmployeeDetail): string {
  const p = employee.personalDetail
  const fromParts = [p?.firstName, p?.lastName].filter(Boolean).join(' ').trim()
  return fromParts || 'Unknown employee'
}

export function buildEmployeeNameMap(rows: EmployeeListRow[]): Map<string, string> {
  const map = new Map<string, string>()
  for (const row of rows) {
    map.set(row.id, employeeListRowDisplayName(row))
  }
  return map
}

export function resolveEmployeeDisplayName(map: Map<string, string>, employeeId: string): string {
  return map.get(employeeId) ?? 'Unknown employee'
}

export function formatAssignedEmployeeNames(
  employeeIds: string[],
  nameById: Map<string, string>,
): string {
  if (employeeIds.length === 0) return '—'
  return employeeIds.map((id) => resolveEmployeeDisplayName(nameById, id)).join(', ')
}
