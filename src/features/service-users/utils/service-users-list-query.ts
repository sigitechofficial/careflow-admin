import type { CarePlanListStatus, ListServiceUsersParams } from '@/features/service-users/api'
import type { QuickSelectListId } from '@/features/service-users/components/ServiceUserQuickSelectBar'
import type { ServiceUserLookupsBundle } from '@/features/service-users/types'

/** Default status filter on `/service-users/all` — in-service active users only. */
export const DEFAULT_SERVICE_USER_STATUS_CODE = 'ACTIVE'

export const DEFAULT_SERVICE_USERS_PAGE_SIZE = 25

/** `all` or a status lookup code from the database (e.g. ACTIVE, PRE_ADMISSION). */
export type StatusFilterValue = 'all' | string

export type InitialAssessmentStatusFilter =
  | ''
  | 'none'
  | 'in_progress'
  | 'awaiting_review'
  | 'completed'

export type ServiceUsersAdvancedFilters = {
  ageMin?: number
  ageMax?: number
  hasActiveFlashMessage?: boolean
  hospitalisedOnly?: boolean
  carePlanListStatus?: CarePlanListStatus | ''
  medicalConditionId?: string
  /** Display-only label for chips / select (not sent to API). */
  medicalConditionLabel?: string
  initialAssessmentStatus?: InitialAssessmentStatusFilter
  missedVisitsMin?: number
  missedVisitsFrom?: string
  missedVisitsTo?: string
  loneWorkerRisk?: boolean
  verbalAltercation?: boolean
  physicalAltercation?: boolean
  dateOfDeathFrom?: string
  dateOfDeathTo?: string
  physicalAbuseToSu?: boolean
  domesticViolence?: boolean
  safeguardingHistory?: boolean
}

export const EMPTY_SERVICE_USERS_ADVANCED_FILTERS: ServiceUsersAdvancedFilters = {
  ageMin: undefined,
  ageMax: undefined,
  hasActiveFlashMessage: false,
  hospitalisedOnly: false,
  carePlanListStatus: '',
  medicalConditionId: undefined,
  medicalConditionLabel: undefined,
  initialAssessmentStatus: '',
  missedVisitsMin: undefined,
  missedVisitsFrom: undefined,
  missedVisitsTo: undefined,
  loneWorkerRisk: false,
  verbalAltercation: false,
  physicalAltercation: false,
  dateOfDeathFrom: undefined,
  dateOfDeathTo: undefined,
  physicalAbuseToSu: false,
  domesticViolence: false,
  safeguardingHistory: false,
}

export const CARE_PLAN_LIST_STATUS_FILTER_LABELS: Record<CarePlanListStatus, string> = {
  none: 'No published care plan',
  ok: 'Care plan up to date',
  due_within_week: 'Review due within 7 days',
  overdue: 'Care plan review overdue',
}

export const INITIAL_ASSESSMENT_STATUS_FILTER_LABELS: Record<
  Exclude<InitialAssessmentStatusFilter, ''>,
  string
> = {
  none: 'No initial assessment',
  in_progress: 'IA in progress',
  awaiting_review: 'IA awaiting review',
  completed: 'IA completed',
}

export type AdvancedFilterChipKey =
  | 'age'
  | 'carePlanListStatus'
  | 'medicalConditionId'
  | 'hasActiveFlashMessage'
  | 'hospitalisedOnly'
  | 'initialAssessmentStatus'
  | 'missedVisits'
  | 'loneWorkerRisk'
  | 'verbalAltercation'
  | 'physicalAltercation'
  | 'dateOfDeath'
  | 'physicalAbuseToSu'
  | 'domesticViolence'
  | 'safeguardingHistory'

export type AdvancedFilterChip = {
  key: AdvancedFilterChipKey
  label: string
}

