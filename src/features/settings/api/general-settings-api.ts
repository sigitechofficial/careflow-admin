import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'

export type TimeDisplayFormat = 'HH_XX' | 'HH_MM'
export type DateDisplayFormat = 'DD_MM_YYYY' | 'MM_DD_YYYY' | 'YYYY_MM_DD'
export type DefaultCarerStatus = 'ACTIVE' | 'INACTIVE'
export type HolidayUnit = 'HOURS' | 'DAYS'
export type SalaryCalculationBasis = 'MONTHLY' | 'WEEKLY'
/** COMBINED = charge sum of carer hours; FIXED = charge visit window once. */
export type MultiCarerFunderChargeMode = 'COMBINED' | 'FIXED'
export type ComplianceRequiredBy = 'ROLE_WORK_AREA' | 'CITIZENSHIP'
export type ComplianceApprovalType = 'MANAGER_APPROVAL' | 'HR_APPROVAL'
export type ComplianceAllocationMode = 'WARN' | 'BLOCK'
export type ComplianceBlockStatus =
  | 'MISSING'
  | 'EXPIRED'
  | 'REJECTED'
  | 'EXPIRING_SOON'
  | 'PENDING_REVIEW'
  | 'REQUIRED'
export type WellbeingRegularity = 'DAILY' | 'WEEKLY' | 'MONTHLY'
export type ActionsDefaultView = 'TASK_LIST' | 'ACTIONS_LIST'
export type AllocateEmployeeBy = 'FLOOR' | 'WARD' | 'ZONE' | 'UNIT'

export type DomJobCancellationRule = {
  id: string
  hoursFrom: number
  hoursTo: number
  chargeServiceUserPercent: number
  payEmployeePercent: number
}

export type DomCareShiftDefinition = {
  id: string
  name: string
  fromTime: string
  toTime: string
  colorHex: string
  endsNextDay: boolean
  sortOrder: number
}

export type DomAllocationRuleBehavior =
  | 'DONT_ALLOW'
  | 'ALWAYS_ALLOW'
  | 'REQUEST_CONFIRMATION'
  | 'MANAGER_APPROVAL'

/** Above a carer's maximum weekly hours (Employment; blank = 60h): never, or as the approval setting says. */
export type WeeklyHoursOverMax = 'NO' | 'YES'

export type DomWeeklyHoursRuleOptions = {
  /** Above the carer's maximum weekly hours (default NO). */
  allowOverMax: WeeklyHoursOverMax
  /** Called-off visits count in the carer's weekly hours (default true). */
  countCalledOff: boolean
  /** Changing contracted weekly hours needs manager approval (default true). */
  contractedChangeNeedsApproval: boolean
  /** Adding extra weekly hours needs manager approval (default false). */
  extraHoursNeedApproval: boolean
}

export type ServiceUserWeeklyHoursSettings = {
  /** Changing a service user's weekly hours (up or down) waits for a manager. The first value never does. */
  changeNeedsApproval: boolean
  /** New visits over the weekly hours go to Hours approvals (made once approved); No = made with a warning. */
  visitsNeedApproval: boolean
  /** Special visits count towards the service user's weekly hours. */
  specialVisitsCount: boolean
  /** Visits over the weekly hours use the service user's timebank when it covers all the hours over. */
  useTimebank: boolean
}

export type OptionalAboutMeField = {
  key: string
  label: string
  enabled: boolean
}

export type OptionalFamilyShareVisitInfo = {
  recordedNotes: boolean
  checklists: boolean
  photographs: boolean
  medications: boolean
}

export type PreAssessmentChecklistItem = {
  key: string
  label: string
  selected: boolean
}

export type OrganisationPrivacySettings = {
  nonActiveServiceUserDays: number
  notifyInternalMessage: boolean
  notifyEmail: boolean
  sensitiveViewerRoles: string[]
}

