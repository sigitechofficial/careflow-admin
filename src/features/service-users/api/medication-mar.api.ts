import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'

export type MedicationStatusCodeRow = {
  id: string
  code: string
  label: string
  color: string
  textColor: string
  category: string
  reasonRequirement: string
  managerReviewRequirement: string
  sortOrder: number
  isActive: boolean
}

export type MedicationSupplySummary = {
  supplyModel: 'BLISTER_CYCLE' | 'BOTTLE_28DAY' | 'PRESCRIPTION_QTY'
  quantityRemaining: number | null
  quantityTotal: number | null
  qtyUnit: string
  daysRemaining: number | null
  deliveredAt: string | null
  cycleEndDate: string | null
  runsOutDate: string | null
  expiresAt: string | null
  openedAt: string | null
  pharmacyName: string | null
  packName: string | null
}

export type MarChartCell = {
  day: number
  date: string
  cellState: 'due' | 'na' | 'prn' | 'recorded'
  recordId: string | null
  statusCode: string | null
  statusLabel: string | null
  color: string | null
  textColor: string | null
  requiresReview: boolean
}

export type MarChartMedicationRow = {
  medicationId: string
  scheduleId: string | null
  medicationName: string
  packName: string | null
  dose: string | null
  strength: string | null
  routeName: string | null
  type: string | null
  frequency: string | null
  scheduleType: 'daily' | 'weekly' | 'specific' | 'prn' | 'monthly' | 'interval'
  timeSlot: string
  dueTime: string | null
  roundWindowStart: string | null
  roundWindowEnd: string | null
  startDate: string | null
  endDate: string | null
  days: MarChartCell[]
}

export type MarChartQueryParams = {
  month?: string
  dateFrom?: string
  dateTo?: string
  medicationIds?: string[]
  /** Visit workspace: scopes PRN "recorded" cells to this visit (ScheduledVisit id). */
  prnVisitId?: string
}

export type PackExportDetailMode = 'summary' | 'full'

export type MarChartExportParams = MarChartQueryParams & {
  /** Up to 6 months — Excel gets one worksheet per month */
  months?: string[]
  /** In-app preview only — skips export audit on the server */
  preview?: boolean
  /** Blister pack rows: summary compartments only vs include member medicines */
  packExportDetail?: 'summary' | 'full'
}

export function buildMarChartQueryString(
  params: MarChartExportParams & { months?: string[]; format?: string },
): string {
  const qs = new URLSearchParams()
  if (params.month) qs.set('month', params.month)
  if (params.dateFrom) qs.set('dateFrom', params.dateFrom)
  if (params.dateTo) qs.set('dateTo', params.dateTo)
  if (params.months?.length) qs.set('months', params.months.join(','))
  if (params.medicationIds?.length) qs.set('medicationIds', params.medicationIds.join(','))
  if (params.prnVisitId) qs.set('prnVisitId', params.prnVisitId)
  if (params.packExportDetail) qs.set('packExportDetail', params.packExportDetail)
  if (params.format) qs.set('format', params.format)
  if (params.preview) qs.set('preview', 'true')
  return qs.toString()
}

export function marExportFilenameSuffix(params: MarChartExportParams): string {
  if (params.months?.length) return params.months.join('_')
  if (params.dateFrom && params.dateTo) return `${params.dateFrom}_${params.dateTo}`
  if (params.month) return params.month
  return 'export'
}

export type MedicationRegularChartResponse = {
  month: string
  lastDay: number
  periodStart?: string
  periodEnd?: string
  periodLabel?: string
  dayDates?: string[]
  medicationCount?: number
  scheduleRowCount?: number
  legend: Array<{
    code: string
    label: string
    color: string
    textColor: string
    requiresReview: boolean
  }>
  summary: {
    date: string
    due: number
    recorded: number
    missed: number
    reviewToday: number
  }
  monthStats?: {
    completionThroughDate: string
    scheduledToDate: number
    documented: number
    stillOpen: number
    given: number
    notGiven: number
    marCompletionPercent: number | null
    prnAdministered: number
    /** @deprecated Use stillOpen */
    due: number
    /** @deprecated Use documented */
    recorded: number
    /** @deprecated Use marCompletionPercent */
    compliancePercent: number | null
  }
  /** Quantity / days remaining per medication id (MAR group headers). */
  supplyByMedicationId?: Record<string, MedicationSupplySummary>
  medications: MarChartMedicationRow[]
}

