import type { UpdateEmployeeCompliancePayload } from '@/features/employees/api/employee-compliance-api'

export function complianceIsoToDateInput(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10)
}

export function complianceDatesToPayload(
  issueDate: string,
  expiryDate: string,
): UpdateEmployeeCompliancePayload {
  const body: UpdateEmployeeCompliancePayload = {}
  if (issueDate.trim()) body.issueDate = new Date(`${issueDate.trim()}T12:00:00.000Z`).toISOString()
  else body.issueDate = null
  if (expiryDate.trim()) body.expiryDate = new Date(`${expiryDate.trim()}T12:00:00.000Z`).toISOString()
  else body.expiryDate = null
  return body
}
