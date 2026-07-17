import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'

export const ABSENCE_TYPES = [
  'Holiday',
  'Days Off',
  'Sickness',
  'Non-working Time',
  'Unauthorised',
  'Other',
] as const
export type AbsenceType = (typeof ABSENCE_TYPES)[number]

export const ABSENCE_PERMISSION_STATUSES = ['Authorised', 'Unauthorised', 'Pending'] as const
export type AbsencePermissionStatus = (typeof ABSENCE_PERMISSION_STATUSES)[number]

export type EmployeeAbsenceRow = {
  id: string
  recordId: string
  recordNo: number
  employeeId: string
  /** Set when the record was auto-created from a holiday booking. */
  holidayId: string | null
  employeeActive: boolean
  workerNumber: string | null
  firstName: string
  surname: string
  employeeName: string
  absenceType: string
  fromDateTime: string
  toDateTime: string
  durationDays: number
  durationHours: number
  month: string
  year: number
  monthYear: string
  monthKey: string
  sicknessFlag: boolean
  lastMinuteFlag: boolean
  notes: string | null
  countryVisited: string | null
  trackerStatus: string | null
  returnToWorkCompleted: boolean
  evidenceNotesStatus: string | null
  managerAction: string | null
  comments: string | null
  sponsored: boolean
  immigrationLabel: string | null
  cosWorkerRef: string | null
  visaRtwExpiry: string | null
  permissionStatus: string
  evidenceTypeRequired: string | null
  evidenceHeld: boolean
  evidenceReceivedDate: string | null
  continuousWorkingDaysAbsent: number
  continuousDaysOverridden: boolean
  smsTrigger: string
  smsTriggered: boolean
  smsDeadline: string | null
  smsReported: boolean | null
  smsReportDate: string | null
  riskRating: string
  ukviActionRequired: string
  responsiblePerson: string | null
  nextReviewDate: string | null
  createdAt: string
  updatedAt: string
}

export type EmployeeAbsencesList = {
  recordCount: number
  totals: {
    durationDays: number
    durationHours: number
    sicknessCount: number
    lastMinuteCount: number
    unauthorisedCount: number
    smsTriggerCount: number
    sponsoredCount: number
  }
  rows: EmployeeAbsenceRow[]
}

export type EmployeeAbsencesParams = {
  month?: string
  employeeId?: string
  absenceType?: AbsenceType
  permissionStatus?: AbsencePermissionStatus
  search?: string
  sponsoredOnly?: boolean
  sicknessOnly?: boolean
  lastMinuteOnly?: boolean
  smsTriggerOnly?: boolean
}

export async function fetchEmployeeAbsences(
  params?: EmployeeAbsencesParams,
): Promise<EmployeeAbsencesList> {
  const qs = new URLSearchParams()
  if (params?.month) qs.set('month', params.month)
  if (params?.employeeId) qs.set('employeeId', params.employeeId)
  if (params?.absenceType) qs.set('absenceType', params.absenceType)
  if (params?.permissionStatus) qs.set('permissionStatus', params.permissionStatus)
  if (params?.search?.trim()) qs.set('search', params.search.trim())
  if (params?.sponsoredOnly) qs.set('sponsoredOnly', 'true')
  if (params?.sicknessOnly) qs.set('sicknessOnly', 'true')
  if (params?.lastMinuteOnly) qs.set('lastMinuteOnly', 'true')
  if (params?.smsTriggerOnly) qs.set('smsTriggerOnly', 'true')
  const suffix = qs.toString() ? `?${qs.toString()}` : ''
  const res = await apiJson<ApiEnvelope<EmployeeAbsencesList>>(`/employee-absences${suffix}`, {
    method: 'GET',
  })
  return res.data
}

export type EmployeeAbsenceBody = {
  absenceType?: AbsenceType
  fromDateTime?: string
  toDateTime?: string
  sicknessFlag?: boolean
  lastMinuteFlag?: boolean
  notes?: string | null
  countryVisited?: string | null
  trackerStatus?: string | null
  returnToWorkCompleted?: boolean
  evidenceNotesStatus?: string | null
  managerAction?: string | null
  comments?: string | null
  cosWorkerRef?: string | null
  visaRtwExpiry?: string | null
  permissionStatus?: AbsencePermissionStatus
  evidenceTypeRequired?: string | null
  evidenceHeld?: boolean
  evidenceReceivedDate?: string | null
  continuousWorkingDaysAbsent?: number | null
  smsReported?: boolean | null
  smsReportDate?: string | null
  responsiblePerson?: string | null
  nextReviewDate?: string | null
}

export async function createEmployeeAbsence(
  body: EmployeeAbsenceBody & {
    employeeId: string
    absenceType: AbsenceType
    fromDateTime: string
    toDateTime: string
  },
): Promise<EmployeeAbsenceRow> {
  const res = await apiJson<ApiEnvelope<EmployeeAbsenceRow>>('/employee-absences', {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return res.data
}

export async function updateEmployeeAbsence(
  id: string,
  body: EmployeeAbsenceBody,
): Promise<EmployeeAbsenceRow> {
  const res = await apiJson<ApiEnvelope<EmployeeAbsenceRow>>(`/employee-absences/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
  return res.data
}

export async function deleteEmployeeAbsence(id: string): Promise<void> {
  await apiJson<ApiEnvelope<unknown>>(`/employee-absences/${id}`, { method: 'DELETE' })
}