export type CreateMedicationEventPayload = {
  serviceUserMedicationId: string
  medicationScheduleId?: string
  statusCode: string
  scheduledDateTime?: string
  actualDateTime?: string
  reason?: string
  notes?: string
  doseGiven?: string
  isPrn?: boolean
  prnReason?: string
  prnOutcome?: string
  administeredById?: string
  recordOnBehalfOfCarer?: boolean
}

export type CorrectMedicationEventPayload = {
  eventId: string
  statusCode: string
  correctionReason?: string
  correctionNotes: string
  reason?: string
  notes?: string
}

export type MedicationAdministrationEventRow = {
  id: string
  status: string
  serviceUserMedicationId: string
  medicationScheduleId: string | null
  scheduledDateTime: string | null
  actualDateTime: string | null
  reason: string | null
  notes: string | null
}

async function downloadMarExport(
  serviceUserId: string,
  params: MarChartExportParams,
  format: 'html' | 'pdf' | 'csv' | 'xls' | 'xlsx',
  init?: RequestInit,
): Promise<Blob> {
  const { getApiBaseUrl } = await import('@/shared/lib/api-base')
  const { useAuthStore } = await import('@/features/auth/store')
  const base = getApiBaseUrl()
  const token = useAuthStore.getState().accessToken
  const qs = buildMarChartQueryString({ ...params, format })
  const headers = new Headers(init?.headers)
  if (token) headers.set('Authorization', `Bearer ${token}`)
  const res = await fetch(`${base}/service-users/${serviceUserId}/medication-chart/regular/export?${qs}`, {
    method: 'GET',
    headers,
    ...init,
  })
  if (!res.ok) {
    const text = await res.text()
    let message = text || `Export failed (${res.status})`
    try {
      const json = JSON.parse(text) as {
        message?: string
        errors?: string[]
      }
      if (json.errors?.length) message = json.errors.join('; ')
      else if (json.message) message = json.message
    } catch {
      /* plain text body */
    }
    throw new Error(message)
  }
  const blob = await res.blob()
  if (format === 'pdf') {
    const header = await blob.slice(0, 5).text()
    if (!header.startsWith('%PDF')) {
      const hint = await blob.text()
      throw new Error(
        hint.slice(0, 200) || 'Server did not return a PDF — restart the backend after pulling latest code.',
      )
    }
  }
  return blob
}

export async function downloadMarExportHtml(
  serviceUserId: string,
  params: MarChartExportParams,
  init?: RequestInit,
): Promise<string> {
  const blob = await downloadMarExport(serviceUserId, params, 'html', init)
  return blob.text()
}

export async function downloadMarExportPdf(
  serviceUserId: string,
  params: MarChartExportParams,
  init?: RequestInit,
): Promise<Blob> {
  return downloadMarExport(serviceUserId, params, 'pdf', init)
}

export async function downloadMarExportCsv(
  serviceUserId: string,
  params: MarChartExportParams,
  init?: RequestInit,
): Promise<Blob> {
  return downloadMarExport(serviceUserId, params, 'csv', init)
}

export async function downloadMarExportExcel(
  serviceUserId: string,
  params: MarChartExportParams,
  init?: RequestInit,
): Promise<Blob> {
  return downloadMarExport(serviceUserId, params, 'xlsx', init)
}

export async function reviewMedicationAdministrationEvent(
  serviceUserId: string,
  eventId: string,
  body: { notes?: string },
): Promise<MedicationEventDetail> {
  const res = await apiJson<ApiEnvelope<MedicationEventDetail> | MedicationEventDetail>(
    `/service-users/${serviceUserId}/medication-events/${eventId}/review`,
    { method: 'POST', body: JSON.stringify(body) },
  )
  return res && typeof res === 'object' && 'data' in res
    ? (res as ApiEnvelope<MedicationEventDetail>).data
    : (res as MedicationEventDetail)
}

