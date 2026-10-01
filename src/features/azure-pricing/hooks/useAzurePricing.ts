import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  acknowledgeAnomaly,
  exportCostBreakdownCsv,
  fetchAnomalies,
  fetchBaselineEstimate,
  fetchCostBreakdown,
  fetchCostOverview,
  fetchPlatformCostSettings,
  fetchRecommendations,
  fetchRetailPrices,
  fetchSyncRuns,
  fetchUnitEconomics,
  postEstimate,
  previewMonthlyReport,
  sendMonthlyReportTest,
  triggerCostSync,
  updatePlatformCostSettings,
} from '@/features/azure-pricing/api/azure-pricing.api'
import { azurePricingKeys } from '@/features/azure-pricing/keys'
import type {
  AnomalyStatusFilter,
  CostBreakdownParams,
  EstimateInput,
  PlatformCostSettingsInput,
  PriceListParams,
} from '@/features/azure-pricing/types'

/** Cost data is synced every few hours server-side; no need to refetch on every focus. */
const COST_STALE_MS = 5 * 60 * 1000

export function useCostOverview() {
  return useQuery({
    queryKey: azurePricingKeys.overview(),
    queryFn: fetchCostOverview,
    staleTime: COST_STALE_MS,
  })
}

export function useCostBreakdown(params: CostBreakdownParams, enabled = true) {
  return useQuery({
    queryKey: azurePricingKeys.breakdown(params),
    queryFn: () => fetchCostBreakdown(params),
    staleTime: COST_STALE_MS,
    placeholderData: keepPreviousData,
    enabled,
  })
}

export function useRetailPrices(params: PriceListParams) {
  return useQuery({
    queryKey: azurePricingKeys.prices(params),
    queryFn: () => fetchRetailPrices(params),
    staleTime: COST_STALE_MS,
    placeholderData: keepPreviousData,
  })
}

export function useBaselineEstimate() {
  return useQuery({
    queryKey: azurePricingKeys.baseline(),
    queryFn: fetchBaselineEstimate,
    staleTime: COST_STALE_MS,
  })
}

/** Read-only POST: modelled as a query keyed by the (debounced) scenario input. */
export function useEstimate(input: EstimateInput | null) {
  return useQuery({
    queryKey: azurePricingKeys.estimate(input),
    queryFn: () => postEstimate(input!),
    enabled: input !== null,
    staleTime: COST_STALE_MS,
    placeholderData: keepPreviousData,
  })
}

export function useRecommendations() {
  return useQuery({
    queryKey: azurePricingKeys.recommendations(),
    queryFn: fetchRecommendations,
    staleTime: COST_STALE_MS,
  })
}

export function useUnitEconomics(month: string) {
  return useQuery({
    queryKey: azurePricingKeys.unitEconomics(month),
    queryFn: () => fetchUnitEconomics(month),
    staleTime: COST_STALE_MS,
    placeholderData: keepPreviousData,
  })
}

export function useCostAnomalies(status: AnomalyStatusFilter) {
  return useQuery({
    queryKey: azurePricingKeys.anomalies(status),
    queryFn: () => fetchAnomalies(status),
    staleTime: 60 * 1000,
  })
}

export function useAcknowledgeAnomaly() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => acknowledgeAnomaly(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: azurePricingKeys.anomaliesRoot() })
      void qc.invalidateQueries({ queryKey: azurePricingKeys.overview() })
    },
  })
}

export function usePlatformCostSettings() {
  return useQuery({
    queryKey: azurePricingKeys.settings(),
    queryFn: fetchPlatformCostSettings,
    staleTime: 60 * 1000,
  })
}

export function useUpdatePlatformCostSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: PlatformCostSettingsInput) => updatePlatformCostSettings(body),
    onSuccess: data => {
      qc.setQueryData(azurePricingKeys.settings(), data)
    },
  })
}

export function useSyncRuns(limit = 20) {
  return useQuery({
    queryKey: azurePricingKeys.syncRuns(limit),
    queryFn: () => fetchSyncRuns(limit),
    staleTime: 15 * 1000,
    // Poll while a run is in progress so the table settles without a manual refresh.
    refetchInterval: query =>
      query.state.data?.items.some(r => r.status === 'running') ? 10 * 1000 : false,
  })
}

export function useTriggerCostSync() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: triggerCostSync,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...azurePricingKeys.all, 'sync-runs'] })
    },
  })
}

export function usePreviewMonthlyReport() {
  return useMutation({ mutationFn: previewMonthlyReport })
}

export function useSendMonthlyReportTest() {
  return useMutation({ mutationFn: sendMonthlyReportTest })
}

export function useExportCostBreakdown() {
  return useMutation({ mutationFn: (params: CostBreakdownParams) => exportCostBreakdownCsv(params) })
}