export type OrganisationAppSettings = {
  pinCodeRequired: boolean
  viewPoliciesCareApp: boolean
  viewPoliciesRosterApp: boolean
  bookHolidaysCareApp: boolean
  fingerprintLoginCareApp: boolean
  singleDeviceLoginCareApp: boolean
}

export type OrganisationCriticalInformationSettings = {
  generateActions: boolean
  memorableAnswerRequired: boolean
  lockdownWebAccess: boolean
  lockdownCareAppAccess: boolean
}

export type OrganisationAlertsSettings = {
  actionsOverdueEnabled: boolean
  actionsOverdueMinutes: number
  requiredCheckNotTicked: boolean
  requiredMedicationNotGiven: boolean
  scheduleJobsBeforeHours: number
  beepOnNewAlert: boolean
  fluidAlertsEnabled: boolean
}

export type OrganisationPreAssessmentSettings = {
  careAssessmentRequired: boolean
  assessmentComponents: PreAssessmentChecklistItem[]
  assessmentForms: PreAssessmentChecklistItem[]
}

export type OrganisationOptionalSettings = {
  emarIntegration: boolean
  medicationListRequired: boolean
  medicationAmendRoles: string[]
  mhaDetentionRequired: boolean
  restraintRecordingRequired: boolean
  carePlanReadRequired: boolean
  carePlanReadCycleMonths: number
  formBuilderRequired: boolean
  removeCreateNewCarePlan: boolean
  aboutMeFields: OptionalAboutMeField[]
  serviceManagementRequired: boolean
  learningDevSessionsRequired: boolean
  familyPortalEnabled: boolean
  familySharingAuthRequired: boolean
  familyShareAllActions: boolean
  familyShareCarePlans: boolean
  familyShareVisitInfo: OptionalFamilyShareVisitInfo
  allowInspectorLogin: boolean
}

export type IncidentDefaultStatus = 'REPORTED' | 'DRAFT' | 'UNDER_REVIEW' | 'CLOSED'

export type IncidentTypeSetting = {
  key: string
  label: string
  required: boolean
}

export type EmployeeVisaType = {
  id: string
  label: string
  maxWeeklyHours: number
  defaultContractedHours: number | null
  /** @deprecated Legacy API field — same as maxWeeklyHours */
  weeklyHours?: number
}

export type DomCareAllocationRule = {
  key: string
  label: string
  behavior: DomAllocationRuleBehavior
  minutes: number | null
  /** Only on the weekly-hours rule. */
  weeklyHours?: DomWeeklyHoursRuleOptions
}

export type RotaHorizonMode = 'FIXED_DAYS' | 'CALENDAR_MONTH'

export type DomLateVisitZoneAlert = {
  zoneKey: string
  label: string
  scheduleAreaId: string | null
  emailEmployeeIds: string[]
  notificationEmployeeIds: string[]
}

