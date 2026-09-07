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
}): Promise<ServiceUserFundingTypeRow> {
  const res = await apiJson<ApiEnvelope<ServiceUserFundingTypeRow>>(
    '/lookups/service-user-funding-types',
    { method: 'POST', body: JSON.stringify(body) },
  )
  return res.data
}

export async function updateServiceUserFundingType(
  id: string,
  body: { name?: string; code?: string },
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
