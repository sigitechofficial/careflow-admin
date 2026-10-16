import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'
import {
  fetchEmployeeAbsences,
  type EmployeeAbsenceRow,
} from '@/features/employees/api/employee-absences.api'
import {
  PARENTAL_LEAVE_TYPES,
  type ParentalLeaveStatus,
  type ParentalLeaveType,
} from '@/features/parental-leave/constants'

/** A parental-leave record is stored as an absence row with a parental type. */
export type ParentalLeaveRow = EmployeeAbsenceRow

/** List maternity/paternity records (reuses the absence endpoint, filtered to parental types). */
export async function fetchParentalLeave(): Promise<ParentalLeaveRow[]> {
  const parental = new Set<string>(PARENTAL_LEAVE_TYPES)
  const list = await fetchEmployeeAbsences()
  return list.rows.filter(row => parental.has(row.absenceType))
}

export type CreateParentalLeaveBody = {
  employeeId: string
  absenceType: ParentalLeaveType
  fromDateTime: string
  toDateTime: string
  permissionStatus?: ParentalLeaveStatus
  notes?: string | null
}

export async function createParentalLeave(
  body: CreateParentalLeaveBody,
): Promise<ParentalLeaveRow> {
  const res = await apiJson<ApiEnvelope<ParentalLeaveRow>>('/employee-absences', {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return res.data
}
