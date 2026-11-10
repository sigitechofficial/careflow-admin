/**
 * Azure Pricing (platform costs) — types mirror the `/platform-costs/*` JSON contract.
 * Money values are numbers in major units (GBP, 2 dp); dates are `YYYY-MM-DD`; timestamps ISO.
 */

export const AZURE_PRICING_TAB_IDS = [
  'overview',
  'breakdown',
  'prices',
  'alerts',
  'recommendations',
  'business',
  'reports',
] as const

export type AzurePricingTabId = (typeof AZURE_PRICING_TAB_IDS)[number]

export function isAzurePricingTabId(value: unknown): value is AzurePricingTabId {
  return typeof value === 'string' && (AZURE_PRICING_TAB_IDS as readonly string[]).includes(value)
}

export interface CostFreshness {
  enabled: boolean
  currency: string
  lastSyncedAt: string | null
  dataThrough: string | null
}

export interface DailyCost {
  date: string
  cost: number
  /**
   * Optional per-group split for the stacked chart (not in the v1 contract; rendered only when
   * the API sends it).
   */
  groups?: Record<string, number>
}

export interface CostShareRow {
  key: string
  label: string
  cost: number
  share: number
  resourceGroup?: string | null
  service?: string | null
}

export interface BudgetThreshold {
  percent: number
  type: 'Actual' | 'Forecasted' | string
  reached: boolean
}

export interface BudgetStatus {
  name: string
  amount: number
  timeGrain: string
  currentSpend: number
  percentUsed: number
  forecastPercent: number | null
  thresholds: BudgetThreshold[]
}

export interface CostOverview extends CostFreshness {
  monthToDate: number
  forecastMonthEnd: number | null
  /** 'azure' = Azure Cost Management forecast; 'projection' = straight line from actual spend so far. */
  forecastSource?: 'azure' | 'projection'
  lastMonthTotal: number
  lastMonthSamePeriod: number
  changeVsLastMonthPercent: number | null
  budget: BudgetStatus | null
  dailyTrend: DailyCost[]
  byService: CostShareRow[]
  topResources: CostShareRow[]
  openAnomalies: number
  /** Spend of the Whisper speech-to-text Container Apps Job (absent on older APIs). */
  whisper?: WhisperSpend
}

export interface WhisperSpend {
  jobName: string
  monthToDate: number
  lastMonthTotal: number
  /** Share of this month's total spend, in percent. */
  shareOfMonth: number
}

export const BREAKDOWN_GROUP_BYS = ['service', 'resource', 'resourceGroup', 'meter'] as const
export type BreakdownGroupBy = (typeof BREAKDOWN_GROUP_BYS)[number]

export interface CostBreakdownParams {
  from: string
  to: string
  groupBy: BreakdownGroupBy
}

export interface CostBreakdown extends CostFreshness {
  from: string
  to: string
  groupBy: BreakdownGroupBy
  total: number
  rows: CostShareRow[]
  daily: DailyCost[]
}

export interface RetailPriceItem {
  id: string
  serviceName: string
  productName: string
  skuName: string
  meterName: string
  unitOfMeasure: string
  unitPrice: number
  retailPrice: number
  armRegionName: string
  effectiveStartDate: string | null
  type: string
  usedByUs: boolean
}

export interface RetailPriceList {
  currency: string
  region: string
  refreshedAt: string | null
  items: RetailPriceItem[]
}

export interface PriceListParams {
  service?: string
  usedOnly: boolean
}

export interface BaselineEstimateLine {
  key: string
  label: string
  quantity: number
  unit: string
  /** `null` when the meter is missing from the stored price catalogue. */
  unitPrice: number | null
  monthly: number
  note?: string | null
}

export interface BaselineEstimate {
  currency: string
  monthlyTotal: number
  lines: BaselineEstimateLine[]
  assumptions: string[]
}

export const DB_SKUS = ['B1ms', 'B2s', 'B2ms', 'D2ds_v5'] as const
export type DbSku = (typeof DB_SKUS)[number]

export interface EstimateInput {
  apiReplicas: number
  apiVcpu: number
  apiMemoryGiB: number
  dbSku: DbSku
  dbStorageGiB: number
  dbHighAvailability: boolean
  privateEndpoints: number
  logGbPerDay: number
  storageGiB: number
  emailsPerMonth: number
}

export interface EstimateLine {
  key: string
  label: string
  baseline: number
  scenario: number
  difference: number
  note?: string | null
}

export interface EstimateResult {
  currency: string
  baselineMonthly: number
  scenarioMonthly: number
  difference: number
  lines: EstimateLine[]
  assumptions: string[]
}

export type AdvisorImpact = 'High' | 'Medium' | 'Low'

export interface AdvisorRecommendation {
  id: string
  impact: AdvisorImpact
  problem: string
  solution: string
  resourceId: string
  resourceName: string
  annualSavings: number | null
  currency: string
}

export interface AdvisorRecommendations {
  refreshedAt: string | null
  items: AdvisorRecommendation[]
}

export interface UnitEconomicsHistoryRow {
  month: string
  totalCost: number
  costPerServiceUser: number | null
  costPerCarer: number | null
  costPerVisit: number | null
}

export interface UnitEconomics {
  currency: string
  month: string
  totalCost: number
  activeServiceUsers: number
  activeCarers: number
  completedVisits: number
  costPerServiceUser: number | null
  costPerCarer: number | null
  costPerVisit: number | null
  history: UnitEconomicsHistoryRow[]
}

export type AnomalyStatus = 'open' | 'acknowledged'
export type AnomalyStatusFilter = AnomalyStatus | 'all'

export interface CostAnomaly {
  id: string
  date: string
  cost: number
  baseline: number
  increasePercent: number
  topDriver: string | null
  status: AnomalyStatus
  createdAt: string
  acknowledgedAt: string | null
  acknowledgedBy: string | null
}

export interface CostAnomalyList {
  items: CostAnomaly[]
}

export interface PlatformCostSettings {
  anomalyThresholdPercent: number
  anomalyMinDailyIncrease: number
  monthlyReportEnabled: boolean
  monthlyReportRecipients: string[]
  updatedAt: string | null
  updatedBy: string | null
}

export type PlatformCostSettingsInput = Pick<
  PlatformCostSettings,
  'anomalyThresholdPercent' | 'anomalyMinDailyIncrease' | 'monthlyReportEnabled' | 'monthlyReportRecipients'
>

export type SyncKind = 'costs' | 'prices' | 'budgets' | 'forecast' | 'advisor'
export type SyncTrigger = 'schedule' | 'manual'
export type SyncStatus = 'running' | 'success' | 'failed'

export interface SyncRun {
  id: string
  kind: SyncKind
  trigger: SyncTrigger
  status: SyncStatus
  startedAt: string
  finishedAt: string | null
  rowsUpserted: number | null
  error: string | null
}

export interface SyncRunList {
  items: SyncRun[]
}

export interface SyncTriggerResult {
  runId: string
  status: SyncStatus | string
}

export interface MonthlyReportPreview {
  subject: string
  html: string
}
