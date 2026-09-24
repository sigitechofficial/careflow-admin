import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'

export type EmployeeHourBand = 'under_10' | '10_20' | '20_30' | '30_40' | 'over_40'
export type EmployeeHourMetric = 'worked' | 'assigned' | 'weekly'
export type EmployeeStaffKind = 'all' | 'permanent' | 'bank' | 'agency'

export type EmployeeHoursFacetOption = {
  id: string
  name: string
  count: number
}

export type EmployeeHoursRow = {
  employeeId: string
  employeeName: string
  employeeNumber: string | null
  isActive: boolean
  roleName: string | null
  jobTitleName: string | null
  contractTypeName: string | null
  branchName: string | null
  startDate: string | null
  isBankStaff: boolean
  isAgencyStaff: boolean
  optedOutOf48Hours: boolean
  immigration: { id: string; label: string; capHours: number } | null
  capOverrideActive: boolean
  effectiveCapHours: number | null
  weeklyHours: number | null
  maximumHours: number | null
  minimumHours: number | null
  guaranteedHours: number | null
  assignedHours: number
  hoursWorked: number
  hoursOver40: number
  hoursOverCap: number
  utilisationPct: number | null
  remainingContractHours: number | null
  remainingCapHours: number | null
  assignedVisits: number
  workedVisits: number
  /** Visits started >15 min after the planned start this week. */
  lateVisits: number
  /** Worked hours per weekday, Monday = index 0. */
  dayHours: number[]
  hourBand: EmployeeHourBand
}

export type EmployeeHoursWeeklySummary = {
  weekStart: string
  weekEnd: string
  organisationTimezone?: string
  overtimeThresholdHours: number
  bandMetric: EmployeeHourMetric
  hourBand: EmployeeHourBand | null
  bandCounts: Record<EmployeeHourBand, number>
  employeeCount: number
  totals: {
    contractedHours: number
    assignedHours: number
    hoursWorked: number
    hoursOver40: number
    hoursOverCap: number
    assignedVisits: number
    workedVisits: number
    averageWeeklyHours: number | null
    averageUtilisationPct: number | null
    overContractCount: number
    overCapCount: number
    over40Count: number
  }
  facets: {
    roles: EmployeeHoursFacetOption[]
    jobTitles: EmployeeHoursFacetOption[]
    contractTypes: EmployeeHoursFacetOption[]
    locations: EmployeeHoursFacetOption[]
    visaTypes: EmployeeHoursFacetOption[]
  }
  rows: EmployeeHoursRow[]
}

export type EmployeeHoursWeeklyParams = {
  weekStart?: string
  hourBand?: EmployeeHourBand
  bandMetric?: EmployeeHourMetric
  search?: string
  roleId?: string
  jobTitleId?: string
  contractTypeId?: string
  locationId?: string
  visaTypeId?: string
  staffKind?: EmployeeStaffKind
  overContractOnly?: boolean
  overCapOnly?: boolean
  over40Only?: boolean
  includeInactive?: boolean
}

export type EmployeeComplianceStatus = 'compliant' | 'action_required' | 'breach'
export type EmployeeReviewFilter = 'all' | 'completed' | 'pending'

export type EmployeeHoursMonthlyRow = {
  recordId: string
  month: string
  monthKey: string
  year: number
  employeeId: string
  workerId: string
  firstName: string
  surname: string
  fullName: string
  isActive: boolean
  sponsored: boolean
  immigration: { id: string; label: string; capHours: number } | null
  cosWeeklyHours: number | null
  effectiveCapHours: number | null
  /** Worked hours per week-of-month block (W1 = days 1–7 … W5 = days 29–end). */
  weekHours: number[]
  totalMonthlyHours: number
  assignedHours: number
  overAssignedHours: number
  smsReportingRequired: boolean
  smsOverridden: boolean
  reviewCompleted: boolean
  complianceStatus: EmployeeComplianceStatus
  complianceOverridden: boolean
  comments: string | null
  branchName: string | null
}

export type EmployeeHoursMonthlySummary = {
  month: string
  monthName: string
  year: number
  daysInMonth: number
  organisationTimezone?: string
  smsUnderHoursRatio: number
  employeeCount: number
  totals: {
    totalMonthlyHours: number
    assignedHours: number
    overAssignedHours: number
    overAssignedCount: number
    smsRequiredCount: number
    reviewsCompletedCount: number
    reviewsPendingCount: number
    sponsoredCount: number
    statusCounts: Record<EmployeeComplianceStatus, number>
  }
  facets: { locations: EmployeeHoursFacetOption[] }
  rows: EmployeeHoursMonthlyRow[]
}

export type EmployeeHoursMonthlyParams = {
  month?: string
  search?: string
  complianceStatus?: EmployeeComplianceStatus
  reviewFilter?: EmployeeReviewFilter
  smsOnly?: boolean
  sponsoredOnly?: boolean
  locationId?: string
  includeInactive?: boolean
}

