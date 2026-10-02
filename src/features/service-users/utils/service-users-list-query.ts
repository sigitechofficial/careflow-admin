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

/** `datetime-local` / legacy day → API `dateOfDeathFrom|To` (ISO date or UTC datetime). */
export function toDateOfDeathApiParam(value?: string | null): string | undefined {
  const v = value?.trim()
  if (!v) return undefined
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v)) return `${v}:00.000Z`
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/i.test(v)) return v
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?$/i.test(v)) return `${v}Z`
  return v
}

/** Value for `<input type="datetime-local">` from stored filter / URL. */
export function toDateOfDeathInputValue(value?: string | null): string {
  const v = value?.trim()
  if (!v) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return `${v}T00:00`
  const m = v.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})/)
  return m?.[1] ?? ''
}

export function formatDateOfDeathFilterChip(value?: string | null): string {
  if (!value?.trim()) return '…'
  const input = toDateOfDeathInputValue(value)
  if (!input) return value.trim()
  const [day = input, time] = input.split('T')
  return time && time !== '00:00' ? `${day} ${time}` : day
}

export type ServiceUsersAdvancedFilters = {
  ageMin?: number
  ageMax?: number
  hasActiveFlashMessage?: boolean
  hospitalisedOnly?: boolean
  carePlanListStatus?: CarePlanListStatus | ''
  /** Published care-plan form ids (any match). */
  carePlanFormIds?: string[]
  /** Display-only names keyed by form id (not sent to API). */
  carePlanFormLabels?: Record<string, string>
  medicalConditionId?: string
  /** Display-only label for chips / select (not sent to API). */
  medicalConditionLabel?: string
  /** Active medical condition catalogue ids (any match). */
  medicalConditionIds?: string[]
  /** Display-only names keyed by condition id (not sent to API). */
  medicalConditionLabels?: Record<string, string>
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
  /** Service user care type lookup id. */
  careTypeId?: string
  /** Display-only care type name (not sent to API). */
  careTypeLabel?: string
  /** Service user funding type lookup id. */
  fundingTypeId?: string
  /** Display-only funding type name (not sent to API). */
  fundingTypeLabel?: string
  /** Inclusive service start date range (YYYY-MM-DD). */
  serviceStartDateFrom?: string
  serviceStartDateTo?: string
}

export type AdvancedFilterRangeErrors = {
  age?: string
  dateOfDeath?: string
  missedVisits?: string
  serviceStartDate?: string
}

/** Inclusive range checks: from must be ≤ to when both ends are set. */
export function advancedFilterRangeErrors(
  filters: Pick<
    ServiceUsersAdvancedFilters,
    | 'ageMin'
    | 'ageMax'
    | 'dateOfDeathFrom'
    | 'dateOfDeathTo'
    | 'missedVisitsFrom'
    | 'missedVisitsTo'
    | 'serviceStartDateFrom'
    | 'serviceStartDateTo'
  >,
): AdvancedFilterRangeErrors {
  const errors: AdvancedFilterRangeErrors = {}
  if (filters.ageMin != null && filters.ageMax != null && filters.ageMin > filters.ageMax) {
    errors.age = 'Age from must be less than or equal to age to.'
  }
  if (
    filters.dateOfDeathFrom &&
    filters.dateOfDeathTo &&
    filters.dateOfDeathFrom > filters.dateOfDeathTo
  ) {
    errors.dateOfDeath = 'Date of death from must be on or before date of death to.'
  }
  if (
    filters.missedVisitsFrom &&
    filters.missedVisitsTo &&
    filters.missedVisitsFrom > filters.missedVisitsTo
  ) {
    errors.missedVisits = 'Visit from date must be on or before the to date.'
  }
  if (
    filters.serviceStartDateFrom &&
    filters.serviceStartDateTo &&
    filters.serviceStartDateFrom > filters.serviceStartDateTo
  ) {
    errors.serviceStartDate = 'Service start from must be on or before the to date.'
  }
  return errors
}

export function hasAdvancedFilterRangeErrors(errors: AdvancedFilterRangeErrors): boolean {
  return Boolean(errors.age || errors.dateOfDeath || errors.missedVisits || errors.serviceStartDate)
}

