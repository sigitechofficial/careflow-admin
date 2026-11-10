import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'
import type { LookupRow } from '@/features/employees/api'

export type LookupResource =
  | 'job-titles'
  | 'skill-types'
  | 'work-areas'
  | 'grades'
  | 'contract-types'
  | 'certification-types'
  | 'non-core-activity-reasons'
  | 'leaving-reasons'
  | 'visit-status-reasons'
  | 'review-types'
  | 'locations'
  | 'zones'
  | 'travel-payment-types'

export type LookupRowWithInterval = LookupRow & {
  defaultRefreshMonths?: number | null
  defaultValidityMonths?: number | null
  defaultIntervalDays?: number | null
}

export type IntervalLookupResource = 'skill-types' | 'certification-types' | 'review-types'

const GET_PATH: Record<LookupResource, string> = {
  'job-titles': '/lookups/job-titles',
  'skill-types': '/lookups/skill-types',
  'work-areas': '/lookups/work-areas',
  grades: '/lookups/grades',
  'contract-types': '/lookups/contract-types',
  'certification-types': '/lookups/certification-types',
  'non-core-activity-reasons': '/lookups/non-core-activity-reasons',
  'leaving-reasons': '/lookups/leaving-reasons',
  'visit-status-reasons': '/lookups/visit-status-reasons',
  'review-types': '/lookups/review-types',
  locations: '/lookups/locations',
  zones: '/lookups/zones',
  'travel-payment-types': '/lookups/travel-payment-types',
}

export async function fetchLookupList(resource: LookupResource): Promise<LookupRow[]> {
  const res = await apiJson<ApiEnvelope<LookupRow[]>>(GET_PATH[resource], { method: 'GET' })
  return res.data
}

export async function fetchLookupListWithInterval(
  resource: IntervalLookupResource,
): Promise<LookupRowWithInterval[]> {
  const res = await apiJson<ApiEnvelope<LookupRowWithInterval[]>>(GET_PATH[resource], { method: 'GET' })
  return res.data
}

export async function updateLookupIntervalItem(
  resource: IntervalLookupResource,
  id: string,
  body: {
    name?: string
    defaultRefreshMonths?: number | null
    defaultValidityMonths?: number | null
    defaultIntervalDays?: number | null
  },
): Promise<LookupRowWithInterval> {
  const res = await apiJson<ApiEnvelope<LookupRowWithInterval>>(`/lookups/${resource}/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
  return res.data
}

export async function createLookupItem(resource: LookupResource, name: string): Promise<LookupRow> {
  const res = await apiJson<ApiEnvelope<LookupRow>>(`/lookups/${resource}`, {
    method: 'POST',
    body: JSON.stringify({ name }),
  })
  return res.data
}

export async function updateLookupItem(
  resource: LookupResource,
  id: string,
  name: string,
): Promise<LookupRow> {
  const res = await apiJson<ApiEnvelope<LookupRow>>(`/lookups/${resource}/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ name }),
  })
  return res.data
}

export async function deleteLookupItem(resource: LookupResource, id: string): Promise<void> {
  await apiJson<ApiEnvelope<unknown>>(`/lookups/${resource}/${id}`, { method: 'DELETE' })
}

export type ComplianceTypeRow = {
  id: string
  name: string
  code: string | null
  category: string
  isMandatoryByDefault: boolean
  hasExpiry: boolean
  defaultValidityMonths?: number | null
}

export type ComplianceCategory =
  | 'IDENTITY'
  | 'RIGHT_TO_WORK'
  | 'SAFEGUARDING'
  | 'TRAINING'
  | 'CLINICAL'
  | 'EMPLOYMENT'
  | 'HEALTH_AND_SAFETY'
  | 'PROFESSIONAL_REGISTRATION'
  | 'DRIVING'
  | 'OTHER'

export { COMPLIANCE_CATEGORIES } from '@/features/settings/constants/compliance-categories'

export async function fetchComplianceTypesList(params?: {
  search?: string
  limit?: number
}): Promise<ComplianceTypeRow[]> {
  const qs = new URLSearchParams()
  qs.set('limit', String(Math.min(params?.limit ?? 100, 100)))
  qs.set('sortBy', 'name')
  qs.set('sortOrder', 'asc')
  if (params?.search?.trim()) qs.set('search', params.search.trim())
  const res = await apiJson<ApiEnvelope<ComplianceTypeRow[]> & { meta?: unknown }>(
    `/compliance-types?${qs}`,
    { method: 'GET' },
  )
  return res.data
}

