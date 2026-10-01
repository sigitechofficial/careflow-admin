import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'
import type {
  MedicalAlertCategory,
  MedicalAlertRow,
  MedicalAlertSeverity,
  MedicalConditionCatalogRow,
  MedicalHistoryEventRow,
  MonitoringConfigRow,
  ReasonableAdjustmentRow,
  ReasonableAdjustmentType,
  ServiceUserClinicalDataSource,
  ServiceUserMedicalConditionRow,
  ServiceUserMedicalConditionStatus,
  UsualParameterRow,
} from './medical-clinical.types'

function unwrapData<T>(res: ApiEnvelope<T> | { data: T } | T): T {
  if (res && typeof res === 'object' && 'data' in (res as object)) {
    return (res as { data: T }).data
  }
  return res as T
}

export async function fetchMedicalConditionCatalog(params?: {
  search?: string
  includeInactive?: boolean
  signal?: AbortSignal
}): Promise<MedicalConditionCatalogRow[]> {
  const qs = new URLSearchParams()
  if (params?.search?.trim()) qs.set('search', params.search.trim())
  if (params?.includeInactive) qs.set('includeInactive', 'true')
  const q = qs.toString()
  const res = await apiJson<ApiEnvelope<MedicalConditionCatalogRow[]>>(
    `/lookups/medical-condition-catalog${q ? `?${q}` : ''}`,
    { method: 'GET', signal: params?.signal },
  )
  return unwrapData(res) ?? []
}

export async function listServiceUserMedicalConditions(
  serviceUserId: string,
  init?: RequestInit,
): Promise<ServiceUserMedicalConditionRow[]> {
  const res = await apiJson<ApiEnvelope<ServiceUserMedicalConditionRow[]>>(
    `/service-users/${serviceUserId}/medical-conditions`,
    { method: 'GET', ...init },
  )
  return unwrapData(res) ?? []
}

/** Care plan forms recommended from active medical conditions (no IA required). */
export async function listMedicalConditionCarePlanRecommendations(
  serviceUserId: string,
  init?: RequestInit,
): Promise<
  Array<{
    id: string
    carePlanArea: string
    sectionNumber: number
    sectionTitle: string
    title: string
    triggerCount: number
    triggers: Array<{ questionId: string; questionText: string; specRef?: string }>
    status: 'pending' | 'accepted' | 'declined'
    carePathwayFormId?: string
    carePathwayFormName?: string
    source?: 'rule' | 'legacy' | 'medical_condition'
  }>
> {
  const res = await apiJson<
    ApiEnvelope<
      Array<{
        id: string
        carePlanArea: string
        sectionNumber: number
        sectionTitle: string
        title: string
        triggerCount: number
        triggers: Array<{ questionId: string; questionText: string; specRef?: string }>
        status: 'pending' | 'accepted' | 'declined'
        carePathwayFormId?: string
        carePathwayFormName?: string
        source?: 'rule' | 'legacy' | 'medical_condition'
      }>
    >
  >(`/service-users/${serviceUserId}/medical-conditions/care-plan-recommendations`, {
    method: 'GET',
    ...init,
  })
  return unwrapData(res) ?? []
}

export type CreateMedicalConditionPayload = {
  conditionId: string
  status?: ServiceUserMedicalConditionStatus
  notes?: string
  onsetDate?: string
  reviewDate?: string
  source?: ServiceUserClinicalDataSource
  impactOnCare?: string
  carerGuidance?: string
  confirmationSource?: string
}

export type UpdateMedicalConditionPayload = Partial<CreateMedicalConditionPayload>

export async function createServiceUserMedicalCondition(
  serviceUserId: string,
  body: CreateMedicalConditionPayload,
): Promise<ServiceUserMedicalConditionRow> {
  const res = await apiJson<ApiEnvelope<ServiceUserMedicalConditionRow>>(
    `/service-users/${serviceUserId}/medical-conditions`,
    { method: 'POST', body: JSON.stringify(body) },
  )
  return unwrapData(res)
}

export async function updateServiceUserMedicalCondition(
  serviceUserId: string,
  id: string,
  body: UpdateMedicalConditionPayload,
): Promise<ServiceUserMedicalConditionRow> {
  const res = await apiJson<ApiEnvelope<ServiceUserMedicalConditionRow>>(
    `/service-users/${serviceUserId}/medical-conditions/${id}`,
    { method: 'PATCH', body: JSON.stringify(body) },
  )
  return unwrapData(res)
}

export async function discontinueServiceUserMedicalCondition(
  serviceUserId: string,
  id: string,
): Promise<ServiceUserMedicalConditionRow> {
  const res = await apiJson<ApiEnvelope<ServiceUserMedicalConditionRow>>(
    `/service-users/${serviceUserId}/medical-conditions/${id}`,
    { method: 'DELETE' },
  )
  return unwrapData(res)
}