export const EMPTY_SERVICE_USERS_ADVANCED_FILTERS: ServiceUsersAdvancedFilters = {
  ageMin: undefined,
  ageMax: undefined,
  hasActiveFlashMessage: false,
  hospitalisedOnly: false,
  carePlanListStatus: '',
  carePlanFormIds: [],
  carePlanFormLabels: {},
  medicalConditionId: undefined,
  medicalConditionLabel: undefined,
  medicalConditionIds: [],
  medicalConditionLabels: {},
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
  careTypeId: undefined,
  careTypeLabel: undefined,
  fundingTypeId: undefined,
  fundingTypeLabel: undefined,
  serviceStartDateFrom: undefined,
  serviceStartDateTo: undefined,
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
  | 'careTypeId'
  | 'fundingTypeId'
  | 'serviceStartDate'
  | 'carePlanListStatus'
  | 'carePlanFormIds'
  | 'medicalConditionId'
  | 'medicalConditionIds'
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
  if (filters.careTypeId) {
    chips.push({
      key: 'careTypeId',
      label: `Care type: ${filters.careTypeLabel?.trim() || 'Selected'}`,
    })
  }
  if (filters.fundingTypeId) {
    chips.push({
      key: 'fundingTypeId',
      label: `Funding: ${filters.fundingTypeLabel?.trim() || 'Selected'}`,
    })
  }
  if (filters.serviceStartDateFrom || filters.serviceStartDateTo) {
    chips.push({
      key: 'serviceStartDate',
      label: `Service start ${filters.serviceStartDateFrom ?? '…'} → ${filters.serviceStartDateTo ?? '…'}`,
    })
  }
  if (filters.carePlanListStatus) {
    chips.push({
      key: 'carePlanListStatus',
      label: CARE_PLAN_LIST_STATUS_FILTER_LABELS[filters.carePlanListStatus] ?? filters.carePlanListStatus,
    })
  }
  const carePlanFormIds = uniqueCarePlanFormIds(filters.carePlanFormIds)
  if (carePlanFormIds && carePlanFormIds.length > 0) {
    chips.push({
      key: 'carePlanFormIds',
      label: formatCarePlanFormChipLabel(carePlanFormIds, filters.carePlanFormLabels),
    })
  }
  const medicalConditionIds = uniqueFilterIds([
    ...(filters.medicalConditionIds ?? []),
    filters.medicalConditionId,
  ])
  if (medicalConditionIds && medicalConditionIds.length > 0) {
    const labels = {
      ...(filters.medicalConditionLabels ?? {}),
      ...(filters.medicalConditionId && filters.medicalConditionLabel
        ? { [filters.medicalConditionId]: filters.medicalConditionLabel }
        : {}),
    }
    chips.push({
      key: 'medicalConditionIds',
      label: formatNamedIdChipLabel(medicalConditionIds, labels, {
        one: '1 condition',
        many: (n) => `${n} conditions`,
      }),
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
  if (filters.missedVisitsMin != null && filters.missedVisitsMin >= 0) {
    const range =
      filters.missedVisitsFrom || filters.missedVisitsTo
        ? ` (${filters.missedVisitsFrom ?? '…'} → ${filters.missedVisitsTo ?? '…'})`
        : ''
    chips.push({
      key: 'missedVisits',
      label: `Missed visits > ${filters.missedVisitsMin}${range}`,
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
      label: `Date of death ${formatDateOfDeathFilterChip(filters.dateOfDeathFrom)} → ${formatDateOfDeathFilterChip(filters.dateOfDeathTo)}`,
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
    case 'careTypeId':
      return { ...filters, careTypeId: undefined, careTypeLabel: undefined }
    case 'fundingTypeId':
      return { ...filters, fundingTypeId: undefined, fundingTypeLabel: undefined }
    case 'serviceStartDate':
      return { ...filters, serviceStartDateFrom: undefined, serviceStartDateTo: undefined }
    case 'carePlanListStatus':
      return { ...filters, carePlanListStatus: '' }
    case 'carePlanFormIds':
      return { ...filters, carePlanFormIds: [], carePlanFormLabels: {} }
    case 'medicalConditionId':
    case 'medicalConditionIds':
      return {
        ...filters,
        medicalConditionId: undefined,
        medicalConditionLabel: undefined,
        medicalConditionIds: [],
        medicalConditionLabels: {},
      }
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

export const ADVANCED_FILTER_GROUPS = ['profile', 'clinical', 'visits', 'alerts', 'safety'] as const
export type AdvancedFilterGroupId = (typeof ADVANCED_FILTER_GROUPS)[number]

export const ADVANCED_FILTER_GROUP_CHIP_KEYS: Record<AdvancedFilterGroupId, AdvancedFilterChipKey[]> = {
  profile: ['age', 'careTypeId', 'fundingTypeId', 'serviceStartDate', 'dateOfDeath'],
  clinical: ['carePlanListStatus', 'carePlanFormIds', 'initialAssessmentStatus', 'medicalConditionIds'],
  visits: ['missedVisits'],
  alerts: ['hasActiveFlashMessage', 'hospitalisedOnly'],
  safety: [
    'loneWorkerRisk',
    'verbalAltercation',
    'physicalAltercation',
    'physicalAbuseToSu',
    'domesticViolence',
    'safeguardingHistory',
  ],
}

export function countAdvancedFiltersInGroup(
  filters: ServiceUsersAdvancedFilters,
  group: AdvancedFilterGroupId,
): number {
  const keys = new Set<AdvancedFilterChipKey>(ADVANCED_FILTER_GROUP_CHIP_KEYS[group])
  return describeAdvancedFilterChips(filters).filter(chip => keys.has(chip.key)).length
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
    /** Zone / branch filter on the page; overrides the header location when set. */
    locationIds?: string[]
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
    locationId: options.locationIds?.length ? undefined : options.locationId || undefined,
    locationIds: options.locationIds?.length ? options.locationIds : undefined,
    riskLevelId: riskLevelIdForCode(lookups, options.riskLevelCode),
    unassignedKeyWorker: options.unassignedKeyWorker === true ? true : undefined,
    careTypeId: advanced.careTypeId || undefined,
    fundingTypeId: advanced.fundingTypeId || undefined,
    serviceStartDateFrom: advanced.serviceStartDateFrom || undefined,
    serviceStartDateTo: advanced.serviceStartDateTo || undefined,
    ageMin: advanced.ageMin,
    ageMax: advanced.ageMax,
    hasActiveFlashMessage: advanced.hasActiveFlashMessage === true ? true : undefined,
    hospitalisedOnly: advanced.hospitalisedOnly === true ? true : undefined,
    carePlanListStatus: advanced.carePlanListStatus || undefined,
    carePlanFormIds: uniqueFilterIds(advanced.carePlanFormIds),
    medicalConditionIds: uniqueFilterIds([
      ...(advanced.medicalConditionIds ?? []),
      advanced.medicalConditionId,
    ]),
    initialAssessmentStatus: advanced.initialAssessmentStatus || undefined,
    missedVisitsMin:
      advanced.missedVisitsMin != null && advanced.missedVisitsMin >= 0
        ? advanced.missedVisitsMin
        : undefined,
    missedVisitsFrom: advanced.missedVisitsFrom || undefined,
    missedVisitsTo: advanced.missedVisitsTo || undefined,
    loneWorkerRisk: advanced.loneWorkerRisk === true ? true : undefined,
    verbalAltercation: advanced.verbalAltercation === true ? true : undefined,
    physicalAltercation: advanced.physicalAltercation === true ? true : undefined,
    dateOfDeathFrom: toDateOfDeathApiParam(advanced.dateOfDeathFrom),
    dateOfDeathTo: toDateOfDeathApiParam(advanced.dateOfDeathTo),
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

export function uniqueCarePlanFormIds(ids?: string[]): string[] | undefined {
  return uniqueFilterIds(ids)
}

export function uniqueFilterIds(ids?: Array<string | undefined | null>): string[] | undefined {
  const next = [...new Set((ids ?? []).map((id) => id?.trim()).filter((id): id is string => Boolean(id)))]
  return next.length > 0 ? next : undefined
}

function formatCarePlanFormChipLabel(
  ids: string[],
  labels?: Record<string, string>,
): string {
  return formatNamedIdChipLabel(ids, labels, {
    one: '1 care plan',
    many: (n) => `${n} care plans`,
  })
}

function formatNamedIdChipLabel(
  ids: string[],
  labels: Record<string, string> | undefined,
  empty: { one: string; many: (n: number) => string },
): string {
  const names = ids.map((id) => labels?.[id]?.trim()).filter((name): name is string => Boolean(name))
  if (names.length === 0) {
    return ids.length === 1 ? empty.one : empty.many(ids.length)
  }
  if (names.length <= 2) return names.join(', ')
  return `${names[0]}, ${names[1]} +${names.length - 2}`
}
