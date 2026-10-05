import type { IncidentSeverity, IncidentStatus } from '@/features/incidents/types'

/** Compact query keys for `/incidents/view` (shareable / survives Back and refresh). */
export type IncidentsListSearch = {
  q?: string
  status?: string
  /** One severity, or a comma list such as `HIGH,CRITICAL`. */
  severity?: string
  category?: string
  open?: boolean
  from?: string
  to?: string
  su?: string
  emp?: string
  /** Closed on or after this day (YYYY-MM-DD). */
  closed?: string
  /** Only incidents with overdue corrective measures. */
  overdue?: boolean
  page?: number
}

export type IncidentsListUrlState = {
  search: string
  status: IncidentStatus | ''
  severities: IncidentSeverity[]
  categoryId: string
  openOnly: boolean
  dateFrom: string
  dateTo: string
  serviceUserId: string
  employeeId: string
  closedFrom: string
  overdueOnly: boolean
  page: number
}

export const EMPTY_INCIDENTS_LIST_URL_STATE: IncidentsListUrlState = {
  search: '',
  status: '',
  severities: [],
  categoryId: '',
  openOnly: false,
  dateFrom: '',
  dateTo: '',
  serviceUserId: '',
  employeeId: '',
  closedFrom: '',
  overdueOnly: false,
  page: 1,
}

const STATUSES = new Set<IncidentStatus>([
  'REPORTED',
  'UNDER_REVIEW',
  'UNDER_INVESTIGATION',
  'ACTIONS_REQUIRED',
  'AWAITING_CLOSURE',
  'CLOSED',
])
const SEVERITY_ORDER: IncidentSeverity[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function asString(value: unknown): string | undefined {
  if (typeof value === 'string') return value.trim() || undefined
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return undefined
}

function asUuid(value: unknown): string | undefined {
  const s = asString(value)
  return s && UUID.test(s) ? s : undefined
}

function asIsoDay(value: unknown): string | undefined {
  const s = asString(value)
  return s && ISO_DAY.test(s) ? s : undefined
}

function parseSeverities(value: unknown): IncidentSeverity[] {
  const s = asString(value)
  if (!s) return []
  const wanted = new Set(s.split(',').map((p) => p.trim().toUpperCase()))
  // Older dashboard links use `HIGH_CRITICAL`.
  if (wanted.has('HIGH_CRITICAL')) wanted.add('HIGH').add('CRITICAL')
  return SEVERITY_ORDER.filter((sev) => wanted.has(sev))
}

/** TanStack Router `validateSearch` — drops anything malformed. */
export function validateIncidentsListSearch(raw: Record<string, unknown>): IncidentsListSearch {
  const out: IncidentsListSearch = {}
  const q = asString(raw.q)
  if (q) out.q = q.slice(0, 200)
  const status = asString(raw.status)
  if (status && STATUSES.has(status as IncidentStatus)) out.status = status
  const severities = parseSeverities(raw.severity)
  if (severities.length) out.severity = severities.join(',')
  const category = asUuid(raw.category)
  if (category) out.category = category
  const open = raw.open === true ? 'true' : asString(raw.open)
  if (open === 'true' || open === '1') out.open = true
  const from = asIsoDay(raw.from)
  if (from) out.from = from
  const to = asIsoDay(raw.to)
  if (to) out.to = to
  const su = asUuid(raw.su)
  if (su) out.su = su
  const emp = asUuid(raw.emp)
  if (emp) out.emp = emp
  const closed = asIsoDay(raw.closed ?? raw.closedFrom)
  if (closed) out.closed = closed
  const overdue = raw.overdue === true ? 'true' : asString(raw.overdue)
  if (overdue === 'true' || overdue === '1') out.overdue = true
  const page = Number(asString(raw.page))
  if (Number.isInteger(page) && page > 1) out.page = page
  return out
}

export function parseIncidentsListSearch(search: IncidentsListSearch): IncidentsListUrlState {
  const v = validateIncidentsListSearch(search as Record<string, unknown>)
  return {
    search: v.q ?? '',
    status: (v.status as IncidentStatus | undefined) ?? '',
    severities: parseSeverities(v.severity),
    categoryId: v.category ?? '',
    openOnly: v.open === true,
    dateFrom: v.from ?? '',
    dateTo: v.to ?? '',
    serviceUserId: v.su ?? '',
    employeeId: v.emp ?? '',
    closedFrom: v.closed ?? '',
    overdueOnly: v.overdue === true,
    page: v.page ?? 1,
  }
}

export function buildIncidentsListSearch(state: IncidentsListUrlState): IncidentsListSearch {
  return validateIncidentsListSearch({
    q: state.search,
    status: state.status,
    severity: state.severities.join(','),
    category: state.categoryId,
    open: state.openOnly ? true : undefined,
    from: state.dateFrom,
    to: state.dateTo,
    su: state.serviceUserId,
    emp: state.employeeId,
    closed: state.closedFrom,
    overdue: state.overdueOnly ? true : undefined,
    page: state.page > 1 ? state.page : undefined,
  })
}

/** True when any filter (not paging) differs from the defaults. */
export function hasActiveIncidentsListFilters(state: IncidentsListUrlState): boolean {
  return Boolean(
    state.search ||
      state.status ||
      state.severities.length ||
      state.categoryId ||
      state.openOnly ||
      state.dateFrom ||
      state.dateTo ||
      state.serviceUserId ||
      state.employeeId ||
      state.closedFrom ||
      state.overdueOnly,
  )
}
