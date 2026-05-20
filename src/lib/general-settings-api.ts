import { apiJson, type ApiEnvelope } from '@/lib/api-client'

export type TimeDisplayFormat = 'HH_XX' | 'HH_MM'
export type DefaultCarerStatus = 'ACTIVE' | 'INACTIVE'
export type HolidayUnit = 'HOURS' | 'DAYS'
export type ComplianceRequiredBy = 'ROLE_WORK_AREA' | 'CITIZENSHIP'
export type ComplianceApprovalType = 'MANAGER_APPROVAL' | 'HR_APPROVAL'
export type WellbeingRegularity = 'DAILY' | 'WEEKLY' | 'MONTHLY'
export type ActionsDefaultView = 'TASK_LIST' | 'ACTIONS_LIST'
export type AllocateEmployeeBy = 'FLOOR' | 'WARD' | 'UNIT' | 'TEAM' | 'ZONE'

export type OrganisationGeneralSettings = {
  id: string
  reviewCarePlanAfterDays: number
  handoverReportLastHours: number
  archiveServiceUserAfterMonths: number
  timeDisplayFormat: TimeDisplayFormat
  defaultCarerStatus: DefaultCarerStatus
  sendEmailWhenEmployeeActive: boolean
  allowMultipleRoles: boolean
  allowWeekendDaysInHoliday: boolean
  mandateComplianceForNewEmployees: boolean
  defaultHolidaysUnit: HolidayUnit
  recruitmentFunctionalityRequired: boolean
  complianceRequiredBy: ComplianceRequiredBy
  complianceApprovalForNewEmployee: ComplianceApprovalType
  calculateSicknessBradfordScale: boolean
  recordServiceUserWellbeing: boolean
  recordEmployeeWellbeing: boolean
  wellbeingRegularity: WellbeingRegularity
  wellbeingLabels: string[]
  enhancedRegularActionChecks: boolean
  showRegularActionsInDailyList: boolean
  allowFastAction: boolean
  actionsDefaultView: ActionsDefaultView
  appDefaultToObservationsTab: boolean
  allocateEmployeeBy: AllocateEmployeeBy
  restrictCarerToAllocatedServiceUsers: boolean
  restrictLoginToShiftTimes: boolean
  preventCarerWebLogin: boolean
  shiftAccessMinutesBefore: number
  shiftAccessMinutesAfter: number
  updatedAt: string
}

export type UpdateOrganisationGeneralSettingsPayload = Partial<
  Omit<OrganisationGeneralSettings, 'id' | 'updatedAt' | 'wellbeingLabels'> & {
    wellbeingLabels?: string[]
    wellbeingLabel1?: string
    wellbeingLabel2?: string
    wellbeingLabel3?: string
    wellbeingLabel4?: string
    wellbeingLabel5?: string
  }
>

function toUpdatePayload(payload: UpdateOrganisationGeneralSettingsPayload) {
  const { wellbeingLabels, ...rest } = payload
  if (!wellbeingLabels) return rest
  return {
    ...rest,
    wellbeingLabel1: wellbeingLabels[0],
    wellbeingLabel2: wellbeingLabels[1],
    wellbeingLabel3: wellbeingLabels[2],
    wellbeingLabel4: wellbeingLabels[3],
    wellbeingLabel5: wellbeingLabels[4],
  }
}

export async function fetchGeneralSettings(): Promise<OrganisationGeneralSettings> {
  const res = await apiJson<ApiEnvelope<OrganisationGeneralSettings>>('/settings/general', { method: 'GET' })
  return res.data
}

export async function updateGeneralSettings(
  payload: UpdateOrganisationGeneralSettingsPayload,
): Promise<OrganisationGeneralSettings> {
  const res = await apiJson<ApiEnvelope<OrganisationGeneralSettings>>('/settings/general', {
    method: 'PATCH',
    body: JSON.stringify(toUpdatePayload(payload)),
  })
  return res.data
}