export async function fetchMedicationRegularChart(
  serviceUserId: string,
  params: MarChartQueryParams & { month?: string },
  init?: RequestInit,
): Promise<MedicationRegularChartResponse> {
  const qs = buildMarChartQueryString(params)
  const res = await apiJson<ApiEnvelope<MedicationRegularChartResponse>>(
    `/service-users/${serviceUserId}/medication-chart/regular?${qs}`,
    { method: 'GET', ...init },
  )
  return res.data
}

export async function createMedicationAdministrationEvent(
  serviceUserId: string,
  body: CreateMedicationEventPayload,
): Promise<MedicationAdministrationEventRow> {
  const res = await apiJson<ApiEnvelope<MedicationAdministrationEventRow>>(
    `/service-users/${serviceUserId}/medication-events`,
    { method: 'POST', body: JSON.stringify(body) },
  )
  return res.data
}

export type MedicationEventUserRef = {
  id: string
  firstName: string | null
  lastName: string | null
  email?: string
}

export type MedicationEventDetail = {
  id: string
  status: string
  statusCode?: string | null
  scheduledDateTime: string | null
  actualDateTime: string | null
  reason: string | null
  notes: string | null
  doseGiven: string | null
  /** How the carer supported the dose (e.g. Independent / Prompted / Assisted / Administered). */
  supportLevel?: string | null
  /** Carer-app clock-face time the dose was given (HH:mm), org timezone. */
  timeGiven?: string | null
  outcomeLabel?: string | null
  isPrn?: boolean
  prnReason: string | null
  prnOutcome: string | null
  correctionReason?: string | null
  correctionNotes?: string | null
  medicationNameSnapshot?: string | null
  doseSnapshot?: string | null
  strengthSnapshot?: string | null
  routeNameSnapshot?: string | null
  managerReviewedAt?: string | null
  managerReviewNotes?: string | null
  createdAt: string
  updatedAt?: string
  medication: {
    medicationName: string
    dose: string | null
    strength: string | null
    route?: { name: string } | null
  }
  schedule?: {
    dueTime: string | null
    dueVisitName?: string | null
    round?: {
      name: string
      time?: string | null
      windowStart?: string | null
      windowEnd?: string | null
    } | null
  } | null
  round?: {
    name: string
    time?: string | null
    windowStart?: string | null
    windowEnd?: string | null
  } | null
  administeredBy?: {
    personalDetail?: { firstName: string | null; lastName: string | null } | null
  } | null
  enteredBy?: MedicationEventUserRef | null
  createdBy?: MedicationEventUserRef | null
  managerReviewedBy?: MedicationEventUserRef | null
  notGivenReason?: { name: string } | null
}

export async function fetchMedicationEvent(
  serviceUserId: string,
  eventId: string,
  init?: RequestInit,
): Promise<MedicationEventDetail> {
  const res = await apiJson<ApiEnvelope<MedicationEventDetail> | MedicationEventDetail>(
    `/service-users/${serviceUserId}/medication-events/${eventId}`,
    { method: 'GET', ...init },
  )
  return res && typeof res === 'object' && 'data' in res ? (res as ApiEnvelope<MedicationEventDetail>).data : (res as MedicationEventDetail)
}

export type MedicationEventListRow = MedicationEventDetail & {
  serviceUserMedicationId: string
}

export async function patchMedicationAdministrationEvent(
  serviceUserId: string,
  eventId: string,
  body: Omit<CorrectMedicationEventPayload, 'eventId'>,
): Promise<MedicationEventDetail> {
  const res = await apiJson<ApiEnvelope<MedicationEventDetail> | MedicationEventDetail>(
    `/service-users/${serviceUserId}/medication-events/${eventId}`,
    { method: 'PATCH', body: JSON.stringify(body) },
  )
  return res && typeof res === 'object' && 'data' in res
    ? (res as ApiEnvelope<MedicationEventDetail>).data
    : (res as MedicationEventDetail)
}