export async function fetchEmployeeHoursMonthlySummary(
  params?: EmployeeHoursMonthlyParams,
): Promise<EmployeeHoursMonthlySummary> {
  const qs = new URLSearchParams()
  if (params?.month) qs.set('month', params.month)
  if (params?.search?.trim()) qs.set('search', params.search.trim())
  if (params?.complianceStatus) qs.set('complianceStatus', params.complianceStatus)
  if (params?.reviewFilter && params.reviewFilter !== 'all') {
    qs.set('reviewFilter', params.reviewFilter)
  }
  if (params?.smsOnly) qs.set('smsOnly', 'true')
  if (params?.sponsoredOnly) qs.set('sponsoredOnly', 'true')
  if (params?.locationId) qs.set('locationId', params.locationId)
  if (params?.includeInactive) qs.set('includeInactive', 'true')
  const suffix = qs.toString() ? `?${qs.toString()}` : ''
  const res = await apiJson<ApiEnvelope<EmployeeHoursMonthlySummary>>(
    `/employee-hours/monthly-summary${suffix}`,
    { method: 'GET' },
  )
  return res.data
}

export type EmployeeHoursMonthlyDetailWeek = {
  weekNumber: number
  weekStart: string
  weekEnd: string
  dayFrom: number
  dayTo: number
  label: string
  dayRangeLabel: string
  partialMonth: boolean
  weeklyHours: number | null
  effectiveCapHours: number | null
  assignedHours: number
  hoursWorked: number
  hoursOverContract: number
  hoursOverCap: number
  hoursOverAssigned: number
  assignedUtilisationPct: number | null
  utilisationPct: number | null
  assignedVisits: number
  workedVisits: number
  dayLabels: string[]
  dayHours: number[]
}

export type EmployeeHoursMonthlyDetail = {
  month: string
  monthName: string
  year: number
  daysInMonth: number
  organisationTimezone?: string
  weekScheme: string
  employee: {
    employeeId: string
    employeeName: string
    employeeNumber: string | null
    isActive: boolean
    branchName: string | null
    roleName: string | null
    jobTitleName: string | null
  }
  weeklyHours: number | null
  effectiveCapHours: number | null
  immigration: { id: string; label: string; capHours: number } | null
  expectedContractHours: number | null
  totals: {
    assignedHours: number
    hoursWorked: number
    hoursOverContract: number
    hoursOverCap: number
    hoursOverAssigned: number
    assignedVisits: number
    workedVisits: number
    overContractWeekCount: number
    overCapWeekCount: number
    overAssignedWeekCount: number
    weekCount: number
  }
  weeks: EmployeeHoursMonthlyDetailWeek[]
}

export type EmployeeHoursMonthlyDetailParams = {
  employeeId: string
  month?: string
}

export async function fetchEmployeeHoursMonthlyDetail(
  params: EmployeeHoursMonthlyDetailParams,
): Promise<EmployeeHoursMonthlyDetail> {
  const qs = new URLSearchParams()
  qs.set('employeeId', params.employeeId)
  if (params.month) qs.set('month', params.month)
  const res = await apiJson<ApiEnvelope<EmployeeHoursMonthlyDetail>>(
    `/employee-hours/monthly-detail?${qs.toString()}`,
    { method: 'GET' },
  )
  return res.data
}

export type UpsertMonthlyReviewBody = {
  employeeId: string
  month: string
  reviewCompleted?: boolean
  smsReportingRequired?: boolean | null
  complianceStatusOverride?: EmployeeComplianceStatus | null
  comments?: string | null
}

export async function upsertEmployeeHoursMonthlyReview(body: UpsertMonthlyReviewBody) {
  const res = await apiJson<ApiEnvelope<unknown>>('/employee-hours/monthly-review', {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
  return res.data
}

export async function fetchEmployeeHoursWeeklySummary(
  params?: EmployeeHoursWeeklyParams,
): Promise<EmployeeHoursWeeklySummary> {
  const qs = new URLSearchParams()
  if (params?.weekStart) qs.set('weekStart', params.weekStart)
  if (params?.hourBand) qs.set('hourBand', params.hourBand)
  if (params?.bandMetric) qs.set('bandMetric', params.bandMetric)
  if (params?.search?.trim()) qs.set('search', params.search.trim())
  if (params?.roleId) qs.set('roleId', params.roleId)
  if (params?.jobTitleId) qs.set('jobTitleId', params.jobTitleId)
  if (params?.contractTypeId) qs.set('contractTypeId', params.contractTypeId)
  if (params?.locationId) qs.set('locationId', params.locationId)
  if (params?.visaTypeId) qs.set('visaTypeId', params.visaTypeId)
  if (params?.staffKind && params.staffKind !== 'all') qs.set('staffKind', params.staffKind)
  if (params?.overContractOnly) qs.set('overContractOnly', 'true')
  if (params?.overCapOnly) qs.set('overCapOnly', 'true')
  if (params?.over40Only) qs.set('over40Only', 'true')
  if (params?.includeInactive) qs.set('includeInactive', 'true')
  const suffix = qs.toString() ? `?${qs.toString()}` : ''
  const res = await apiJson<ApiEnvelope<EmployeeHoursWeeklySummary>>(
    `/employee-hours/weekly-summary${suffix}`,
    { method: 'GET' },
  )
  return res.data
}
