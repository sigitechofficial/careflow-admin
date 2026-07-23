import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'

export type ServiceUserHourBand = 'under_10' | '10_20' | '20_30' | '30_40' | 'over_40'
export type ServiceUserHourMetric = 'worked' | 'assigned' | 'package'
export type ServiceUserContractedSource = 'visit_plan' | 'dom_care' | 'funding'

export type ServiceUserHoursFacetOption = {
  id: string
  name: string
  count: number
}

export type ServiceUserHoursRow = {
  serviceUserId: string
  serviceUserName: string
  serviceUserNumber: string | null
  isActive: boolean
  branchName: string | null
  careTypeName: string | null
  fundingTypeName: string | null
  statusName: string | null
  riskLevelName: string | null
  serviceStartDate: string | null
  weeklyPackageHours: number | null
  contractedSource: ServiceUserContractedSource | null
  authorisedWeeklyHours: number | null
  assignedHours: number
  hoursWorked: number
  hoursOverPackage: number
  hoursOverWorked: number
  utilisationPct: number | null
  assignedUtilisationPct: number | null
  remainingPackageHours: number | null
  assignedVisits: number
  workedVisits: number
  /** Worked hours per weekday, Monday = index 0. */
  dayHours: number[]
  hourBand: ServiceUserHourBand
}

export type ServiceUserHoursWeeklySummary = {
  weekStart: string
  weekEnd: string
  bandMetric: ServiceUserHourMetric
  hourBand: ServiceUserHourBand | null
  bandCounts: Record<ServiceUserHourBand, number>
  serviceUserCount: number
  totals: {
    packageHours: number
    assignedHours: number
    hoursWorked: number
    hoursOverPackage: number
    assignedVisits: number
    workedVisits: number
    averagePackageHours: number | null
    averageUtilisationPct: number | null
    averageAssignedUtilisationPct: number | null
    overPackageCount: number
    overWorkedCount: number
    missingPackageCount: number
  }
  facets: {
    locations: ServiceUserHoursFacetOption[]
    careTypes: ServiceUserHoursFacetOption[]
    fundingTypes: ServiceUserHoursFacetOption[]
    statuses: ServiceUserHoursFacetOption[]
  }
  rows: ServiceUserHoursRow[]
}

export type ServiceUserHoursWeeklyParams = {
  weekStart?: string
  hourBand?: ServiceUserHourBand
  bandMetric?: ServiceUserHourMetric
  search?: string
  locationId?: string
  careTypeId?: string
  fundingTypeId?: string
  statusId?: string
  overPackageOnly?: boolean
  overWorkedOnly?: boolean
  includeInactive?: boolean
}

export async function fetchServiceUserHoursWeeklySummary(
  params?: ServiceUserHoursWeeklyParams,
): Promise<ServiceUserHoursWeeklySummary> {
  const qs = new URLSearchParams()
  if (params?.weekStart) qs.set('weekStart', params.weekStart)
  if (params?.hourBand) qs.set('hourBand', params.hourBand)
  if (params?.bandMetric) qs.set('bandMetric', params.bandMetric)
  if (params?.search?.trim()) qs.set('search', params.search.trim())
  if (params?.locationId) qs.set('locationId', params.locationId)
  if (params?.careTypeId) qs.set('careTypeId', params.careTypeId)
  if (params?.fundingTypeId) qs.set('fundingTypeId', params.fundingTypeId)
  if (params?.statusId) qs.set('statusId', params.statusId)
  if (params?.overPackageOnly) qs.set('overPackageOnly', 'true')
  if (params?.overWorkedOnly) qs.set('overWorkedOnly', 'true')
  if (params?.includeInactive) qs.set('includeInactive', 'true')
  const suffix = qs.toString() ? `?${qs.toString()}` : ''
  const res = await apiJson<ApiEnvelope<ServiceUserHoursWeeklySummary>>(
    `/service-user-hours/weekly-summary${suffix}`,
    { method: 'GET' },
  )
  return res.data
}

export type ServiceUserHoursMonthlyWeek = {
  weekNumber: number
  weekStart: string
  weekEnd: string
  dayFrom: number
  dayTo: number
  label: string
  dayRangeLabel: string
  /** Kept for compatibility; calendar blocks always stay inside the month. */
  partialMonth: boolean
  packageHours: number | null
  assignedHours: number
  hoursWorked: number
  hoursOverPackage: number
  hoursOverWorked: number
  assignedUtilisationPct: number | null
  utilisationPct: number | null
  assignedVisits: number
  workedVisits: number
  /** Calendar day-of-month labels for this week block (e.g. "29","30","31"). */
  dayLabels: string[]
  dayHours: number[]
}

export type ServiceUserHoursMonthlyDetail = {
  month: string
  monthName: string
  year: number
  daysInMonth: number
  weekScheme: string
  serviceUser: {
    serviceUserId: string
    serviceUserName: string
    serviceUserNumber: string | null
    isActive: boolean
    branchName: string | null
    careTypeName: string | null
    statusName: string | null
  }
  weeklyPackageHours: number | null
  contractedSource: ServiceUserContractedSource | null
  authorisedWeeklyHours: number | null
  expectedPackageHours: number | null
  totals: {
    assignedHours: number
    hoursWorked: number
    hoursOverPackage: number
    assignedVisits: number
    workedVisits: number
    overPackageWeekCount: number
    overWorkedWeekCount: number
    weekCount: number
  }
  weeks: ServiceUserHoursMonthlyWeek[]
}

export type ServiceUserHoursMonthlyDetailParams = {
  serviceUserId: string
  month?: string
}

export async function fetchServiceUserHoursMonthlyDetail(
  params: ServiceUserHoursMonthlyDetailParams,
): Promise<ServiceUserHoursMonthlyDetail> {
  const qs = new URLSearchParams()
  qs.set('serviceUserId', params.serviceUserId)
  if (params.month) qs.set('month', params.month)
  const res = await apiJson<ApiEnvelope<ServiceUserHoursMonthlyDetail>>(
    `/service-user-hours/monthly-detail?${qs.toString()}`,
    { method: 'GET' },
  )
  return res.data
}