export type OrganisationGeneralSettings = {
  id: string
  reviewCarePlanAfterDays: number
  handoverReportLastHours: number
  /** Incidents: Duty of Candour flagged overdue after this many days; null = off. */
  incidentCandourOverdueDays: number | null
  archiveServiceUserAfterMonths: number
  timeDisplayFormat: TimeDisplayFormat
  dateDisplayFormat: DateDisplayFormat
  /** IANA timezone for operational calendar (schedules, ECM, today). */
  timezone: string
  defaultCarerStatus: DefaultCarerStatus
  sendEmailWhenEmployeeActive: boolean
  allowMultipleRoles: boolean
  allowWeekendDaysInHoliday: boolean
  mandateComplianceForNewEmployees: boolean
  defaultHolidaysUnit: HolidayUnit
  salaryCalculationBasis: SalaryCalculationBasis
  multiCarerFunderChargeMode: MultiCarerFunderChargeMode
  recruitmentFunctionalityRequired: boolean
  complianceRequiredBy: ComplianceRequiredBy
  complianceApprovalForNewEmployee: ComplianceApprovalType
  complianceAllocationMode: ComplianceAllocationMode
  complianceBlockStatuses: ComplianceBlockStatus[]
  includeLearningInAllocationBlock: boolean
  calculateSicknessBradfordScale: boolean
  recordServiceUserWellbeing: boolean
  recordEmployeeWellbeing: boolean
  wellbeingRegularity: WellbeingRegularity
  wellbeingLabels: string[]
  employeeVisaTypes: EmployeeVisaType[]
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
  domJobCancellationRules: DomJobCancellationRule[]
  domGlobalToleranceMinutes: number
  domGeofenceDistanceMeters: number
  domWorkPatternCycles: number
  domShowAllEmployeesAcrossZones: boolean
  domEmailTomorrowsSchedule: boolean
  domAppShowHoursBefore: number
  domRestrictJobOutsideGeofence: boolean
  domCheckInGpsEnabled: boolean
  domCheckInManualEnabled: boolean
  domCheckInNfcEnabled: boolean
  domCheckInQrEnabled: boolean
  domGeofenceToleranceMeters: number
  domDownloadAllServiceUsers: boolean
  domFutureVisitsDays: number
  domAutoExtendRotaEnabled: boolean
  domCancellationHospitalExemption: boolean
  domRotaHorizonDays: number
  domRotaHorizonMode: RotaHorizonMode
  domAutoExtendRotaRunHour: number
  /** Most days back Backfill past visits may create; 0 = backfill off. */
  domMaxBackfillDays: number
  domShowWeeklyHours: boolean
  domShowServiceUserName: boolean
  domShowBlockedCarersInSchedule: boolean
  domLateVisitAlertRequired: boolean
  domLateVisitAlertMinutes: number
  domLateVisitAlertEmail: boolean
  domLateVisitAlertText: boolean
  domLateVisitAlertNotification: boolean
  domTextAlertsSentThisMonth: number
  domTextAlertsSentLastMonth: number
  domLateVisitZoneAlerts: DomLateVisitZoneAlert[]
  domCareShiftDefinitions: DomCareShiftDefinition[]
  domCareAllocationRules: DomCareAllocationRule[]
  serviceUserWeeklyHoursSettings?: ServiceUserWeeklyHoursSettings
  incidentDetailsEditableMinutes: number
  incidentDisplayHours: number
  incidentDefaultStatus: IncidentDefaultStatus
  incidentTypeSettings: IncidentTypeSetting[]
  incidentSeveritySettings?: IncidentTypeSetting[]
  incidentWhoInformedSettings?: IncidentTypeSetting[]
  optionalSettings: OrganisationOptionalSettings
  preAssessmentSettings: OrganisationPreAssessmentSettings
  alertsSettings: OrganisationAlertsSettings
  criticalInformationSettings: OrganisationCriticalInformationSettings
  appSettings: OrganisationAppSettings
  privacySettings: OrganisationPrivacySettings
  updatedAt: string
}

/** Read-only counters returned by GET; not accepted on PATCH. */
export type DomCareReadOnlySettings = Pick<
  OrganisationGeneralSettings,
  'domTextAlertsSentThisMonth' | 'domTextAlertsSentLastMonth'
>

export type PrivacySettingsUpdatePayload = {
  privacyNonActiveServiceUserDays?: number
  privacyNotifyInternalMessage?: boolean
  privacyNotifyEmail?: boolean
  privacySensitiveViewerRoles?: string[]
}

export type AppSettingsUpdatePayload = {
  appSettingPinCodeRequired?: boolean
  appSettingViewPoliciesCareApp?: boolean
  appSettingViewPoliciesRosterApp?: boolean
  appSettingBookHolidaysCareApp?: boolean
  appSettingFingerprintLoginCareApp?: boolean
  appSettingSingleDeviceLoginCareApp?: boolean
}

export type CriticalInformationSettingsUpdatePayload = {
  criticalGenerateActions?: boolean
  criticalMemorableAnswerRequired?: boolean
  criticalLockdownWebAccess?: boolean
  criticalLockdownCareAppAccess?: boolean
}