export function describeAdvancedFilterChips(
  filters: ServiceUsersAdvancedFilters,
): AdvancedFilterChip[] {
  const chips: AdvancedFilterChip[] = []
  if (filters.ageMin != null || filters.ageMax != null) {
    const from = filters.ageMin != null ? String(filters.ageMin) : '…'
    const to = filters.ageMax != null ? String(filters.ageMax) : '…'
    chips.push({ key: 'age', label: `Age ${from}–${to}` })
  }
  if (filters.carePlanListStatus) {
    chips.push({
      key: 'carePlanListStatus',
      label: CARE_PLAN_LIST_STATUS_FILTER_LABELS[filters.carePlanListStatus] ?? filters.carePlanListStatus,
    })
  }
  if (filters.medicalConditionId) {
    chips.push({
      key: 'medicalConditionId',
      label: filters.medicalConditionLabel?.trim() || 'Medical condition',
    })
  }
  if (filters.initialAssessmentStatus) {
    chips.push({
      key: 'initialAssessmentStatus',
      label:
        INITIAL_ASSESSMENT_STATUS_FILTER_LABELS[filters.initialAssessmentStatus] ??
        filters.initialAssessmentStatus,
    })
  }
  if (filters.missedVisitsMin != null && filters.missedVisitsMin >= 1) {
    const range =
      filters.missedVisitsFrom || filters.missedVisitsTo
        ? ` (${filters.missedVisitsFrom ?? '…'} → ${filters.missedVisitsTo ?? '…'})`
        : ''
    chips.push({
      key: 'missedVisits',
      label: `Missed visits ≥ ${filters.missedVisitsMin}${range}`,
    })
  }
  if (filters.hasActiveFlashMessage) {
    chips.push({ key: 'hasActiveFlashMessage', label: 'Active flash alert' })
  }
  if (filters.hospitalisedOnly) {
    chips.push({ key: 'hospitalisedOnly', label: 'Hospitalised now' })
  }
  if (filters.loneWorkerRisk) {
    chips.push({ key: 'loneWorkerRisk', label: 'Lone worker risk' })
  }
  if (filters.verbalAltercation) {
    chips.push({ key: 'verbalAltercation', label: 'Verbal altercation' })
  }
  if (filters.physicalAltercation) {
    chips.push({ key: 'physicalAltercation', label: 'Physical altercation (by SU)' })
  }
  if (filters.dateOfDeathFrom || filters.dateOfDeathTo) {
    chips.push({
      key: 'dateOfDeath',
      label: `Date of death ${filters.dateOfDeathFrom ?? '…'} → ${filters.dateOfDeathTo ?? '…'}`,
    })
  }
  if (filters.physicalAbuseToSu) {
    chips.push({ key: 'physicalAbuseToSu', label: 'Physical abuse to SU' })
  }
  if (filters.domesticViolence) {
    chips.push({ key: 'domesticViolence', label: 'Domestic violence' })
  }
  if (filters.safeguardingHistory) {
    chips.push({ key: 'safeguardingHistory', label: 'Safeguarding / abuse history' })
  }
  return chips
}

export function clearAdvancedFilterChip(
  filters: ServiceUsersAdvancedFilters,
  key: AdvancedFilterChipKey,
): ServiceUsersAdvancedFilters {
  switch (key) {
    case 'age':
      return { ...filters, ageMin: undefined, ageMax: undefined }
    case 'carePlanListStatus':
      return { ...filters, carePlanListStatus: '' }
    case 'medicalConditionId':
      return { ...filters, medicalConditionId: undefined, medicalConditionLabel: undefined }
    case 'hasActiveFlashMessage':
      return { ...filters, hasActiveFlashMessage: false }
    case 'hospitalisedOnly':
      return { ...filters, hospitalisedOnly: false }
    case 'initialAssessmentStatus':
      return { ...filters, initialAssessmentStatus: '' }
    case 'missedVisits':
      return {
        ...filters,
        missedVisitsMin: undefined,
        missedVisitsFrom: undefined,
        missedVisitsTo: undefined,
      }
    case 'loneWorkerRisk':
      return { ...filters, loneWorkerRisk: false }
    case 'verbalAltercation':
      return { ...filters, verbalAltercation: false }
    case 'physicalAltercation':
      return { ...filters, physicalAltercation: false }
    case 'dateOfDeath':
      return { ...filters, dateOfDeathFrom: undefined, dateOfDeathTo: undefined }
    case 'physicalAbuseToSu':
      return { ...filters, physicalAbuseToSu: false }
    case 'domesticViolence':
      return { ...filters, domesticViolence: false }
    case 'safeguardingHistory':
      return { ...filters, safeguardingHistory: false }
    default:
      return filters
  }
}

export function statusFilterLabel(code: string, name: string): string {
  if (code === DEFAULT_SERVICE_USER_STATUS_CODE) return 'In service (active)'
  return name
}

export function statusIdForFilter(
  lookups: ServiceUserLookupsBundle | null | undefined,
  filter: StatusFilterValue,
): string | undefined {
  if (!lookups || filter === 'all') return undefined
  return lookups.statuses.find((s) => s.code === filter)?.id
}

export function riskLevelIdForCode(
  lookups: ServiceUserLookupsBundle | null | undefined,
  code: string | null | undefined,
): string | undefined {
  if (!lookups || !code) return undefined
  return lookups.riskLevels.find((r) => r.code === code)?.id
}

