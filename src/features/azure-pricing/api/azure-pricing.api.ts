import { apiJson } from '@/shared/api/api-client'
import type {
  AdvisorRecommendations,
  AnomalyStatusFilter,
  BaselineEstimate,
  CostAnomaly,
  CostAnomalyList,
  CostBreakdown,
  CostBreakdownParams,
  CostOverview,
  EstimateInput,
  EstimateResult,
  MonthlyReportPreview,
  PlatformCostSettings,
  PlatformCostSettingsInput,
  PriceListParams,
  RetailPriceList,
  SyncRunList,
  SyncTriggerResult,
  UnitEconomics,
} from '@/features/azure-pricing/types'

const BASE = '/platform-costs'

function buildQuery(params?: Record<string, string | number | boolean | undefined | null>): string {
  const qs = new URLSearchParams()
  if (!params) return ''
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue
    qs.set(key, String(value))
  }
  const s = qs.toString()
  return s ? `?${s}` : ''
}

/** The Nest ResponseInterceptor wraps JSON as `{ success, message, data }`; tolerate a bare body too. */
export function unwrapEnvelope<T>(body: unknown): T {
  if (body && typeof body === 'object' && 'success' in body && 'data' in body) {
    return (body as { data: T }).data
  }
  return body as T
}

async function getData<T>(path: string): Promise<T> {
  return unwrapEnvelope<T>(await apiJson<unknown>(path, { method: 'GET' }))
}

async function sendData<T>(path: string, method: 'POST' | 'PATCH', body?: unknown): Promise<T> {
  return unwrapEnvelope<T>(
    await apiJson<unknown>(path, {
      method,
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  )
}

export function fetchCostOverview(): Promise<CostOverview> {
  return getData<CostOverview>(`${BASE}/overview`)
}

export function fetchCostBreakdown(params: CostBreakdownParams): Promise<CostBreakdown> {
  return getData<CostBreakdown>(`${BASE}/breakdown${buildQuery({ ...params })}`)
}

export function fetchRetailPrices(params: PriceListParams): Promise<RetailPriceList> {
  return getData<RetailPriceList>(`${BASE}/prices${buildQuery({ service: params.service, usedOnly: params.usedOnly })}`)
}

export function fetchBaselineEstimate(): Promise<BaselineEstimate> {
  return getData<BaselineEstimate>(`${BASE}/estimate/baseline`)
}

export function postEstimate(input: EstimateInput): Promise<EstimateResult> {
  return sendData<EstimateResult>(`${BASE}/estimate`, 'POST', input)
}

export function fetchRecommendations(): Promise<AdvisorRecommendations> {
  return getData<AdvisorRecommendations>(`${BASE}/recommendations`)
}

export function fetchUnitEconomics(month?: string): Promise<UnitEconomics> {
  return getData<UnitEconomics>(`${BASE}/unit-economics${buildQuery({ month })}`)
}

export function fetchAnomalies(status: AnomalyStatusFilter): Promise<CostAnomalyList> {
  return getData<CostAnomalyList>(`${BASE}/anomalies${buildQuery({ status })}`)
}

export function acknowledgeAnomaly(id: string): Promise<CostAnomaly> {
  return sendData<CostAnomaly>(`${BASE}/anomalies/${encodeURIComponent(id)}/acknowledge`, 'POST')
}

export function fetchPlatformCostSettings(): Promise<PlatformCostSettings> {
  return getData<PlatformCostSettings>(`${BASE}/settings`)
}

export function updatePlatformCostSettings(body: PlatformCostSettingsInput): Promise<PlatformCostSettings> {
  return sendData<PlatformCostSettings>(`${BASE}/settings`, 'PATCH', body)
}

export function triggerCostSync(): Promise<SyncTriggerResult> {
  return sendData<SyncTriggerResult>(`${BASE}/sync`, 'POST')
}

export function fetchSyncRuns(limit = 20): Promise<SyncRunList> {
  return getData<SyncRunList>(`${BASE}/sync-runs${buildQuery({ limit })}`)
}

export function previewMonthlyReport(): Promise<MonthlyReportPreview> {
  return sendData<MonthlyReportPreview>(`${BASE}/reports/monthly/preview`, 'POST')
}

export function sendMonthlyReportTest(): Promise<unknown> {
  return sendData<unknown>(`${BASE}/reports/monthly/send-test`, 'POST')
}

/**
 * Download the cost breakdown as CSV (auth via the shared client, incl. token refresh).
 * The API streams `text/csv`; a JSON-wrapped string or `{ csv }` is tolerated as well.
 */
export async function exportCostBreakdownCsv(params: CostBreakdownParams): Promise<{ csv: string; filename: string }> {
  const body = await apiJson<unknown>(`${BASE}/export${buildQuery({ ...params, format: 'csv' })}`, {
    method: 'GET',
    headers: { Accept: 'text/csv' },
  })
  const data = unwrapEnvelope<unknown>(body)
  let csv = ''
  if (typeof data === 'string') csv = data
  else if (data && typeof data === 'object' && 'csv' in data && typeof (data as { csv: unknown }).csv === 'string') {
    csv = (data as { csv: string }).csv
  }
  return {
    csv,
    filename: `azure-costs-${params.groupBy}-${params.from}-to-${params.to}.csv`,
  }
}