export async function listMedicationEvents(
  serviceUserId: string,
  params: {
    page?: number
    limit?: number
    medicationId?: string
    medicationIds?: string[]
    dateFrom?: string
    dateTo?: string
    needsReview?: boolean
    status?: string
    statusCode?: string
  } = {},
  init?: RequestInit,
): Promise<{ data: MedicationEventListRow[]; meta: { total: number; page: number; limit: number } }> {
  const qs = new URLSearchParams()
  if (params.page != null) qs.set('page', String(params.page))
  if (params.limit != null) qs.set('limit', String(params.limit))
  const medIds = params.medicationIds?.filter(Boolean) ?? []
  if (medIds.length === 1) {
    qs.set('medicationId', medIds[0]!)
  } else if (medIds.length > 1) {
    qs.set('medicationIds', medIds.join(','))
  } else if (params.medicationId) {
    qs.set('medicationId', params.medicationId)
  }
  if (params.dateFrom) qs.set('dateFrom', params.dateFrom)
  if (params.dateTo) qs.set('dateTo', params.dateTo)
  if (params.needsReview) qs.set('needsReview', 'true')
  if (params.statusCode) qs.set('statusCode', params.statusCode)
  else if (params.status) qs.set('status', params.status)
  const q = qs.toString()
  const res = await apiJson<
    ApiEnvelope<MedicationEventListRow[]> | { data: MedicationEventListRow[]; meta?: Record<string, unknown> }
  >(`/service-users/${serviceUserId}/medication-events${q ? `?${q}` : ''}`, { method: 'GET', ...init })
  const payload =
    res && typeof res === 'object' && 'success' in res
      ? { data: (res as ApiEnvelope<MedicationEventListRow[]>).data, meta: (res as ApiEnvelope<MedicationEventListRow[]>).meta }
      : (res as { data: MedicationEventListRow[]; meta?: Record<string, unknown> })
  const meta = (payload.meta ?? {}) as { total?: number; page?: number; limit?: number }
  return {
    data: payload.data ?? [],
    meta: {
      total: meta.total ?? payload.data?.length ?? 0,
      page: meta.page ?? 1,
      limit: meta.limit ?? 20,
    },
  }
}

export type MedicationSupplyDeliveryRow = {
  id: string
  deliveredAt: string
  cycleEndDate: string | null
  openedAt: string | null
  expiresAt: string | null
  runsOutDate: string | null
  quantity: number | null
  pharmacyName: string | null
  notes: string | null
  receivedBy: { id: string; name: string } | null
  witnessBy: { id: string; name: string } | null
  createdAt: string
}

export type MedicationSupplyCard = {
  medicationId: string
  relatedMedicationIds?: string[]
  medicationName: string
  packName: string | null
  dose: string | null
  strength: string | null
  isControlledMedication: boolean
  supplyModel: 'BLISTER_CYCLE' | 'BOTTLE_28DAY' | 'PRESCRIPTION_QTY'
  supplyProfile: unknown | null
  supplySummary: MedicationSupplySummary | null
  /** Average scheduled doses per day (from MAR schedules). */
  dosesPerDay?: number
  scheduleSlotCount?: number
  recentDeliveries: MedicationSupplyDeliveryRow[]
}

export type MedicationSupplyBundle = {
  medications: MedicationSupplyCard[]
}

export async function fetchMedicationSupplyBundle(
  serviceUserId: string,
  init?: RequestInit,
): Promise<MedicationSupplyBundle> {
  const res = await apiJson<ApiEnvelope<MedicationSupplyBundle> | MedicationSupplyBundle>(
    `/service-users/${serviceUserId}/medication-supply`,
    { method: 'GET', ...init },
  )
  return res && typeof res === 'object' && 'data' in res
    ? (res as ApiEnvelope<MedicationSupplyBundle>).data
    : (res as MedicationSupplyBundle)
}

export type CreateSupplyDeliveryPayload = {
  serviceUserMedicationId: string
  deliveredAt: string
  cycleEndDate?: string
  openedAt?: string
  expiresAt?: string
  runsOutDate?: string
  quantity?: number
  pharmacyName?: string
  notes?: string
}

export async function createMedicationSupplyDelivery(
  serviceUserId: string,
  body: CreateSupplyDeliveryPayload,
): Promise<unknown> {
  const res = await apiJson<ApiEnvelope<unknown>>(
    `/service-users/${serviceUserId}/medication-supply/deliveries`,
    { method: 'POST', body: JSON.stringify(body) },
  )
  return res.data
}