export function statusFilterForQuickSelect(id: QuickSelectListId): StatusFilterValue {
  switch (id) {
    case 'all':
      return 'all'
    case 'active':
      return DEFAULT_SERVICE_USER_STATUS_CODE
    case 'discharged':
      return 'DISCHARGED'
    case 'deleted':
      return 'all'
  }
}

export function listQueryForFilters(
  lookups: ServiceUserLookupsBundle | null | undefined,
  listFilter: QuickSelectListId | null,
  statusFilter: StatusFilterValue,
  onHoldOnly: boolean,
) {
  if (listFilter === 'deleted') {
    return { showDeleted: true, showInactive: true, statusId: undefined }
  }
  if (listFilter === 'all') {
    return { showDeleted: false, showInactive: true, statusId: undefined }
  }
  if (listFilter === 'active') {
    return {
      showDeleted: false,
      showInactive: false,
      statusId: statusIdForFilter(lookups, DEFAULT_SERVICE_USER_STATUS_CODE),
    }
  }
  if (listFilter === 'discharged') {
    return {
      showDeleted: false,
      showInactive: true,
      statusId: statusIdForFilter(lookups, 'DISCHARGED'),
    }
  }
  if (onHoldOnly) {
    return {
      showDeleted: false,
      showInactive: true,
      statusId: statusIdForFilter(lookups, 'ON_HOLD'),
    }
  }
  return {
    showDeleted: false,
    showInactive: statusFilter !== DEFAULT_SERVICE_USER_STATUS_CODE ? true : undefined,
    statusId: statusIdForFilter(lookups, statusFilter),
  }
}

export function countActiveAdvancedFilters(filters: ServiceUsersAdvancedFilters): number {
  return describeAdvancedFilterChips(filters).length
}

export function buildServiceUsersListParams(
  lookups: ServiceUserLookupsBundle | null | undefined,
  options: {
    page: number
    search?: string
    listFilter: QuickSelectListId | null
    statusFilter: StatusFilterValue
    onHoldOnly: boolean
    locationId?: string
    riskLevelCode?: string | null
    unassignedKeyWorker?: boolean
    advanced?: ServiceUsersAdvancedFilters
  },
): ListServiceUsersParams {
  const query = listQueryForFilters(
    lookups,
    options.listFilter,
    options.statusFilter,
    options.onHoldOnly,
  )
  const advanced = options.advanced ?? EMPTY_SERVICE_USERS_ADVANCED_FILTERS
  return {
    page: options.page,
    limit: DEFAULT_SERVICE_USERS_PAGE_SIZE,
    search: options.search || undefined,
    statusId: query.statusId,
    showInactive: query.showInactive,
    showDeleted: query.showDeleted,
    sortBy: 'createdAt',
    sortOrder: 'desc',
    locationId: options.locationId || undefined,
    riskLevelId: riskLevelIdForCode(lookups, options.riskLevelCode),
    unassignedKeyWorker: options.unassignedKeyWorker === true ? true : undefined,
    ageMin: advanced.ageMin,
    ageMax: advanced.ageMax,
    hasActiveFlashMessage: advanced.hasActiveFlashMessage === true ? true : undefined,
    hospitalisedOnly: advanced.hospitalisedOnly === true ? true : undefined,
    carePlanListStatus: advanced.carePlanListStatus || undefined,
    medicalConditionId: advanced.medicalConditionId || undefined,
    initialAssessmentStatus: advanced.initialAssessmentStatus || undefined,
    missedVisitsMin:
      advanced.missedVisitsMin != null && advanced.missedVisitsMin >= 1
        ? advanced.missedVisitsMin
        : undefined,
    missedVisitsFrom: advanced.missedVisitsFrom || undefined,
    missedVisitsTo: advanced.missedVisitsTo || undefined,
    loneWorkerRisk: advanced.loneWorkerRisk === true ? true : undefined,
    verbalAltercation: advanced.verbalAltercation === true ? true : undefined,
    physicalAltercation: advanced.physicalAltercation === true ? true : undefined,
    dateOfDeathFrom: advanced.dateOfDeathFrom || undefined,
    dateOfDeathTo: advanced.dateOfDeathTo || undefined,
    physicalAbuseToSu: advanced.physicalAbuseToSu === true ? true : undefined,
    domesticViolence: advanced.domesticViolence === true ? true : undefined,
    safeguardingHistory: advanced.safeguardingHistory === true ? true : undefined,
  }
}

/** Route-loader default: first page of in-service (ACTIVE) service users. */
export function defaultServiceUsersListParams(
  lookups: ServiceUserLookupsBundle,
): ListServiceUsersParams {
  return buildServiceUsersListParams(lookups, {
    page: 1,
    listFilter: null,
    statusFilter: DEFAULT_SERVICE_USER_STATUS_CODE,
    onHoldOnly: false,
  })
}