export async function createComplianceType(body: {
  name: string
  code: string
  category: ComplianceCategory
  isMandatoryByDefault?: boolean
  hasExpiry?: boolean
  defaultValidityMonths?: number | null
}): Promise<ComplianceTypeRow> {
  const res = await apiJson<ApiEnvelope<ComplianceTypeRow>>('/compliance-types', {
    method: 'POST',
    body: JSON.stringify({
      hasExpiry: body.hasExpiry ?? true,
      requiresDocument: true,
      requiresVerification: true,
      isMandatoryByDefault: body.isMandatoryByDefault ?? false,
      ...body,
    }),
  })
  return res.data
}

export async function updateComplianceType(
  id: string,
  body: {
    name?: string
    code?: string
    category?: ComplianceCategory
    isMandatoryByDefault?: boolean
    hasExpiry?: boolean
    defaultValidityMonths?: number | null
  },
): Promise<ComplianceTypeRow> {
  const res = await apiJson<ApiEnvelope<ComplianceTypeRow>>(`/compliance-types/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
  return res.data
}

export async function deleteComplianceType(id: string): Promise<void> {
  await apiJson<ApiEnvelope<unknown>>(`/compliance-types/${id}`, { method: 'DELETE' })
}

export type ServiceUserCareTypeRow = {
  id: string
  name: string
  code: string
  isActive: boolean
}

export type ServiceUserFundingTypeRow = {
  id: string
  name: string
  code: string
  isActive: boolean
  /** Funding routes only: the broad billing type (Funding tab) this route comes under. */
  billingFundingTypeId?: string | null
  billingFundingType?: { id: string; name: string; code: string } | null
}

export type BodyMapRecordTypeRow = {
  id: string
  name: string
  code: string
  parentId: string | null
  sortOrder: number
  isActive: boolean
  initialAssessmentWoundType: boolean
  markerColorHex?: string | null
}

export async function fetchServiceUserCareTypesList(): Promise<ServiceUserCareTypeRow[]> {
  const res = await apiJson<ApiEnvelope<ServiceUserCareTypeRow[]>>(
    '/lookups/service-user-care-types',
    { method: 'GET' },
  )
  return res.data
}

export async function createServiceUserCareType(body: {
  name: string
  code: string
}): Promise<ServiceUserCareTypeRow> {
  const res = await apiJson<ApiEnvelope<ServiceUserCareTypeRow>>(
    '/lookups/service-user-care-types',
    { method: 'POST', body: JSON.stringify(body) },
  )
  return res.data
}

export async function updateServiceUserCareType(
  id: string,
  body: { name?: string; code?: string },
): Promise<ServiceUserCareTypeRow> {
  const res = await apiJson<ApiEnvelope<ServiceUserCareTypeRow>>(
    `/lookups/service-user-care-types/${id}`,
    { method: 'PATCH', body: JSON.stringify(body) },
  )
  return res.data
}

export async function deleteServiceUserCareType(id: string): Promise<void> {
  await apiJson<ApiEnvelope<unknown>>(`/lookups/service-user-care-types/${id}`, {
    method: 'DELETE',
  })
}

// ─── On-entry welfare outcomes (carer-app clock-in) ─────────────────────────

export type WelfareOutcomeTone = 'ok' | 'warn' | 'bad'

export type WelfareOutcomeRow = {
  id: string
  code: string
  label: string
  tone: WelfareOutcomeTone
  sortOrder: number
  isActive: boolean
}

export async function fetchWelfareOutcomes(): Promise<WelfareOutcomeRow[]> {
  const res = await apiJson<ApiEnvelope<WelfareOutcomeRow[]>>('/lookups/welfare-outcomes', {
    method: 'GET',
  })
  return res.data
}

export async function createWelfareOutcome(body: {
  code: string
  label: string
  tone?: WelfareOutcomeTone
  sortOrder?: number
}): Promise<WelfareOutcomeRow> {
  const res = await apiJson<ApiEnvelope<WelfareOutcomeRow>>('/lookups/welfare-outcomes', {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return res.data
}

export async function updateWelfareOutcome(
  id: string,
  body: { code?: string; label?: string; tone?: WelfareOutcomeTone; sortOrder?: number; isActive?: boolean },
): Promise<WelfareOutcomeRow> {
  const res = await apiJson<ApiEnvelope<WelfareOutcomeRow>>(`/lookups/welfare-outcomes/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
  return res.data
}

export async function deleteWelfareOutcome(id: string): Promise<void> {
  await apiJson<ApiEnvelope<unknown>>(`/lookups/welfare-outcomes/${id}`, { method: 'DELETE' })
}

// ─── Emergency protocols (carer-app runner) ─────────────────────────────────

export const EMERGENCY_PROTOCOL_ICON_KEYS = [
  'activity',
  'droplet',
  'wind',
  'smile',
  'heart',
  'alert',
  'brain',
  'pulse',
  'foot',
] as const

export type EmergencyProtocolIconKey = (typeof EMERGENCY_PROTOCOL_ICON_KEYS)[number]

export type EmergencyProtocolStepRow = {
  id?: string
  action: string
  detail: string
  sortOrder?: number
}

export type EmergencyProtocolRow = {
  id: string
  code: string
  title: string
  subtitle: string
  version: string
  iconKey: EmergencyProtocolIconKey | string
  sortOrder: number
  isActive: boolean
  steps: EmergencyProtocolStepRow[]
}

export type EmergencyProtocolWriteBody = {
  code?: string
  title?: string
  subtitle?: string
  version?: string
  iconKey?: string
  sortOrder?: number
  isActive?: boolean
  steps?: { action: string; detail?: string }[]
}

export async function fetchEmergencyProtocols(): Promise<EmergencyProtocolRow[]> {
  const res = await apiJson<ApiEnvelope<EmergencyProtocolRow[]>>('/lookups/emergency-protocols', {
    method: 'GET',
  })
  return res.data
}

export async function createEmergencyProtocol(
  body: EmergencyProtocolWriteBody & { code: string; title: string; steps: { action: string; detail?: string }[] },
): Promise<EmergencyProtocolRow> {
  const res = await apiJson<ApiEnvelope<EmergencyProtocolRow>>('/lookups/emergency-protocols', {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return res.data
}

export async function updateEmergencyProtocol(
  id: string,
  body: EmergencyProtocolWriteBody,
): Promise<EmergencyProtocolRow> {
  const res = await apiJson<ApiEnvelope<EmergencyProtocolRow>>(`/lookups/emergency-protocols/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
  return res.data
}

export async function deleteEmergencyProtocol(id: string): Promise<void> {
  await apiJson<ApiEnvelope<unknown>>(`/lookups/emergency-protocols/${id}`, { method: 'DELETE' })
}

// ─── Clock-in early / late arrival reasons (carer-app) ──────────────────────

export type ClockInArrivalKind = 'EARLY' | 'LATE'

export type ClockInArrivalReasonRow = {
  id: string
  kind: ClockInArrivalKind
  label: string
  requiresNotes: boolean
  sortOrder: number
  isActive: boolean
}

export async function fetchClockInArrivalReasons(): Promise<ClockInArrivalReasonRow[]> {
  const res = await apiJson<ApiEnvelope<ClockInArrivalReasonRow[]>>(
    '/lookups/clock-in-arrival-reasons',
    { method: 'GET' },
  )
  return res.data
}

export async function createClockInArrivalReason(body: {
  kind: ClockInArrivalKind
  label: string
  requiresNotes?: boolean
  sortOrder?: number
}): Promise<ClockInArrivalReasonRow> {
  const res = await apiJson<ApiEnvelope<ClockInArrivalReasonRow>>(
    '/lookups/clock-in-arrival-reasons',
    { method: 'POST', body: JSON.stringify(body) },
  )
  return res.data
}

export async function updateClockInArrivalReason(
  id: string,
  body: {
    label?: string
    requiresNotes?: boolean
    sortOrder?: number
    isActive?: boolean
  },
): Promise<ClockInArrivalReasonRow> {
  const res = await apiJson<ApiEnvelope<ClockInArrivalReasonRow>>(
    `/lookups/clock-in-arrival-reasons/${id}`,
    { method: 'PATCH', body: JSON.stringify(body) },
  )
  return res.data
}

export async function deleteClockInArrivalReason(id: string): Promise<void> {
  await apiJson<ApiEnvelope<unknown>>(`/lookups/clock-in-arrival-reasons/${id}`, {
    method: 'DELETE',
  })
}

// ─── Office Manual check-in authorisation reasons ─────────────────────────────

export type ManualAuthorisationReasonRow = {
  id: string
  code: string
  label: string
  requiresNotes: boolean
  sortOrder: number
  isActive: boolean
}

export async function fetchManualAuthorisationReasons(): Promise<ManualAuthorisationReasonRow[]> {
  const res = await apiJson<ApiEnvelope<ManualAuthorisationReasonRow[]>>(
    '/lookups/manual-authorisation-reasons',
    { method: 'GET' },
  )
  return res.data
}

export async function createManualAuthorisationReason(body: {
  label: string
  requiresNotes?: boolean
  sortOrder?: number
}): Promise<ManualAuthorisationReasonRow> {
  const res = await apiJson<ApiEnvelope<ManualAuthorisationReasonRow>>(
    '/lookups/manual-authorisation-reasons',
    { method: 'POST', body: JSON.stringify(body) },
  )
  return res.data
}

export async function updateManualAuthorisationReason(
  id: string,
  body: {
    label?: string
    requiresNotes?: boolean
    sortOrder?: number
    isActive?: boolean
  },
): Promise<ManualAuthorisationReasonRow> {
  const res = await apiJson<ApiEnvelope<ManualAuthorisationReasonRow>>(
    `/lookups/manual-authorisation-reasons/${id}`,
    { method: 'PATCH', body: JSON.stringify(body) },
  )
  return res.data
}

export async function deleteManualAuthorisationReason(id: string): Promise<void> {
  await apiJson<ApiEnvelope<unknown>>(`/lookups/manual-authorisation-reasons/${id}`, {
    method: 'DELETE',
  })
}

// ─── Office left-area allow reasons ──────────────────────────────────────────

export type LeftAreaAllowReasonRow = ManualAuthorisationReasonRow

export async function fetchLeftAreaAllowReasons(): Promise<LeftAreaAllowReasonRow[]> {
  const res = await apiJson<ApiEnvelope<LeftAreaAllowReasonRow[]>>(
    '/lookups/left-area-allow-reasons',
    { method: 'GET' },
  )
  return res.data
}

export async function createLeftAreaAllowReason(body: {
  label: string
  requiresNotes?: boolean
  sortOrder?: number
}): Promise<LeftAreaAllowReasonRow> {
  const res = await apiJson<ApiEnvelope<LeftAreaAllowReasonRow>>(
    '/lookups/left-area-allow-reasons',
    { method: 'POST', body: JSON.stringify(body) },
  )
  return res.data
}

export async function updateLeftAreaAllowReason(
  id: string,
  body: {
    label?: string
    requiresNotes?: boolean
    sortOrder?: number
    isActive?: boolean
  },
): Promise<LeftAreaAllowReasonRow> {
  const res = await apiJson<ApiEnvelope<LeftAreaAllowReasonRow>>(
    `/lookups/left-area-allow-reasons/${id}`,
    { method: 'PATCH', body: JSON.stringify(body) },
  )
  return res.data
}

export async function deleteLeftAreaAllowReason(id: string): Promise<void> {
  await apiJson<ApiEnvelope<unknown>>(`/lookups/left-area-allow-reasons/${id}`, {
    method: 'DELETE',
  })
}

// ─── Clock-out early / late end reasons (carer-app) ─────────────────────────

export type ClockOutEndKind = 'EARLY' | 'LATE'

export type ClockOutEndReasonRow = {
  id: string
  kind: ClockOutEndKind
  label: string
  requiresNotes: boolean
  sortOrder: number
  isActive: boolean
}

export async function fetchClockOutEndReasons(): Promise<ClockOutEndReasonRow[]> {
  const res = await apiJson<ApiEnvelope<ClockOutEndReasonRow[]>>(
    '/lookups/clock-out-end-reasons',
    { method: 'GET' },
  )
  return res.data
}

export async function createClockOutEndReason(body: {
  kind: ClockOutEndKind
  label: string
  requiresNotes?: boolean
  sortOrder?: number
}): Promise<ClockOutEndReasonRow> {
  const res = await apiJson<ApiEnvelope<ClockOutEndReasonRow>>(
    '/lookups/clock-out-end-reasons',
    { method: 'POST', body: JSON.stringify(body) },
  )
  return res.data
}

export async function updateClockOutEndReason(
  id: string,
  body: {
    label?: string
    requiresNotes?: boolean
    sortOrder?: number
    isActive?: boolean
  },
): Promise<ClockOutEndReasonRow> {
  const res = await apiJson<ApiEnvelope<ClockOutEndReasonRow>>(
    `/lookups/clock-out-end-reasons/${id}`,
    { method: 'PATCH', body: JSON.stringify(body) },
  )
  return res.data
}

export async function deleteClockOutEndReason(id: string): Promise<void> {
  await apiJson<ApiEnvelope<unknown>>(`/lookups/clock-out-end-reasons/${id}`, {
    method: 'DELETE',
  })
}

// ─── Visit outcomes + reasons (Medication / Task / Observation) ─────────────

export type VisitOutcomeArea = 'MEDICATION' | 'TASK' | 'OBSERVATION'

export type VisitOutcomeReasonRow = {
  id: string
  label: string
  requiresNotes: boolean
  sortOrder: number
  isActive: boolean
}

export type VisitOutcomeRow = {
  id: string
  area: VisitOutcomeArea
  code: string
  label: string
  allowsReasons: boolean
  sortOrder: number
  isActive: boolean
  reasons: VisitOutcomeReasonRow[]
}

export async function fetchVisitOutcomes(): Promise<VisitOutcomeRow[]> {
  const res = await apiJson<ApiEnvelope<VisitOutcomeRow[]>>('/lookups/visit-outcomes', {
    method: 'GET',
  })
  return res.data
}

export async function createVisitOutcomeReason(
  outcomeId: string,
  body: { label: string; requiresNotes?: boolean; sortOrder?: number },
): Promise<VisitOutcomeReasonRow> {
  const res = await apiJson<ApiEnvelope<VisitOutcomeReasonRow>>(
    `/lookups/visit-outcomes/${outcomeId}/reasons`,
    { method: 'POST', body: JSON.stringify(body) },
  )
  return res.data
}

export async function updateVisitOutcomeReason(
  id: string,
  body: { label?: string; requiresNotes?: boolean; sortOrder?: number; isActive?: boolean },
): Promise<VisitOutcomeReasonRow> {
  const res = await apiJson<ApiEnvelope<VisitOutcomeReasonRow>>(
    `/lookups/visit-outcome-reasons/${id}`,
    { method: 'PATCH', body: JSON.stringify(body) },
  )
  return res.data
}

export async function deleteVisitOutcomeReason(id: string): Promise<void> {
  await apiJson<ApiEnvelope<unknown>>(`/lookups/visit-outcome-reasons/${id}`, {
    method: 'DELETE',
  })
}

export async function fetchServiceUserFundingTypesList(): Promise<ServiceUserFundingTypeRow[]> {
  const res = await apiJson<ApiEnvelope<ServiceUserFundingTypeRow[]>>(
    '/lookups/service-user-funding-types',
    { method: 'GET' },
  )
  return res.data
}

export async function createServiceUserFundingType(body: {
  name: string
  code: string
  billingFundingTypeId?: string | null
}): Promise<ServiceUserFundingTypeRow> {
  const res = await apiJson<ApiEnvelope<ServiceUserFundingTypeRow>>(
    '/lookups/service-user-funding-types',
    { method: 'POST', body: JSON.stringify(body) },
  )
  return res.data
}

export async function updateServiceUserFundingType(
  id: string,
  body: { name?: string; code?: string; billingFundingTypeId?: string | null },
): Promise<ServiceUserFundingTypeRow> {
  const res = await apiJson<ApiEnvelope<ServiceUserFundingTypeRow>>(
    `/lookups/service-user-funding-types/${id}`,
    { method: 'PATCH', body: JSON.stringify(body) },
  )
  return res.data
}

export async function deleteServiceUserFundingType(id: string): Promise<void> {
  await apiJson<ApiEnvelope<unknown>>(`/lookups/service-user-funding-types/${id}`, {
    method: 'DELETE',
  })
}

export async function fetchServiceUserEthnicitiesList(): Promise<ServiceUserFundingTypeRow[]> {
  const res = await apiJson<ApiEnvelope<ServiceUserFundingTypeRow[]>>(
    '/lookups/service-user-ethnicities',
    { method: 'GET' },
  )
  return res.data
}

export async function createServiceUserEthnicity(body: {
  name: string
  code: string
}): Promise<ServiceUserFundingTypeRow> {
  const res = await apiJson<ApiEnvelope<ServiceUserFundingTypeRow>>(
    '/lookups/service-user-ethnicities',
    { method: 'POST', body: JSON.stringify(body) },
  )
  return res.data
}

export async function updateServiceUserEthnicity(
  id: string,
  body: { name?: string; code?: string },
): Promise<ServiceUserFundingTypeRow> {
  const res = await apiJson<ApiEnvelope<ServiceUserFundingTypeRow>>(
    `/lookups/service-user-ethnicities/${id}`,
    { method: 'PATCH', body: JSON.stringify(body) },
  )
  return res.data
}

export async function deleteServiceUserEthnicity(id: string): Promise<void> {
  await apiJson<ApiEnvelope<unknown>>(`/lookups/service-user-ethnicities/${id}`, {
    method: 'DELETE',
  })
}

export async function fetchServiceUserLanguagesList(): Promise<ServiceUserFundingTypeRow[]> {
  const res = await apiJson<ApiEnvelope<ServiceUserFundingTypeRow[]>>(
    '/lookups/service-user-languages',
    { method: 'GET' },
  )
  return res.data
}

export async function createServiceUserLanguage(body: {
  name: string
  code: string
}): Promise<ServiceUserFundingTypeRow> {
  const res = await apiJson<ApiEnvelope<ServiceUserFundingTypeRow>>(
    '/lookups/service-user-languages',
    { method: 'POST', body: JSON.stringify(body) },
  )
  return res.data
}

export async function updateServiceUserLanguage(
  id: string,
  body: { name?: string; code?: string },
): Promise<ServiceUserFundingTypeRow> {
  const res = await apiJson<ApiEnvelope<ServiceUserFundingTypeRow>>(
    `/lookups/service-user-languages/${id}`,
    { method: 'PATCH', body: JSON.stringify(body) },
  )
  return res.data
}

export async function deleteServiceUserLanguage(id: string): Promise<void> {
  await apiJson<ApiEnvelope<unknown>>(`/lookups/service-user-languages/${id}`, {
    method: 'DELETE',
  })
}

export async function fetchServiceUserGendersList(): Promise<ServiceUserFundingTypeRow[]> {
  const res = await apiJson<ApiEnvelope<ServiceUserFundingTypeRow[]>>(
    '/lookups/service-user-genders',
    { method: 'GET' },
  )
  return res.data
}

export async function createServiceUserGender(body: {
  name: string
  code: string
}): Promise<ServiceUserFundingTypeRow> {
  const res = await apiJson<ApiEnvelope<ServiceUserFundingTypeRow>>(
    '/lookups/service-user-genders',
    { method: 'POST', body: JSON.stringify(body) },
  )
  return res.data
}

export async function updateServiceUserGender(
  id: string,
  body: { name?: string; code?: string },
): Promise<ServiceUserFundingTypeRow> {
  const res = await apiJson<ApiEnvelope<ServiceUserFundingTypeRow>>(
    `/lookups/service-user-genders/${id}`,
    { method: 'PATCH', body: JSON.stringify(body) },
  )
  return res.data
}

export async function deleteServiceUserGender(id: string): Promise<void> {
  await apiJson<ApiEnvelope<unknown>>(`/lookups/service-user-genders/${id}`, {
    method: 'DELETE',
  })
}

export async function fetchServiceUserSexesList(): Promise<ServiceUserFundingTypeRow[]> {
  const res = await apiJson<ApiEnvelope<ServiceUserFundingTypeRow[]>>(
    '/lookups/service-user-sexes',
    { method: 'GET' },
  )
  return res.data
}

export async function createServiceUserSex(body: {
  name: string
  code: string
}): Promise<ServiceUserFundingTypeRow> {
  const res = await apiJson<ApiEnvelope<ServiceUserFundingTypeRow>>(
    '/lookups/service-user-sexes',
    { method: 'POST', body: JSON.stringify(body) },
  )
  return res.data
}

export async function updateServiceUserSex(
  id: string,
  body: { name?: string; code?: string },
): Promise<ServiceUserFundingTypeRow> {
  const res = await apiJson<ApiEnvelope<ServiceUserFundingTypeRow>>(
    `/lookups/service-user-sexes/${id}`,
    { method: 'PATCH', body: JSON.stringify(body) },
  )
  return res.data
}

export async function deleteServiceUserSex(id: string): Promise<void> {
  await apiJson<ApiEnvelope<unknown>>(`/lookups/service-user-sexes/${id}`, {
    method: 'DELETE',
  })
}

export async function fetchServiceUserSexualOrientationsList(): Promise<ServiceUserFundingTypeRow[]> {
  const res = await apiJson<ApiEnvelope<ServiceUserFundingTypeRow[]>>(
    '/lookups/service-user-sexual-orientations',
    { method: 'GET' },
  )
  return res.data
}

export async function createServiceUserSexualOrientation(body: {
  name: string
  code: string
}): Promise<ServiceUserFundingTypeRow> {
  const res = await apiJson<ApiEnvelope<ServiceUserFundingTypeRow>>(
    '/lookups/service-user-sexual-orientations',
    { method: 'POST', body: JSON.stringify(body) },
  )
  return res.data
}

export async function updateServiceUserSexualOrientation(
  id: string,
  body: { name?: string; code?: string },
): Promise<ServiceUserFundingTypeRow> {
  const res = await apiJson<ApiEnvelope<ServiceUserFundingTypeRow>>(
    `/lookups/service-user-sexual-orientations/${id}`,
    { method: 'PATCH', body: JSON.stringify(body) },
  )
  return res.data
}

export async function deleteServiceUserSexualOrientation(id: string): Promise<void> {
  await apiJson<ApiEnvelope<unknown>>(`/lookups/service-user-sexual-orientations/${id}`, {
    method: 'DELETE',
  })
}

export async function fetchBodyMapRecordTypesList(): Promise<BodyMapRecordTypeRow[]> {
  const res = await apiJson<ApiEnvelope<BodyMapRecordTypeRow[]>>('/lookups/body-map-record-types', {
    method: 'GET',
  })
  return res.data
}

export async function createBodyMapRecordType(body: {
  name: string
  code: string
  parentId?: string
  sortOrder?: number
  initialAssessmentWoundType?: boolean
  markerColorHex?: string
}): Promise<BodyMapRecordTypeRow> {
  const res = await apiJson<ApiEnvelope<BodyMapRecordTypeRow>>('/lookups/body-map-record-types', {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return res.data
}

export async function updateBodyMapRecordType(
  id: string,
  body: {
    name?: string
    code?: string
    sortOrder?: number
    initialAssessmentWoundType?: boolean
    markerColorHex?: string
  },
): Promise<BodyMapRecordTypeRow> {
  const res = await apiJson<ApiEnvelope<BodyMapRecordTypeRow>>(
    `/lookups/body-map-record-types/${id}`,
    { method: 'PATCH', body: JSON.stringify(body) },
  )
  return res.data
}

export async function deleteBodyMapRecordType(id: string): Promise<void> {
  await apiJson<ApiEnvelope<unknown>>(`/lookups/body-map-record-types/${id}`, {
    method: 'DELETE',
  })
}

export type VitalAcceptedRangeCatalogRow = {
  id: string
  fieldKey: string
  label: string
  unit: string
  min: number
  max: number
  sortOrder: number
  column: 'left' | 'right'
  isActive: boolean
}

export async function fetchVitalAcceptedRangesCatalog(): Promise<VitalAcceptedRangeCatalogRow[]> {
  const res = await apiJson<ApiEnvelope<VitalAcceptedRangeCatalogRow[]>>(
    '/lookups/vital-accepted-ranges',
    { method: 'GET' },
  )
  return res.data
}

export async function updateVitalAcceptedRangeCatalog(
  id: string,
  body: { min?: number; max?: number },
): Promise<VitalAcceptedRangeCatalogRow> {
  const res = await apiJson<ApiEnvelope<VitalAcceptedRangeCatalogRow>>(
    `/lookups/vital-accepted-ranges/${id}`,
    { method: 'PATCH', body: JSON.stringify(body) },
  )
  return res.data
}

export type AllergyCatalogCategory =
  | 'FOOD'
  | 'DRINK'
  | 'ENVIRONMENTAL'
  | 'MEDICATION'
  | 'OTHER'

export type AllergyCatalogRow = {
  id: string
  name: string
  code: string
  category: AllergyCatalogCategory
  sortOrder: number
  isActive: boolean
}

// ─── Medical condition catalogue ───────────────────────────────────────────

export type MedicalConditionCatalogCategory =
  | 'MENTAL_HEALTH'
  | 'NEUROLOGICAL'
  | 'CARDIOVASCULAR'
  | 'RESPIRATORY'
  | 'ENDOCRINE_METABOLIC'
  | 'LEARNING_DISABILITY'
  | 'DEVELOPMENTAL'
  | 'PALLIATIVE'
  | 'OTHER'

export const MEDICAL_CONDITION_CATALOG_CATEGORY_ORDER: MedicalConditionCatalogCategory[] = [
  'MENTAL_HEALTH',
  'NEUROLOGICAL',
  'CARDIOVASCULAR',
  'RESPIRATORY',
  'ENDOCRINE_METABOLIC',
  'LEARNING_DISABILITY',
  'DEVELOPMENTAL',
  'PALLIATIVE',
  'OTHER',
]

export const MEDICAL_CONDITION_CATALOG_CATEGORY_LABELS: Record<MedicalConditionCatalogCategory, string> = {
  MENTAL_HEALTH: 'Mental health',
  NEUROLOGICAL: 'Neurological',
  CARDIOVASCULAR: 'Cardiovascular',
  RESPIRATORY: 'Respiratory',
  ENDOCRINE_METABOLIC: 'Endocrine / metabolic',
  LEARNING_DISABILITY: 'Learning disability',
  DEVELOPMENTAL: 'Developmental',
  PALLIATIVE: 'Palliative',
  OTHER: 'Other',
}

export type MedicalConditionCatalogRow = {
  id: string
  code: string
  name: string
  category: MedicalConditionCatalogCategory | string
  description: string | null
  sortOrder: number
  isActive: boolean
}

export async function fetchMedicalConditionCatalogList(params?: {
  includeInactive?: boolean
}): Promise<MedicalConditionCatalogRow[]> {
  const qs = new URLSearchParams()
  if (params?.includeInactive) qs.set('includeInactive', 'true')
  const q = qs.toString()
  const res = await apiJson<ApiEnvelope<MedicalConditionCatalogRow[]>>(
    `/lookups/medical-condition-catalog${q ? `?${q}` : ''}`,
    { method: 'GET' },
  )
  return res.data
}

export async function createMedicalConditionCatalog(body: {
  name: string
  code: string
  category?: MedicalConditionCatalogCategory
  description?: string
  sortOrder?: number
}): Promise<MedicalConditionCatalogRow> {
  const res = await apiJson<ApiEnvelope<MedicalConditionCatalogRow>>(
    '/lookups/medical-condition-catalog',
    { method: 'POST', body: JSON.stringify(body) },
  )
  return res.data
}

export async function updateMedicalConditionCatalog(
  id: string,
  body: {
    name?: string
    code?: string
    category?: MedicalConditionCatalogCategory
    description?: string
    isActive?: boolean
    sortOrder?: number
  },
): Promise<MedicalConditionCatalogRow> {
  const res = await apiJson<ApiEnvelope<MedicalConditionCatalogRow>>(
    `/lookups/medical-condition-catalog/${id}`,
    { method: 'PATCH', body: JSON.stringify(body) },
  )
  return res.data
}

export async function deleteMedicalConditionCatalog(id: string): Promise<void> {
  await apiJson<ApiEnvelope<unknown>>(`/lookups/medical-condition-catalog/${id}`, {
    method: 'DELETE',
  })
}

export async function fetchAllergyCatalogList(): Promise<AllergyCatalogRow[]> {
  const res = await apiJson<ApiEnvelope<AllergyCatalogRow[]>>('/lookups/allergy-catalog', {
    method: 'GET',
  })
  return res.data
}

export async function createAllergyCatalog(body: {
  name: string
  code: string
  category?: AllergyCatalogCategory
  sortOrder?: number
}): Promise<AllergyCatalogRow> {
  const res = await apiJson<ApiEnvelope<AllergyCatalogRow>>('/lookups/allergy-catalog', {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return res.data
}

export async function updateAllergyCatalog(
  id: string,
  body: {
    name?: string
    code?: string
    category?: AllergyCatalogCategory
    sortOrder?: number
  },
): Promise<AllergyCatalogRow> {
  const res = await apiJson<ApiEnvelope<AllergyCatalogRow>>(`/lookups/allergy-catalog/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
  return res.data
}

export async function deleteAllergyCatalog(id: string): Promise<void> {
  await apiJson<ApiEnvelope<unknown>>(`/lookups/allergy-catalog/${id}`, {
    method: 'DELETE',
  })
}
