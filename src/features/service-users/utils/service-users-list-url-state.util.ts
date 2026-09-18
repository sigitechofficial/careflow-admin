import type { CarePlanListStatus } from '@/features/service-users/api'
import type {
  QuickSelectListId,
  QuickSelectRiskId,
} from '@/features/service-users/components/ServiceUserQuickSelectBar'
import type { ServiceUserLookupsBundle } from '@/features/service-users/types'
import {
  DEFAULT_SERVICE_USER_STATUS_CODE,
  EMPTY_SERVICE_USERS_ADVANCED_FILTERS,
  uniqueFilterIds,
  type InitialAssessmentStatusFilter,
  type ServiceUsersAdvancedFilters,
  type StatusFilterValue,
} from '@/features/service-users/utils/service-users-list-query'

/** Compact query keys for `/service-users/all` (shareable / refresh-safe). */
export type ServiceUsersListSearch = {
  q?: string
  kw?: string
  status?: string
  list?: string
  risk?: string
  unassigned?: string
  onHold?: string
  page?: string
  ageMin?: string
  ageMax?: string
  careType?: string
  fundingType?: string
  serviceStartFrom?: string
  serviceStartTo?: string
  dodFrom?: string
  dodTo?: string
  carePlanStatus?: string
  carePlans?: string
  conditions?: string
  iaStatus?: string
  missedMin?: string
  missedFrom?: string
  missedTo?: string
  flash?: string
  hospitalised?: string
  loneWorker?: string
  verbal?: string
  physical?: string
  physicalAbuseSu?: string
  domestic?: string
  safeguarding?: string
}

export type ServiceUsersListUrlState = {
  search: string
  kwSearch: string
  statusFilter: StatusFilterValue
  listFilter: QuickSelectListId | null
  riskFilter: QuickSelectRiskId | null
  unassignedOnly: boolean
  onHoldOnly: boolean
  page: number
  advanced: ServiceUsersAdvancedFilters
}

const LIST_IDS = new Set<QuickSelectListId>(['all', 'active', 'discharged', 'deleted'])
const RISK_IDS = new Set<QuickSelectRiskId>(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
const CARE_PLAN_STATUSES = new Set<CarePlanListStatus>([
  'none',
  'ok',
  'due_within_week',
  'overdue',
])
const IA_STATUSES = new Set<Exclude<InitialAssessmentStatusFilter, ''>>([
  'none',
  'in_progress',
  'awaiting_review',
  'completed',
])

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/

function asString(value: unknown): string | undefined {
  if (typeof value === 'string') return value
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return undefined
}

function parseFlag(value?: string | null): boolean {
  const v = value?.trim().toLowerCase()
  return v === '1' || v === 'true' || v === 'yes'
}

function parseIntInRange(value: string | undefined, min: number, max: number): number | undefined {
  if (!value?.trim()) return undefined
  const n = Number(value)
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < min || n > max) return undefined
  return n
}

function parseIsoDay(value?: string | null): string | undefined {
  const v = value?.trim()
  return v && ISO_DAY.test(v) ? v : undefined
}

/** Date-only or datetime-local / ISO → `YYYY-MM-DD` or `YYYY-MM-DDTHH:mm` for DOD filters. */
function parseIsoDateOrDateTime(value?: string | null): string | undefined {
  const v = value?.trim()
  if (!v) return undefined
  if (ISO_DAY.test(v)) return v
  const m = v.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})/)
  return m?.[1]
}

function parseCommaIds(value?: string | null): string[] {
  if (!value?.trim()) return []
  return [...new Set(value.split(',').map((id) => id.trim()).filter(Boolean))]
}

function idsToComma(
  ids?: Array<string | undefined | null>,
): string | undefined {
  const next = uniqueFilterIds(ids)
  return next?.join(',')
}

function parseListFilter(value?: string | null): QuickSelectListId | null {
  const v = value?.trim() as QuickSelectListId | undefined
  return v && LIST_IDS.has(v) ? v : null
}

function parseRiskFilter(value?: string | null): QuickSelectRiskId | null {
  const v = value?.trim().toUpperCase() as QuickSelectRiskId | undefined
  return v && RISK_IDS.has(v) ? v : null
}