export type AlertsSettingsUpdatePayload = {
  alertActionsOverdueEnabled?: boolean
  alertActionsOverdueMinutes?: number
  alertRequiredCheckNotTicked?: boolean
  alertRequiredMedicationNotGiven?: boolean
  alertScheduleJobsBeforeHours?: number
  alertBeepOnNewAlert?: boolean
  alertFluidAlertsEnabled?: boolean
}

export type PreAssessmentSettingsUpdatePayload = {
  preAssessmentCareRequired?: boolean
  preAssessmentComponents?: PreAssessmentChecklistItem[]
  preAssessmentForms?: PreAssessmentChecklistItem[]
}

export type OptionalSettingsUpdatePayload = {
  optionalEmarIntegration?: boolean
  optionalMedicationListRequired?: boolean
  optionalMedicationAmendRoles?: string[]
  optionalMhaDetentionRequired?: boolean
  optionalRestraintRecordingRequired?: boolean
  optionalCarePlanReadRequired?: boolean
  optionalCarePlanReadCycleMonths?: number
  optionalFormBuilderRequired?: boolean
  optionalRemoveCreateNewCarePlan?: boolean
  optionalAboutMeFields?: OptionalAboutMeField[]
  optionalServiceManagementRequired?: boolean
  optionalLearningDevSessionsRequired?: boolean
  optionalFamilyPortalEnabled?: boolean
  optionalFamilySharingAuthRequired?: boolean
  optionalFamilyShareAllActions?: boolean
  optionalFamilyShareCarePlans?: boolean
  optionalFamilyShareVisitInfo?: OptionalFamilyShareVisitInfo
  optionalAllowInspectorLogin?: boolean
}

export type UpdateOrganisationGeneralSettingsPayload = Partial<
  Omit<
    OrganisationGeneralSettings,
    | 'id'
    | 'updatedAt'
    | 'wellbeingLabels'
    | 'optionalSettings'
    | 'preAssessmentSettings'
    | 'alertsSettings'
    | 'criticalInformationSettings'
    | 'appSettings'
    | 'privacySettings'
    | keyof DomCareReadOnlySettings
  > & {
    wellbeingLabels?: string[]
    wellbeingLabel1?: string
    wellbeingLabel2?: string
    wellbeingLabel3?: string
    wellbeingLabel4?: string
    wellbeingLabel5?: string
  }
> &
  OptionalSettingsUpdatePayload &
  PreAssessmentSettingsUpdatePayload &
  AlertsSettingsUpdatePayload &
  CriticalInformationSettingsUpdatePayload &
  AppSettingsUpdatePayload &
  PrivacySettingsUpdatePayload

function toUpdatePayload(payload: UpdateOrganisationGeneralSettingsPayload) {
  const {
    wellbeingLabels,
    domTextAlertsSentThisMonth: _thisMonth,
    domTextAlertsSentLastMonth: _lastMonth,
    ...rest
  } = payload as UpdateOrganisationGeneralSettingsPayload & Partial<DomCareReadOnlySettings>
  const base = { ...rest }
  if (!wellbeingLabels) return base
  return {
    ...base,
    wellbeingLabel1: wellbeingLabels[0],
    wellbeingLabel2: wellbeingLabels[1],
    wellbeingLabel3: wellbeingLabels[2],
    wellbeingLabel4: wellbeingLabels[3],
    wellbeingLabel5: wellbeingLabels[4],
  }
}

export async function fetchGeneralSettings(init?: RequestInit): Promise<OrganisationGeneralSettings> {
  const res = await apiJson<ApiEnvelope<OrganisationGeneralSettings>>('/settings/general', { method: 'GET', ...init })
  return res.data
}

export async function updateGeneralSettings(
  payload: UpdateOrganisationGeneralSettingsPayload,
  init?: RequestInit,
): Promise<OrganisationGeneralSettings> {
  const res = await apiJson<ApiEnvelope<OrganisationGeneralSettings>>('/settings/general', {
    method: 'PATCH',
    body: JSON.stringify(toUpdatePayload(payload)),
    ...init,
  })
  return res.data
}