export async function listReasonableAdjustments(
  serviceUserId: string,
  init?: RequestInit,
): Promise<ReasonableAdjustmentRow[]> {
  const res = await apiJson<ApiEnvelope<ReasonableAdjustmentRow[]>>(
    `/service-users/${serviceUserId}/reasonable-adjustments`,
    { method: 'GET', ...init },
  )
  return unwrapData(res) ?? []
}

export type CreateReasonableAdjustmentPayload = {
  type: ReasonableAdjustmentType
  description: string
  notes?: string
  source?: ServiceUserClinicalDataSource
}

export type UpdateReasonableAdjustmentPayload = Partial<CreateReasonableAdjustmentPayload> & {
  isActive?: boolean
}

export async function createReasonableAdjustment(
  serviceUserId: string,
  body: CreateReasonableAdjustmentPayload,
): Promise<ReasonableAdjustmentRow> {
  const res = await apiJson<ApiEnvelope<ReasonableAdjustmentRow>>(
    `/service-users/${serviceUserId}/reasonable-adjustments`,
    { method: 'POST', body: JSON.stringify(body) },
  )
  return unwrapData(res)
}

export async function updateReasonableAdjustment(
  serviceUserId: string,
  id: string,
  body: UpdateReasonableAdjustmentPayload,
): Promise<ReasonableAdjustmentRow> {
  const res = await apiJson<ApiEnvelope<ReasonableAdjustmentRow>>(
    `/service-users/${serviceUserId}/reasonable-adjustments/${id}`,
    { method: 'PATCH', body: JSON.stringify(body) },
  )
  return unwrapData(res)
}

export async function deactivateReasonableAdjustment(
  serviceUserId: string,
  id: string,
): Promise<ReasonableAdjustmentRow> {
  const res = await apiJson<ApiEnvelope<ReasonableAdjustmentRow>>(
    `/service-users/${serviceUserId}/reasonable-adjustments/${id}`,
    { method: 'DELETE' },
  )
  return unwrapData(res)
}

export async function listMedicalHistory(
  serviceUserId: string,
  init?: RequestInit,
): Promise<MedicalHistoryEventRow[]> {
  const res = await apiJson<ApiEnvelope<MedicalHistoryEventRow[]>>(
    `/service-users/${serviceUserId}/medical-history`,
    { method: 'GET', ...init },
  )
  return unwrapData(res) ?? []
}

export type CreateMedicalHistoryPayload = {
  title: string
  eventDate?: string
  approximateDate?: string
  description?: string
  notes?: string
  source?: ServiceUserClinicalDataSource
}

export type UpdateMedicalHistoryPayload = Partial<CreateMedicalHistoryPayload> & {
  isActive?: boolean
}

export async function createMedicalHistoryEvent(
  serviceUserId: string,
  body: CreateMedicalHistoryPayload,
): Promise<MedicalHistoryEventRow> {
  const res = await apiJson<ApiEnvelope<MedicalHistoryEventRow>>(
    `/service-users/${serviceUserId}/medical-history`,
    { method: 'POST', body: JSON.stringify(body) },
  )
  return unwrapData(res)
}

export async function updateMedicalHistoryEvent(
  serviceUserId: string,
  id: string,
  body: UpdateMedicalHistoryPayload,
): Promise<MedicalHistoryEventRow> {
  const res = await apiJson<ApiEnvelope<MedicalHistoryEventRow>>(
    `/service-users/${serviceUserId}/medical-history/${id}`,
    { method: 'PATCH', body: JSON.stringify(body) },
  )
  return unwrapData(res)
}

export async function deactivateMedicalHistoryEvent(
  serviceUserId: string,
  id: string,
): Promise<MedicalHistoryEventRow> {
  const res = await apiJson<ApiEnvelope<MedicalHistoryEventRow>>(
    `/service-users/${serviceUserId}/medical-history/${id}`,
    { method: 'DELETE' },
  )
  return unwrapData(res)
}

export async function listMonitoringConfig(
  serviceUserId: string,
  init?: RequestInit,
): Promise<MonitoringConfigRow[]> {
  const res = await apiJson<ApiEnvelope<MonitoringConfigRow[]>>(
    `/service-users/${serviceUserId}/monitoring-config`,
    { method: 'GET', ...init },
  )
  return unwrapData(res) ?? []
}

export type UpsertMonitoringConfigPayload = {
  configKey: string
  enabled?: boolean
  numericValue?: number
  booleanValue?: boolean
  textValue?: string
  notes?: string
  observationTypeId?: string
}

export async function upsertMonitoringConfig(
  serviceUserId: string,
  body: UpsertMonitoringConfigPayload,
): Promise<MonitoringConfigRow> {
  const res = await apiJson<ApiEnvelope<MonitoringConfigRow>>(
    `/service-users/${serviceUserId}/monitoring-config`,
    { method: 'POST', body: JSON.stringify(body) },
  )
  return unwrapData(res)
}

export async function deactivateMonitoringConfig(
  serviceUserId: string,
  configKey: string,
): Promise<MonitoringConfigRow> {
  const res = await apiJson<ApiEnvelope<MonitoringConfigRow>>(
    `/service-users/${serviceUserId}/monitoring-config/${encodeURIComponent(configKey)}`,
    { method: 'DELETE' },
  )
  return unwrapData(res)
}