function parseCarePlanStatus(value?: string | null): CarePlanListStatus | '' {
  const v = value?.trim() as CarePlanListStatus | undefined
  return v && CARE_PLAN_STATUSES.has(v) ? v : ''
}

function parseIaStatus(value?: string | null): InitialAssessmentStatusFilter {
  const v = value?.trim() as Exclude<InitialAssessmentStatusFilter, ''> | undefined
  return v && IA_STATUSES.has(v) ? v : ''
}

export function defaultServiceUsersListUrlState(): ServiceUsersListUrlState {
  return {
    search: '',
    kwSearch: '',
    statusFilter: DEFAULT_SERVICE_USER_STATUS_CODE,
    listFilter: null,
    riskFilter: null,
    unassignedOnly: false,
    onHoldOnly: false,
    page: 1,
    advanced: { ...EMPTY_SERVICE_USERS_ADVANCED_FILTERS },
  }
}

export function parseServiceUsersListSearch(
  search: ServiceUsersListSearch | Record<string, unknown> | undefined,
): ServiceUsersListUrlState {
  const raw = (search ?? {}) as ServiceUsersListSearch
  const page = parseIntInRange(asString(raw.page), 1, 10_000) ?? 1
  const ageMin = parseIntInRange(asString(raw.ageMin), 0, 150)
  const ageMax = parseIntInRange(asString(raw.ageMax), 0, 150)
  const missedMin = parseIntInRange(asString(raw.missedMin), 0, 10_000)
  const carePlanFormIds = parseCommaIds(asString(raw.carePlans))
  const medicalConditionIds = parseCommaIds(asString(raw.conditions))
  const statusRaw = asString(raw.status)?.trim()
  const statusFilter: StatusFilterValue =
    !statusRaw || statusRaw.toLowerCase() === 'active'
      ? DEFAULT_SERVICE_USER_STATUS_CODE
      : statusRaw.toLowerCase() === 'all'
        ? 'all'
        : statusRaw

  return {
    search: asString(raw.q)?.trim() ?? '',
    kwSearch: asString(raw.kw)?.trim() ?? '',
    statusFilter,
    listFilter: parseListFilter(asString(raw.list)),
    riskFilter: parseRiskFilter(asString(raw.risk)),
    unassignedOnly: parseFlag(asString(raw.unassigned)),
    onHoldOnly: parseFlag(asString(raw.onHold)),
    page,
    advanced: {
      ...EMPTY_SERVICE_USERS_ADVANCED_FILTERS,
      ageMin,
      ageMax,
      careTypeId: asString(raw.careType)?.trim() || undefined,
      fundingTypeId: asString(raw.fundingType)?.trim() || undefined,
      serviceStartDateFrom: parseIsoDay(asString(raw.serviceStartFrom)),
      serviceStartDateTo: parseIsoDay(asString(raw.serviceStartTo)),
      dateOfDeathFrom: parseIsoDateOrDateTime(asString(raw.dodFrom)),
      dateOfDeathTo: parseIsoDateOrDateTime(asString(raw.dodTo)),
      carePlanListStatus: parseCarePlanStatus(asString(raw.carePlanStatus)),
      carePlanFormIds,
      medicalConditionIds,
      initialAssessmentStatus: parseIaStatus(asString(raw.iaStatus)),
      missedVisitsMin: missedMin,
      missedVisitsFrom: parseIsoDay(asString(raw.missedFrom)),
      missedVisitsTo: parseIsoDay(asString(raw.missedTo)),
      hasActiveFlashMessage: parseFlag(asString(raw.flash)),
      hospitalisedOnly: parseFlag(asString(raw.hospitalised)),
      loneWorkerRisk: parseFlag(asString(raw.loneWorker)),
      verbalAltercation: parseFlag(asString(raw.verbal)),
      physicalAltercation: parseFlag(asString(raw.physical)),
      physicalAbuseToSu: parseFlag(asString(raw.physicalAbuseSu)),
      domesticViolence: parseFlag(asString(raw.domestic)),
      safeguardingHistory: parseFlag(asString(raw.safeguarding)),
    },
  }
}

