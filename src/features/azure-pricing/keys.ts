import type {
  AnomalyStatusFilter,
  CostBreakdownParams,
  EstimateInput,
  PriceListParams,
} from '@/features/azure-pricing/types'

export const azurePricingKeys = {
  all: ['azure-pricing'] as const,
  overview: () => [...azurePricingKeys.all, 'overview'] as const,
  breakdown: (params: CostBreakdownParams) => [...azurePricingKeys.all, 'breakdown', params] as const,
  prices: (params: PriceListParams) => [...azurePricingKeys.all, 'prices', params] as const,
  baseline: () => [...azurePricingKeys.all, 'estimate-baseline'] as const,
  estimate: (input: EstimateInput | null) => [...azurePricingKeys.all, 'estimate', input] as const,
  recommendations: () => [...azurePricingKeys.all, 'recommendations'] as const,
  unitEconomics: (month: string) => [...azurePricingKeys.all, 'unit-economics', month] as const,
  anomaliesRoot: () => [...azurePricingKeys.all, 'anomalies'] as const,
  anomalies: (status: AnomalyStatusFilter) => [...azurePricingKeys.anomaliesRoot(), status] as const,
  settings: () => [...azurePricingKeys.all, 'settings'] as const,
  syncRuns: (limit: number) => [...azurePricingKeys.all, 'sync-runs', limit] as const,
}