export async function listUsualParameters(
  serviceUserId: string,
  init?: RequestInit,
): Promise<UsualParameterRow[]> {
  const res = await apiJson<ApiEnvelope<UsualParameterRow[]>>(
    `/service-users/${serviceUserId}/usual-parameters`,
    { method: 'GET', ...init },
  )
  return unwrapData(res) ?? []
}

export type UpsertUsualParameterPayload = {
  observationTypeId: string
  enabled?: boolean
  usualNumericValue?: number | null
  usualTextValue?: string | null
  usualPayload?: Record<string, unknown> | null
  lowerBand?: number | null
  upperBand?: number | null
  notes?: string
}

export type UpdateUsualParameterPayload = Omit<UpsertUsualParameterPayload, 'observationTypeId'>

export async function upsertUsualParameter(
  serviceUserId: string,
  body: UpsertUsualParameterPayload,
): Promise<UsualParameterRow> {
  const res = await apiJson<ApiEnvelope<UsualParameterRow>>(
    `/service-users/${serviceUserId}/usual-parameters`,
    { method: 'POST', body: JSON.stringify(body) },
  )
  return unwrapData(res)
}

export async function updateUsualParameter(
  serviceUserId: string,
  id: string,
  body: UpdateUsualParameterPayload,
): Promise<UsualParameterRow> {
  const res = await apiJson<ApiEnvelope<UsualParameterRow>>(
    `/service-users/${serviceUserId}/usual-parameters/${id}`,
    { method: 'PATCH', body: JSON.stringify(body) },
  )
  return unwrapData(res)
}

export async function deactivateUsualParameter(
  serviceUserId: string,
  id: string,
): Promise<UsualParameterRow> {
  const res = await apiJson<ApiEnvelope<UsualParameterRow>>(
    `/service-users/${serviceUserId}/usual-parameters/${id}`,
    { method: 'DELETE' },
  )
  return unwrapData(res)
}

// ─── Medical Alerts CRUD ──────────────────────────────────────────────────────

export async function listMedicalAlerts(
  serviceUserId: string,
  init?: RequestInit,
): Promise<MedicalAlertRow[]> {
  const res = await apiJson<ApiEnvelope<MedicalAlertRow[]>>(
    `/service-users/${serviceUserId}/medical-alerts`,
    { method: 'GET', ...init },
  )
  return unwrapData(res) ?? []
}

export type CreateMedicalAlertPayload = {
  title: string
  category?: MedicalAlertCategory
  severity?: MedicalAlertSeverity
  description?: string
  actionForCarer?: string
  notes?: string
  source?: ServiceUserClinicalDataSource
}

export type UpdateMedicalAlertPayload = Partial<CreateMedicalAlertPayload> & {
  isActive?: boolean
}

export async function createMedicalAlert(
  serviceUserId: string,
  body: CreateMedicalAlertPayload,
): Promise<MedicalAlertRow> {
  const res = await apiJson<ApiEnvelope<MedicalAlertRow>>(
    `/service-users/${serviceUserId}/medical-alerts`,
    { method: 'POST', body: JSON.stringify(body) },
  )
  return unwrapData(res)
}

export async function updateMedicalAlert(
  serviceUserId: string,
  id: string,
  body: UpdateMedicalAlertPayload,
): Promise<MedicalAlertRow> {
  const res = await apiJson<ApiEnvelope<MedicalAlertRow>>(
    `/service-users/${serviceUserId}/medical-alerts/${id}`,
    { method: 'PATCH', body: JSON.stringify(body) },
  )
  return unwrapData(res)
}

export async function deactivateMedicalAlert(
  serviceUserId: string,
  id: string,
): Promise<MedicalAlertRow> {
  const res = await apiJson<ApiEnvelope<MedicalAlertRow>>(
    `/service-users/${serviceUserId}/medical-alerts/${id}`,
    { method: 'DELETE' },
  )
  return unwrapData(res)
}

export type MedicalSafetySummaryData = {
  serviceUserId: string
  medicalConditions?: unknown
  reasonableAdjustments?: unknown
  medicalHistory?: unknown
  monitoringConfig?: unknown
  usualParameters?: unknown
  allergies?: unknown
  medicationAllergies?: unknown
  flashMessage?: unknown
  riskLevel?: unknown
  legalDocuments?: unknown
  initialAssessmentRisks?: unknown
  bodyMapAlerts?: unknown
  meta?: {
    sourcesIncluded: string[]
    sourcesOmitted: string[]
    composedAt: string
  }
}

export async function fetchMedicalSafetySummary(
  serviceUserId: string,
  init?: RequestInit,
): Promise<MedicalSafetySummaryData> {
  const res = await apiJson<ApiEnvelope<MedicalSafetySummaryData>>(
    `/service-users/${serviceUserId}/medical-safety-summary`,
    { method: 'GET', ...init },
  )
  return unwrapData(res)
}