/** Fill display labels from lookups when ids are present (chips / selects). */
export function enrichServiceUsersListUrlState(
  state: ServiceUsersListUrlState,
  lookups: ServiceUserLookupsBundle | null | undefined,
): ServiceUsersListUrlState {
  if (!lookups) return state
  const advanced = { ...state.advanced }
  if (advanced.careTypeId) {
    advanced.careTypeLabel =
      lookups.careTypes.find((r) => r.id === advanced.careTypeId)?.name ?? advanced.careTypeLabel
  }
  if (advanced.fundingTypeId) {
    advanced.fundingTypeLabel =
      lookups.fundingTypes.find((r) => r.id === advanced.fundingTypeId)?.name ??
      advanced.fundingTypeLabel
  }
  return { ...state, advanced }
}

export function buildServiceUsersListSearch(
  state: ServiceUsersListUrlState,
): ServiceUsersListSearch {
  const out: ServiceUsersListSearch = {}
  const q = state.search.trim()
  if (q) out.q = q
  const kw = state.kwSearch.trim()
  if (kw) out.kw = kw
  if (state.statusFilter !== DEFAULT_SERVICE_USER_STATUS_CODE) {
    out.status = state.statusFilter
  }
  if (state.listFilter) out.list = state.listFilter
  if (state.riskFilter) out.risk = state.riskFilter
  if (state.unassignedOnly) out.unassigned = '1'
  if (state.onHoldOnly) out.onHold = '1'
  if (state.page > 1) out.page = String(state.page)

  const a = state.advanced
  if (a.ageMin != null) out.ageMin = String(a.ageMin)
  if (a.ageMax != null) out.ageMax = String(a.ageMax)
  if (a.careTypeId) out.careType = a.careTypeId
  if (a.fundingTypeId) out.fundingType = a.fundingTypeId
  if (a.serviceStartDateFrom) out.serviceStartFrom = a.serviceStartDateFrom
  if (a.serviceStartDateTo) out.serviceStartTo = a.serviceStartDateTo
  if (a.dateOfDeathFrom) out.dodFrom = a.dateOfDeathFrom
  if (a.dateOfDeathTo) out.dodTo = a.dateOfDeathTo
  if (a.carePlanListStatus) out.carePlanStatus = a.carePlanListStatus
  const carePlans = idsToComma(a.carePlanFormIds)
  if (carePlans) out.carePlans = carePlans
  const conditions = idsToComma([...(a.medicalConditionIds ?? []), a.medicalConditionId])
  if (conditions) out.conditions = conditions
  if (a.initialAssessmentStatus) out.iaStatus = a.initialAssessmentStatus
  if (a.missedVisitsMin != null && a.missedVisitsMin >= 0) {
    out.missedMin = String(a.missedVisitsMin)
  }
  if (a.missedVisitsFrom) out.missedFrom = a.missedVisitsFrom
  if (a.missedVisitsTo) out.missedTo = a.missedVisitsTo
  if (a.hasActiveFlashMessage) out.flash = '1'
  if (a.hospitalisedOnly) out.hospitalised = '1'
  if (a.loneWorkerRisk) out.loneWorker = '1'
  if (a.verbalAltercation) out.verbal = '1'
  if (a.physicalAltercation) out.physical = '1'
  if (a.physicalAbuseToSu) out.physicalAbuseSu = '1'
  if (a.domesticViolence) out.domestic = '1'
  if (a.safeguardingHistory) out.safeguarding = '1'
  return out
}

/** TanStack Router `validateSearch` — keep unknown keys out, coerce to strings. */
export function validateServiceUsersListSearch(
  raw: Record<string, unknown>,
): ServiceUsersListSearch {
  const keys: (keyof ServiceUsersListSearch)[] = [
    'q',
    'kw',
    'status',
    'list',
    'risk',
    'unassigned',
    'onHold',
    'page',
    'ageMin',
    'ageMax',
    'careType',
    'fundingType',
    'serviceStartFrom',
    'serviceStartTo',
    'dodFrom',
    'dodTo',
    'carePlanStatus',
    'carePlans',
    'conditions',
    'iaStatus',
    'missedMin',
    'missedFrom',
    'missedTo',
    'flash',
    'hospitalised',
    'loneWorker',
    'verbal',
    'physical',
    'physicalAbuseSu',
    'domestic',
    'safeguarding',
  ]
  const out: ServiceUsersListSearch = {}
  for (const key of keys) {
    const value = asString(raw[key])?.trim()
    if (value) out[key] = value
  }
  return out
}
