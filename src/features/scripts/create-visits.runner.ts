/**
 * Create visits for service users — with their carers, tasks and medicines — calling the same API
 * endpoints in the same order as the admin screens, as the signed-in user (Scripts page).
 *
 * The same steps as careflow-api `prisma/scripts/create-visits-via-api.ts` (keep the two in step):
 *   Visit plan tab   → create/load plan, weekly-hours + carer-pattern (+ amendment) previews, save
 *   Visit tasks tab  → load tasks, merge, save (PUT replaces the whole list, so existing tasks are kept)
 *   Add medication   → one medicine per name, one administration time per round it is given in
 *   Visit plan tab   → activate preview + activate (draft only), generate-rota preview + generate
 *   Check            → read the rota back: visits, carers on them, visits still missing carers
 *
 * Rota dates are the Generate rota step's: From = today (organisation time zone), To = the rota horizon
 * (Settings → Dom Rules: N days, or to month end); the nightly rolling rota extends it from there.
 * `fromDate` / `toDate` in the input override them, as the step's From / To fields do.
 *
 * Every app rule still runs: carers over their weekly hours go to Hours approvals, blocked carers and
 * clashes are refused, audit logs are written as the signed-in user.
 */
import { ApiError, apiJson } from '@/shared/api/api-client'
import {
  resolveGenerateRotaToDate,
  todayIsoDate,
  type RotaHorizonMode,
} from '@/features/service-users/visit-plan/visit-plan-generate-rota.util'
import { nextAdditionalVisitSlotCode } from '@/features/service-users/visit-plan/visit-plan-time-slots.util'
import { pickDatasetMedicines } from '@/features/scripts/medicine-dataset'
import { pickRoundTasks } from '@/features/scripts/task-dataset'

// ── Input (the same JSON as create-visits.example.json) ───────────────────────

type CarerRef = string
export type TaskInput = { task: string; instructions?: string; priority?: string; dueTime?: string }
export type MedicineInput = {
  name: string
  dose: string
  route?: string
  kind?: 'REGULAR' | 'PRN'
  time?: string
  startDate?: string
  instructions?: string
  reason?: string
}
export type VisitInput = {
  round: string
  start: string
  end: string
  days?: string | Array<string | number>
  carers?: CarerRef | CarerRef[]
  carersByDay?: Record<string, CarerRef | CarerRef[]>
  requiredCarers?: number
  notes?: string
  tasks?: TaskInput[]
  medicines?: MedicineInput[]
  /** Medicines to auto-add from the built-in dataset (medicine-dataset.ts), picked per service user: 1–5. */
  autoMedicines?: number
  /** Everyday tasks to auto-add for the round (task-dataset.ts), picked per service user: 1–5. */
  autoTasks?: number
}
export type ServiceUserInput = {
  serviceUser: string
  weeklyContractedHours?: string | number
  visits: VisitInput[]
}
export type CreateVisitsInput = {
  /** Default today (as Generate rota's From). */
  fromDate?: string
  /** Default the rota horizon from fromDate (as Generate rota with To left empty). */
  toDate?: string
  carer?: CarerRef | CarerRef[]
  amendmentReason?: string
  /** No longer used: carers are only put on visits they are available for (working patterns count). */
  respectWorkingPatterns?: boolean
  /**
   * Carers to try first when a visit's own carers are not available (Custom Visit Creation: every
   * carer selected on the page). The app's own suggestions follow.
   */
  carerPool?: CarerRef[]
  serviceUsers: ServiceUserInput[]
}

export type Summary = {
  serviceUser: string
  plan: string
  slots: string[]
  tasks: string[]
  medicines: string[]
  warnings: string[]
  visits?: { total: number; fullyStaffed: number; carers: Record<string, number>; missing: string[] }
  /** Rota visits this run created (the rest of the range already existed). */
  visitsCreated?: number
  /** Requests this run sent to Hours approvals (visits waiting for a manager, unassigned until then). */
  heldForApproval?: number
  /** Plan saved; the rota waits for the choice after the run (a new plan is still a draft). */
  rotaPending?: boolean
  /** The service user's id, for links to their record. */
  serviceUserId?: string
  /** They had no weekly hours, so the plan and their weekly hours were set to the default. */
  weeklyHoursDefaulted?: string
  failed?: string
}

/** What a run is started with, checked by the server and kept in its audit record. */
export type RunMeta = { mode: 'AUTOMATIC' | 'CUSTOM'; serviceUserIds?: string[]; carerIds?: string[] }

export type RunOptions = {
  dryRun: boolean
  /** One progress line at a time, as the run goes. */
  log: (line: string) => void
  /**
   * Make the rota in the run (default). False: plans, tasks and medicines are saved, new plans stay
   * drafts, and the rota waits — `generateRota` on the result makes it when you choose to.
   */
  generateRota?: boolean
}

/** A run's results, and — when the rota was left for later — the step that makes it. */
export type CreateVisitsRun = {
  results: Summary[]
  /** Activates waiting drafts and generates their rota, updating `results`; null when nothing waits. */
  generateRota: (() => Promise<Summary[]>) | null
}

const DEFAULT_REASON = 'Visits added from the Scripts page'
/** Weekly contracted hours used when a service user has none (DOM Care tab) and no plan yet. */
export const DEFAULT_WEEKLY_CONTRACTED_HOURS = '20'

/** The API generates at most 31 days of rota per call. */
const MAX_GENERATE_DAYS = 31
/** Saving a plan or generating a month of rota can take a while. */
const WRITE_TIMEOUT_MS = 180_000

type Envelope<T> = { data?: T; meta?: Record<string, unknown>; message?: string }

/** Waits after the API's rate limit (429) turns a request away, before sending it again. */
const RATE_LIMIT_WAITS_MS = [5_000, 10_000, 20_000, 30_000]

/**
 * One API call as the signed-in user. A run makes many calls in a row, so a request the rate limiter
 * turned away (429: rejected before it reached the handler, nothing saved) is sent again after a pause —
 * for saves too, which the shared client does not retry. Any other error stops as before.
 */
async function api<T = unknown>(method: 'GET' | 'POST' | 'PUT' | 'PATCH', path: string, body?: unknown) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await apiJson<Envelope<T>>(
        path,
        { method, ...(body === undefined ? {} : { body: JSON.stringify(body) }) },
        { timeoutMs: WRITE_TIMEOUT_MS },
      )
    } catch (e) {
      const wait = RATE_LIMIT_WAITS_MS[attempt]
      if (!(e instanceof ApiError) || e.status !== 429 || wait === undefined) throw e
      await new Promise((resolve) => setTimeout(resolve, wait))
    }
  }
}

// ── Small helpers ──────────────────────────────────────────────────────────────

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const HM = /^([01]\d|2[0-3]):[0-5]\d$/
const DAY_NAMES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

const list = <T,>(v: T | T[] | undefined): T[] => (v == null ? [] : Array.isArray(v) ? v : [v])
const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ')

function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00.000Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

function minutesBetween(start: string, end: string): number {
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  let diff = (eh ?? 0) * 60 + (em ?? 0) - ((sh ?? 0) * 60 + (sm ?? 0))
  if (diff <= 0) diff += 24 * 60 // overnight visit
  return diff
}

/** 0=Sun … 6=Sat, as the visit plan API counts days. */
function dayIndex(day: string | number): number {
  if (typeof day === 'number' && day >= 0 && day <= 6) return day
  const i = DAY_NAMES.indexOf(String(day).trim().slice(0, 3).toUpperCase())
  if (i < 0) throw new Error(`Unknown day "${day}" (use Mon, Tue … Sun)`)
  return i
}

function parseDays(days: VisitInput['days']): number[] {
  if (days == null || days === 'daily') return [0, 1, 2, 3, 4, 5, 6]
  if (days === 'weekdays') return [1, 2, 3, 4, 5]
  if (days === 'weekends') return [0, 6]
  if (!Array.isArray(days)) throw new Error(`Unknown days "${days}"`)
  return [...new Set(days.map(dayIndex))].sort()
}

function chunks(from: string, to: string): Array<{ fromDate: string; toDate: string }> {
  const out: Array<{ fromDate: string; toDate: string }> = []
  for (let start = from; start <= to; start = addDaysIso(start, MAX_GENERATE_DAYS)) {
    const end = addDaysIso(start, MAX_GENERATE_DAYS - 1)
    out.push({ fromDate: start, toDate: end < to ? end : to })
  }
  return out
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

/** Checks the input's shape before anything is called. */
export function validateInput(input: CreateVisitsInput) {
  if (input?.fromDate != null && !ISO_DATE.test(input.fromDate)) throw new Error('"fromDate" must be YYYY-MM-DD')
  if (input?.toDate != null && !ISO_DATE.test(input.toDate)) throw new Error('"toDate" must be YYYY-MM-DD')
  if (!Array.isArray(input?.serviceUsers) || !input.serviceUsers.length) throw new Error('"serviceUsers" is empty')
}

type RotaSettings = { domRotaHorizonDays?: number; domRotaHorizonMode?: RotaHorizonMode; domAutoExtendRotaEnabled?: boolean }

/** The Generate rota step's dates: today → the rota horizon, unless the input names them. */
async function rotaDates(input: CreateVisitsInput) {
  const settings = (await api<RotaSettings>('GET', '/settings/general')).data ?? {}
  const fromDate = input.fromDate ?? todayIsoDate()
  const toDate = resolveGenerateRotaToDate(fromDate, input.toDate, {
    horizonDays: settings.domRotaHorizonDays,
    mode: settings.domRotaHorizonMode,
  })
  if (toDate < fromDate) throw new Error('"toDate" is before "fromDate"')
  const horizon =
    settings.domRotaHorizonMode === 'CALENDAR_MONTH' ? 'to month end' : `${settings.domRotaHorizonDays ?? 28} days`
  const how = input.toDate
    ? 'dates from the input'
    : `the rota horizon (${horizon}, Settings → Dom Rules)${
        settings.domAutoExtendRotaEnabled ? '; the nightly rolling rota keeps extending it' : '; rolling rota is off'
      }`
  return { fromDate, toDate, how }
}

// ── Lookups (resolved by name, as the app's search boxes do) ───────────────────

type ServiceUserRow = { id: string; serviceUserNumber: string | null; firstName: string; lastName: string }
type EmployeeRow = { id: string; fullName: string | null; firstName: string | null; lastName: string | null }
type Lookup = { id: string; name: string; code: string; time?: string | null }
type Lookups = { routes: Lookup[]; frequencies: Lookup[]; rounds: Lookup[] }

const carerName = (e: EmployeeRow) => e.fullName ?? `${e.firstName ?? ''} ${e.lastName ?? ''}`.trim()

/** One carer from the visit plan screen's carer check (POST …/visit-plans/suggest-carers). */
type CarerCandidate = {
  employeeId: string
  displayName?: string
  isPreferred?: boolean
  isBlocked?: boolean
  hasRotaConflict?: boolean
  rotaConflictJobs?: string[]
  availability?: { unavailableDays?: number[]; timeMismatchDays?: number[]; summary?: string }
  ruleBlocked?: boolean
  ruleBlockReasons?: string[]
  complianceBlocksAllocation?: boolean
  timeOff?: unknown
  contractedWeeklyHours?: number | null
  allowedWeeklyHours?: number | null
  assignedWeeklyHours?: number | null
  exceedsContractedHours?: boolean
}

/** Every task in the task list (groups → categories → tasks), by name. */
function catalogueTasks(groups: unknown): Map<string, { id: string; name: string }> {
  const out = new Map<string, { id: string; name: string }>()
  const walk = (node: unknown) => {
    if (Array.isArray(node)) return node.forEach(walk)
    if (!node || typeof node !== 'object') return
    const obj = node as Record<string, unknown>
    if (Array.isArray(obj.tasks)) {
      for (const t of obj.tasks as Array<{ id?: string; name?: string }>) {
        if (t?.id && t.name) out.set(norm(t.name), { id: t.id, name: t.name })
      }
    }
    for (const v of Object.values(obj)) if (v && typeof v === 'object') walk(v)
  }
  walk(groups)
  return out
}

// ── Visit plan slots ───────────────────────────────────────────────────────────

type CarerAssignment = {
  dayOfWeek?: number | null
  employeeId: string
  role?: 'LEAD' | 'SECONDARY'
  requiredCarers?: number | null
  durationMinutes?: number | null
  plannedStartTime?: string | null
  plannedEndTime?: string | null
  sortOrder?: number
}
type SlotInput = Record<string, unknown> & {
  slotCode: string
  plannedStartTime: string
  plannedEndTime: string
  daysOfWeek: number[]
}
type PlanSlot = SlotInput & { carerAssignments?: Array<CarerAssignment & { id?: string }> }
type Plan = {
  id: string
  status: 'DRAFT' | 'ACTIVE' | 'SUSPENDED' | 'ENDED'
  weeklyContractedHours: string | null
  effectiveFrom?: string | null
  effectiveTo?: string | null
  numberOfCarers?: number
  notes?: string | null
  slots: PlanSlot[]
}

/** The slot fields a save accepts — the same list as the visit plan tab's toSlotInput. */
const SLOT_FIELDS = [
  'slotCode', 'daysOfWeek', 'plannedStartTime', 'plannedEndTime', 'requiredCarers', 'isEnabled',
  'medicationRoundCode', 'notes', 'scheduleFrequency', 'repeatEvery', 'repeatUnit', 'timeCritical',
  'timeToleranceMinutes', 'durationMinutes', 'notesRequired', 'photoAllowed', 'shareOutcomeWithFamily',
  'analysisArea', 'monthlyDayMode', 'monthlyDaysOfMonth', 'monthlyPatternOrdinal', 'monthlyPatternWeekday',
  'linkedCarePlanFormIds', 'assignedEmployeeIds', 'slotKind', 'nightDuty', 'slotEffectiveFrom',
  'slotEffectiveTo', 'oneOffDate', 'allowBackfillDays', 'carerAssignments',
] as const
const ASSIGNMENT_FIELDS = [
  'dayOfWeek', 'employeeId', 'role', 'requiredCarers', 'durationMinutes', 'plannedStartTime',
  'plannedEndTime', 'sortOrder',
] as const
const SCHEDULE_FIELDS = [
  'scheduleFrequency', 'repeatEvery', 'repeatUnit', 'daysOfWeek', 'timeCritical', 'timeToleranceMinutes',
  'monthlyDayMode', 'monthlyDaysOfMonth', 'monthlyPatternOrdinal', 'monthlyPatternWeekday',
] as const

function pick(obj: Record<string, unknown>, fields: readonly string[]) {
  const out: Record<string, unknown> = {}
  for (const f of fields) if (obj[f] !== undefined) out[f] = obj[f]
  return out
}

/** An existing slot as a save body (unknown fields are refused by the API). */
function existingSlotInput(slot: PlanSlot): SlotInput {
  const carerAssignments = (slot.carerAssignments ?? [])
    .filter((a) => a.employeeId)
    .map((a) => pick(a as Record<string, unknown>, ASSIGNMENT_FIELDS))
  const input = pick(slot, SLOT_FIELDS) as SlotInput
  input.carerAssignments = carerAssignments
  // Default (all-days) carers only, as normalizeSlotCarerFields does.
  const allDays = carerAssignments.filter((a) => a.dayOfWeek == null).map((a) => a.employeeId as string)
  if (allDays.length) input.assignedEmployeeIds = [...new Set(allDays)]
  return input
}

/**
 * The round a plan row belongs to. A round can hold several visits, as on the visit plan screen: the
 * first uses the round's code (`MORNING`), each further one its own row (`MORNING__2`, …) linked to
 * the round through medicationRoundCode.
 */
const roundOf = (s: SlotInput) =>
  String(s.medicationRoundCode ?? '').trim().toUpperCase() || s.slotCode.toUpperCase().replace(/__\d+$/, '')

/** Same visit: same round and same times (re-running updates it rather than adding another). */
const sameVisit = (s: SlotInput, round: string, start: string, end: string) =>
  roundOf(s) === round && s.plannedStartTime === start && s.plannedEndTime === end

/** The Visit tasks tab's default schedule (DEFAULT_VISIT_TASK_SCHEDULE), on the visit's days. */
function defaultTaskSchedule(daysOfWeek: number[]) {
  return {
    daysOfWeek,
    scheduleFrequency: 'DAILY',
    repeatEvery: 1,
    repeatUnit: 'DAYS',
    timeCritical: false,
    timeToleranceMinutes: 30,
    monthlyDayMode: 'BY_DATE',
    monthlyDaysOfMonth: [],
    monthlyPatternOrdinal: 'FIRST',
    monthlyPatternWeekday: 1,
  }
}

// ── The run ────────────────────────────────────────────────────────────────────

/** Runs the whole input: every service user in turn; one failing does not stop the others. */
export async function runCreateVisits(
  input: CreateVisitsInput,
  { dryRun, log, generateRota = true }: RunOptions,
): Promise<CreateVisitsRun> {
  /** Service users whose plan is saved and whose rota waits for the choice after the run. */
  const pendingRota: Array<{ summary: Summary; serviceUserId: string; plan: Plan }> = []
  validateInput(input)
  const { fromDate, toDate, how } = await rotaDates(input)
  const carerCache = new Map<string, EmployeeRow>()
  const reason = input.amendmentReason?.trim() || DEFAULT_REASON
  // Carers are only put on visits the app counts them available for: working patterns always count.
  const respect = true

  async function findServiceUser(ref: string): Promise<ServiceUserRow> {
    if (UUID.test(ref)) {
      const res = await api<ServiceUserRow>('GET', `/service-users/${ref}`)
      if (res.data) return res.data
    }
    // The search matches one field at a time, so a full name is searched by its last word.
    const term = ref.trim().split(/\s+/).pop() ?? ref
    const res = await api<ServiceUserRow[]>('GET', `/service-users?search=${encodeURIComponent(term)}&limit=100`)
    const want = norm(ref)
    const matches = (res.data ?? []).filter(
      (s) => norm(s.serviceUserNumber ?? '') === want || norm(`${s.firstName} ${s.lastName}`) === want,
    )
    if (matches.length !== 1) {
      throw new Error(
        matches.length
          ? `Service user "${ref}" matches ${matches.length} people — use their number or id`
          : `Service user "${ref}" not found`,
      )
    }
    return matches[0]!
  }

  async function findCarer(ref: string): Promise<EmployeeRow> {
    const key = norm(ref)
    const cached = carerCache.get(key)
    if (cached) return cached
    const matches: EmployeeRow[] = []
    if (UUID.test(ref)) {
      // Picked on the page by id: the detail record (its name may sit under personalDetail).
      type Detail = EmployeeRow & { personalDetail?: { firstName?: string | null; lastName?: string | null } | null }
      const one = (await api<Detail>('GET', `/employees/${ref}`)).data
      if (one) {
        matches.push({
          id: one.id,
          fullName: one.fullName ?? null,
          firstName: one.firstName ?? one.personalDetail?.firstName ?? null,
          lastName: one.lastName ?? one.personalDetail?.lastName ?? null,
        })
      }
    } else {
      const res = await api<EmployeeRow[]>('GET', `/employees?search=${encodeURIComponent(ref)}&limit=20`)
      matches.push(...(res.data ?? []).filter((e) => norm(carerName(e)) === key))
    }
    if (matches.length !== 1) {
      throw new Error(
        matches.length ? `Carer "${ref}" matches ${matches.length} people — use their id` : `Carer "${ref}" not found`,
      )
    }
    carerCache.set(key, matches[0]!)
    return matches[0]!
  }

  /** " on Mon" when a check is for one day of a visit. */
  const onDay = (days: number[]) => (days.length === 1 ? ` on ${DAY_NAMES[days[0]!]}` : '')

  /** Carers this run has already put on visits: no double booking before the rota shows them. */
  const picked: Array<{ employeeId: string; days: number[]; start: number; end: number }> = []
  /** input.carerPool, found once: tried first when a visit's own carers are not available. */
  const pool: EmployeeRow[] = []
  /** Weekly minutes this run has added per carer (a dry run saves nothing, so the API cannot count them). */
  const addedMinutes = new Map<string, number>()
  const toMinutes = (hm: string) => {
    const [h, m] = hm.split(':').map(Number)
    return (h ?? 0) * 60 + (m ?? 0)
  }

  /**
   * Why a carer cannot take this visit, from the visit plan screen's carer check (suggest-carers):
   * working pattern, clash, blocked, rule, compliance, leave, weekly hours. Null = available.
   */
  function unavailableReason(
    c: CarerCandidate,
    visit: { days: number[]; start: string; end: string },
    weeklyMinutes: number,
    alreadyOnVisit: boolean,
  ): string | null {
    const dayNames = (days: number[]) => days.map((d) => DAY_NAMES[d]).join(', ')
    if (c.isBlocked) return 'blocked for this service user'
    if (c.timeOff) return 'on leave'
    if (c.availability?.unavailableDays?.length) return `not working ${dayNames(c.availability.unavailableDays)} (working pattern)`
    if (c.availability?.timeMismatchDays?.length) return `outside their working hours on ${dayNames(c.availability.timeMismatchDays)}`
    if (c.hasRotaConflict) return `already busy then${c.rotaConflictJobs?.length ? ` (${c.rotaConflictJobs.join(', ')})` : ''}`
    if (c.ruleBlocked) return c.ruleBlockReasons?.join('; ') || 'blocked by a rota rule'
    if (c.complianceBlocksAllocation) return 'compliance blocks allocation'
    const start = toMinutes(visit.start)
    const end = start + minutesBetween(visit.start, visit.end)
    const clash = picked.some(
      (p) => p.employeeId === c.employeeId && p.days.some((d) => visit.days.includes(d)) && p.start < end && p.end > start,
    )
    if (clash) return 'already given another visit at that time in this run'
    // Weekly hours are not a reason to swap: over the limit, the app's own workflow applies (Settings →
    // Dom Rules — e.g. the visit waits in Hours approvals until a manager approves, as when saved by hand).
    void weeklyMinutes
    void alreadyOnVisit
    return null
  }

  /**
   * The carers for one visit (or one day of it): the named ones the app counts as available, then —
   * for any place left — available carers the app suggests (preferred carers first, then the least
   * busy). Null when not enough carers are available: the visit is not added (never left unassigned).
   */
  async function chooseCarers(
    serviceUserId: string,
    visit: { round: string; days: number[]; start: string; end: string },
    required: number,
    named: EmployeeRow[],
    alreadyOn: Set<string>,
    notes: string[],
  ): Promise<EmployeeRow[] | null> {
    const res = await api<{ candidates?: CarerCandidate[] }>('POST', `/service-users/${serviceUserId}/visit-plans/suggest-carers`, {
      slotCode: visit.round,
      daysOfWeek: visit.days,
      plannedStartTime: visit.start,
      plannedEndTime: visit.end,
      requiredCarers: required,
      // The selected carers too: the carer check otherwise lists only carers it matches by location.
      ...(named.length || pool.length ? { includeEmployeeIds: [...new Set([...named, ...pool].map((e) => e.id))] } : {}),
    })
    const inPool = (id: string) => pool.some((e) => e.id === id)
    const candidates = res.data?.candidates ?? []
    const weeklyMinutes = minutesBetween(visit.start, visit.end) * visit.days.length
    const reasonFor = (id: string) => {
      const c = candidates.find((x) => x.employeeId === id)
      return c ? unavailableReason(c, visit, weeklyMinutes, alreadyOn.has(id)) : 'not offered by the carer check'
    }
    const chosen: EmployeeRow[] = []
    for (const e of named) {
      const why = reasonFor(e.id)
      if (why) notes.push(`${carerName(e)} can't take ${visit.round} ${visit.start}${onDay(visit.days)}: ${why}`)
      else chosen.push(e)
    }
    const others = candidates
      .filter((c) => !chosen.some((e) => e.id === c.employeeId) && !named.some((e) => e.id === c.employeeId))
      .filter((c) => !unavailableReason(c, visit, weeklyMinutes, alreadyOn.has(c.employeeId)))
      .sort(
        (a, b) =>
          Number(inPool(b.employeeId)) - Number(inPool(a.employeeId)) ||
          Number(b.isPreferred) - Number(a.isPreferred) ||
          (a.assignedWeeklyHours ?? 0) - (b.assignedWeeklyHours ?? 0),
      )
    for (const c of others) {
      if (chosen.length >= required) break
      const row: EmployeeRow = { id: c.employeeId, fullName: c.displayName ?? null, firstName: null, lastName: null }
      carerCache.set(norm(c.displayName ?? c.employeeId), row)
      chosen.push(row)
      const from = inPool(c.employeeId) ? 'available, one of the selected carers' : 'available'
      notes.push(`${c.displayName} put on ${visit.round} ${visit.start}${onDay(visit.days)} instead (${from})`)
    }
    if (chosen.length < required) return null
    // Hold the picks for the rest of the run.
    const start = toMinutes(visit.start)
    for (const e of chosen) {
      picked.push({ employeeId: e.id, days: visit.days, start, end: start + minutesBetween(visit.start, visit.end) })
      if (!alreadyOn.has(e.id)) addedMinutes.set(e.id, (addedMinutes.get(e.id) ?? 0) + weeklyMinutes)
    }
    return chosen
  }

  /**
   * One visit as a plan slot with its carers — only carers the app counts as available (see
   * chooseCarers). Null when no available carer can take it (some day of it): the visit is skipped.
   */
  async function buildSlot(
    serviceUserId: string,
    visit: VisitInput,
    defaultCarers: CarerRef[],
    existing: SlotInput | undefined,
    notes: string[],
  ): Promise<{ slot: SlotInput; carers: string[] } | null> {
    if (!HM.test(visit.start) || !HM.test(visit.end)) {
      throw new Error(`Visit times must be HH:mm (${visit.start}–${visit.end})`)
    }
    const round = visit.round.toUpperCase()
    let daysOfWeek = parseDays(visit.days)
    const named = await Promise.all((list(visit.carers).length ? list(visit.carers) : defaultCarers).map(findCarer))
    const namedByDay = new Map<number, EmployeeRow[]>()
    for (const [day, refs] of Object.entries(visit.carersByDay ?? {})) {
      namedByDay.set(dayIndex(day), await Promise.all(list(refs).map(findCarer)))
    }
    const most = Math.max(named.length, ...[...namedByDay.values()].map((c) => c.length), 1)
    const requiredCarers = Math.min(4, visit.requiredCarers ?? most)
    // Carers already on this visit in the plan: its hours are already on their rota.
    const alreadyOn = new Set(((existing?.carerAssignments ?? []) as CarerAssignment[]).map((a) => a.employeeId))

    const label = `${round} ${visit.start}–${visit.end}`
    const slotVisit = (days: number[]) => ({ round, days, start: visit.start, end: visit.end })

    // Carers per day: days with their own carers one by one; the other days together, and — when no
    // carer is free on all of them — day by day, so each day gets whoever is available that day.
    const dayCarers = new Map<number, EmployeeRow[]>()
    const missingDays: number[] = []
    for (const [day, dayNamed] of namedByDay) {
      if (!daysOfWeek.includes(day)) continue
      const chosen = await chooseCarers(serviceUserId, slotVisit([day]), requiredCarers, dayNamed, alreadyOn, notes)
      if (chosen) dayCarers.set(day, chosen)
      else missingDays.push(day)
    }
    const otherDays = daysOfWeek.filter((d) => !namedByDay.has(d))
    if (otherDays.length) {
      const tried: string[] = []
      const together = await chooseCarers(serviceUserId, slotVisit(otherDays), requiredCarers, named, alreadyOn, tried)
      if (together) {
        notes.push(...tried)
        for (const d of otherDays) dayCarers.set(d, together)
      } else if (otherDays.length === 1) {
        notes.push(...tried)
        missingDays.push(otherDays[0]!)
      } else {
        for (const d of otherDays) {
          const chosen = await chooseCarers(serviceUserId, slotVisit([d]), requiredCarers, named, alreadyOn, notes)
          if (chosen) dayCarers.set(d, chosen)
          else missingDays.push(d)
        }
      }
    }
    if (!dayCarers.size) {
      notes.push(
        existing
          ? `${label} kept as it was: no available carer on any of its days`
          : `${label} not added: no ${requiredCarers > 1 ? `${requiredCarers} carers` : 'carer'} available on any day — try other times`,
      )
      return null
    }
    if (missingDays.length) {
      const days = missingDays.sort().map((d) => DAY_NAMES[d]).join(', ')
      if (existing) {
        // An existing visit keeps its days (the script removes nothing you set up).
        notes.push(`${label}: ${requiredCarers > 1 ? `not enough available carers (${requiredCarers} needed)` : "no available carer"} on ${days} — those visits stay unassigned (remove the days in the Visit plan tab if not needed)`)
      } else {
        daysOfWeek = daysOfWeek.filter((d) => dayCarers.has(d))
        notes.push(`${label}: not added on ${days} (${requiredCarers > 1 ? `not enough available carers` : "no available carer"} those days)`)
      }
    }
    // The carers most days have are the visit's default; the other days get their own rows.
    const setKey = (carers: EmployeeRow[]) => carers.map((e) => e.id).sort().join(',')
    const counts = new Map<string, { carers: EmployeeRow[]; n: number }>()
    for (const carers of dayCarers.values()) {
      const k = setKey(carers)
      counts.set(k, { carers, n: (counts.get(k)?.n ?? 0) + 1 })
    }
    const allDay = [...counts.values()].sort((a, b) => b.n - a.n)[0]!.carers
    const byDay = new Map([...dayCarers].filter(([, carers]) => setKey(carers) !== setKey(allDay)))

    const carerAssignments: CarerAssignment[] = []
    allDay.forEach((e, i) =>
      carerAssignments.push({ dayOfWeek: null, employeeId: e.id, role: i === 0 ? 'LEAD' : 'SECONDARY', sortOrder: i }),
    )
    for (const [day, carers] of byDay) {
      carers.forEach((e, i) =>
        carerAssignments.push({
          dayOfWeek: day,
          employeeId: e.id,
          role: i === 0 ? 'LEAD' : 'SECONDARY',
          requiredCarers,
          sortOrder: i,
        }),
      )
    }

    const slot: SlotInput = {
      slotCode: visit.round.toUpperCase(),
      medicationRoundCode: visit.round.toUpperCase(),
      daysOfWeek,
      plannedStartTime: visit.start,
      plannedEndTime: visit.end,
      durationMinutes: minutesBetween(visit.start, visit.end),
      requiredCarers,
      isEnabled: true,
      scheduleFrequency: 'WEEKLY',
      ...(visit.notes ? { notes: visit.notes } : {}),
      assignedEmployeeIds: allDay.map((e) => e.id),
      carerAssignments,
    }
    const names = [
      ...allDay.map(carerName),
      ...[...byDay.entries()].map(([d, c]) => `${DAY_NAMES[d]}: ${c.map(carerName).join(' + ')}`),
    ]
    return { slot, carers: names }
  }

  /** Weekly-hours, carer working-pattern and (active plan) amendment previews, as the Save button runs them. */
  async function previews(serviceUserId: string, plan: Plan, slots: SlotInput[], summary: Summary) {
    const base = `/service-users/${serviceUserId}/visit-plans/${plan.id}`
    const hours = (
      await api<{
        limitWeeklyHours: number | null
        overLimitWeeks: Array<{ weekStart: string; minutes: number }>
        visitsNeedApproval?: boolean
      }>('POST', `${base}/weekly-hours-preview`, { slots })
    ).data
    for (const w of hours?.overLimitWeeks ?? []) {
      summary.warnings.push(
        `Week of ${w.weekStart}: ${Math.round(w.minutes / 6) / 10}h of visits, over the service user's ` +
          `${hours?.limitWeeklyHours ?? '?'}h a week — ` +
          (hours?.visitsNeedApproval ? 'visits over it wait for Hours approvals' : 'made with a warning'),
      )
    }
    const pattern = (
      await api<{
        conflicts?: Array<{ employeeName: string; slotLabel: string; unavailableDayLabels: string[] }>
      }>('POST', `${base}/carer-sync-pattern-preview`, { slots })
    ).data
    for (const c of pattern?.conflicts ?? []) {
      const when = c.unavailableDayLabels.length ? c.unavailableDayLabels.join(', ') : 'outside their hours'
      summary.warnings.push(
        `Working pattern: ${c.employeeName} not working on ${c.slotLabel} (${when}) — ` +
          (respect ? 'left off those visits' : 'assigned anyway'),
      )
    }
    let applyScheduleImpact = false
    if (plan.status === 'ACTIVE') {
      const impact = (
        await api<{ scheduleImpact?: { jobsCancelled?: number; jobsRescheduled?: number } }>(
          'POST',
          `${base}/amendment-impact-preview`,
          { amendmentReason: reason, weeklyContractedHours: plan.weeklyContractedHours ?? null, slots },
        )
      ).data
      const cancelled = impact?.scheduleImpact?.jobsCancelled ?? 0
      const rescheduled = impact?.scheduleImpact?.jobsRescheduled ?? 0
      // The screen asks to confirm; the script confirms and reports it.
      if (cancelled + rescheduled > 0) {
        applyScheduleImpact = true
        summary.warnings.push(`Rota changes from this amendment: ${cancelled} cancelled, ${rescheduled} rescheduled`)
      }
    }
    return { applyScheduleImpact }
  }

  async function saveTasks(
    serviceUserId: string,
    wanted: Array<TaskInput & { round: string; days: number[] }>,
    taskList: Map<string, { id: string; name: string }>,
    summary: Summary,
  ) {
    type Assignment = {
      carerInstructions: string | null
      priority: string
      dueTime: string | null
      bodyMapRequired: boolean
      schedule?: Record<string, unknown>
      task: { id: string; name: string }
    }
    const current =
      (await api<{ assignmentsByRound: Record<string, Assignment[]> }>('GET', `/service-users/${serviceUserId}/visit-tasks`))
        .data?.assignmentsByRound ?? {}

    // Everything already there, as the save body (the save replaces the whole list).
    const byRound = new Map<string, Array<Record<string, unknown>>>()
    for (const [round, rows] of Object.entries(current)) {
      byRound.set(
        round,
        rows.map((r) => ({
          taskCatalogueTaskId: r.task.id,
          carerInstructions: r.carerInstructions,
          priority: r.priority,
          bodyMapRequired: r.bodyMapRequired,
          dueTime: r.dueTime,
          ...(r.schedule ? { schedule: pick(r.schedule, SCHEDULE_FIELDS) } : {}),
        })),
      )
    }

    for (const t of wanted) {
      const found = taskList.get(norm(t.task))
      if (!found) throw new Error(`Task "${t.task}" is not in the task list (Settings → Tasks planner)`)
      const priority = (t.priority ?? 'routine').toLowerCase()
      if (!['routine', 'important', 'critical'].includes(priority)) {
        throw new Error(`Task "${t.task}": priority must be routine, important or critical`)
      }
      if (t.dueTime && !HM.test(t.dueTime)) throw new Error(`Task "${t.task}": dueTime must be HH:mm`)
      const rows = byRound.get(t.round) ?? []
      const item = {
        taskCatalogueTaskId: found.id,
        carerInstructions: t.instructions ?? null,
        priority,
        ...(t.dueTime ? { dueTime: t.dueTime } : {}),
      }
      const at = rows.findIndex((r) => r.taskCatalogueTaskId === found.id)
      if (at >= 0) rows[at] = { ...rows[at], ...item }
      // A schedule is always sent, as the tab does (the API's default without one is broken).
      else rows.push({ ...item, schedule: defaultTaskSchedule(t.days) })
      byRound.set(t.round, rows)
      summary.tasks.push(`${t.round}: ${found.name} (${priority})${at >= 0 ? ' — updated' : ''}`)
    }

    if (dryRun) return
    await api('PUT', `/service-users/${serviceUserId}/visit-tasks`, {
      rounds: [...byRound.entries()].map(([medicationRoundCode, tasks]) => ({ medicationRoundCode, tasks })),
    })
    log(`  tasks saved (${wanted.length})`)
  }

  async function saveMedicines(
    serviceUserId: string,
    wanted: Array<MedicineInput & { round: string; visitStart: string }>,
    lookups: Lookups,
    summary: Summary,
  ) {
    const existing =
      (await api<Array<{ medicationName: string; status: string }>>('GET', `/service-users/${serviceUserId}/medications?limit=100`))
        .data ?? []
    const active = new Set(existing.filter((m) => m.status === 'ACTIVE').map((m) => norm(m.medicationName)))

    // One medicine per name; each round it appears in becomes one administration time.
    const byName = new Map<string, Array<MedicineInput & { round: string; visitStart: string }>>()
    for (const m of wanted) byName.set(norm(m.name), [...(byName.get(norm(m.name)) ?? []), m])

    for (const [key, rows] of byName) {
      const first = rows[0]!
      if (active.has(key)) {
        summary.medicines.push(`${first.name} — already active, skipped`)
        continue
      }
      const kind = (first.kind ?? 'REGULAR').toUpperCase() as 'REGULAR' | 'PRN'
      const routeCode = (first.route ?? 'ORAL').toUpperCase()
      const route = lookups.routes.find((r) => r.code === routeCode || norm(r.name) === norm(routeCode))
      if (!route) throw new Error(`Medicine "${first.name}": unknown route "${first.route}"`)

      const schedules =
        kind === 'PRN'
          ? undefined
          : rows.map((m) => {
              const dueTime = m.time ?? m.visitStart
              if (!HM.test(dueTime)) throw new Error(`Medicine "${m.name}": time must be HH:mm`)
              return { dueTime, dose: m.dose, roundId: lookups.rounds.find((r) => r.code === m.round)?.id }
            })
      const timesPerDay = schedules?.length ?? 0
      const frequencyCode =
        timesPerDay >= 5 ? 'FIVE_TIMES_DAILY'
          : timesPerDay === 4 ? 'FOUR_TIMES_DAILY'
            : timesPerDay === 3 ? 'THREE_TIMES_DAILY'
              : timesPerDay === 2 ? 'TWICE_DAILY'
                : 'ONCE_DAILY'
      const body = {
        medicationName: first.name,
        medicationKind: kind,
        dose: first.dose,
        startDate: first.startDate ?? fromDate,
        routeId: route.id,
        ...(kind === 'REGULAR'
          ? {
              schedulePattern: 'DAILY',
              frequencyIntervalDays: 1,
              frequencyId: lookups.frequencies.find((f) => f.code === frequencyCode)?.id,
              schedules,
            }
          : {}),
        ...(first.instructions ? { instructions: first.instructions } : {}),
        ...(first.reason ? { reasonForMedication: first.reason } : {}),
      }
      const when = kind === 'PRN' ? 'PRN' : rows.map((m) => `${m.round} ${m.time ?? m.visitStart}`).join(', ')
      summary.medicines.push(`${first.name} ${first.dose} (${route.name}) — ${when}`)
      if (!dryRun) await api('POST', `/service-users/${serviceUserId}/medications`, body)
    }
    if (!dryRun) log(`  medicines saved (${byName.size})`)
  }

  /** Carers on each visit come from the allocations endpoint (the list does not carry them), as the rota does. */
  async function checkRota(serviceUserId: string) {
    type JobRow = { id: string; jobName: string; scheduledStartDateTime: string; requiredCarers?: number }
    const jobs: JobRow[] = []
    for (let page = 1; ; page += 1) {
      const qs = new URLSearchParams({
        serviceUserId,
        dateFrom: `${fromDate}T00:00:00.000Z`,
        dateTo: `${toDate}T23:59:59.999Z`,
        limit: '100',
        page: String(page),
      })
      const res = await api<JobRow[]>('GET', `/scheduled-jobs?${qs}`)
      jobs.push(...(res.data ?? []))
      const totalPages = Number((res.meta as { totalPages?: number } | undefined)?.totalPages ?? 1)
      if (!res.data?.length || page >= totalPages) break
    }
    const nameById = new Map([...carerCache.values()].map((e) => [e.id, carerName(e)]))
    const carers: Record<string, number> = {}
    const missing: string[] = []
    let fullyStaffed = 0
    for (const job of jobs.sort((a, b) => a.scheduledStartDateTime.localeCompare(b.scheduledStartDateTime))) {
      const rows =
        (await api<Array<{ employeeId: string; status: string }>>('GET', `/scheduled-jobs/${job.id}/allocations`)).data ?? []
      const on = rows.filter((a) => ['ALLOCATED', 'CONFIRMED', 'PENDING_CONFIRMATION'].includes(a.status))
      const required = job.requiredCarers ?? 1
      if (on.length >= required) fullyStaffed += 1
      else missing.push(`${job.scheduledStartDateTime.slice(0, 16).replace('T', ' ')} ${job.jobName} (${on.length}/${required})`)
      for (const a of on) {
        // A carer already on the rota but not named in this run: look the name up once.
        if (!nameById.has(a.employeeId)) {
          type Detail = EmployeeRow & { personalDetail?: { firstName?: string | null; lastName?: string | null } | null }
          const one = (await api<Detail>('GET', `/employees/${a.employeeId}`).catch(() => null))?.data
          nameById.set(
            a.employeeId,
            one
              ? carerName({
                  id: one.id,
                  fullName: one.fullName ?? null,
                  firstName: one.firstName ?? one.personalDetail?.firstName ?? null,
                  lastName: one.lastName ?? one.personalDetail?.lastName ?? null,
                })
              : a.employeeId,
          )
        }
        const name = nameById.get(a.employeeId)!
        carers[name] = (carers[name] ?? 0) + 1
      }
    }
    return { total: jobs.length, fullyStaffed, carers, missing }
  }

  async function processServiceUser(
    su: ServiceUserInput,
    lookups: Lookups,
    taskList: Map<string, { id: string; name: string }>,
  ): Promise<Summary> {
    const row = await findServiceUser(su.serviceUser)
    const label = `${row.serviceUserNumber ?? row.id} ${row.firstName} ${row.lastName}`
    labelOf.set(su, label)
    const summary: Summary = {
      serviceUser: label,
      serviceUserId: row.id,
      plan: '',
      slots: [],
      tasks: [],
      medicines: [],
      warnings: [],
    }
    log(`━━ ${label}`)

    // 1) The plan the visit plan tab edits: active first, then draft, then suspended.
    const plans = (await api<Plan[]>('GET', `/service-users/${row.id}/visit-plans`)).data ?? []
    const working =
      plans.find((p) => p.status === 'ACTIVE') ??
      plans.find((p) => p.status === 'DRAFT') ??
      plans.find((p) => p.status === 'SUSPENDED')
    const existingSlots = (working?.slots ?? []).map(existingSlotInput)

    // Auto-added medicines: picked here, for this service user, from the built-in dataset — at the visit's
    // start (within the visit), never one they already have active or that is already on their visits.
    let visits: VisitInput[] = su.visits ?? []
    if (visits.some((v) => (v.autoMedicines ?? 0) > 0)) {
      const active = (
        (await api<Array<{ medicationName: string; status: string }>>('GET', `/service-users/${row.id}/medications?limit=100`)).data ?? []
      )
        .filter((m) => m.status === 'ACTIVE')
        .map((m) => m.medicationName)
      const taken = new Set([...active, ...visits.flatMap((v) => (v.medicines ?? []).map((m) => m.name))])
      visits = visits.map((v) => {
        const count = Math.min(Math.max(Math.floor(v.autoMedicines ?? 0), 0), 5)
        if (!count) return v
        const picked = pickDatasetMedicines(v.round, count, taken)
        picked.forEach((m) => taken.add(m.name))
        if (picked.length < count) {
          summary.warnings.push(`${v.round.toUpperCase()} ${v.start}: only ${picked.length} of ${count} medicines auto-added (the rest of the list is already active)`)
        }
        log(`  auto-picked for ${v.round.toUpperCase()} ${v.start}: ${picked.map((m) => `${m.name} ${m.dose}`).join(', ') || 'none'}`)
        const auto: MedicineInput[] = picked.map((m) => ({
          name: m.name,
          dose: m.dose,
          route: m.route,
          kind: m.kind,
          time: v.start,
          instructions: [m.form, m.instructions].filter(Boolean).join(' — '),
        }))
        return { ...v, medicines: [...(v.medicines ?? []), ...auto] }
      })
    }

    // Auto-added tasks: everyday tasks suited to the round (task-dataset.ts) that are in the task list,
    // picked for this service user — never one already on that round for them or already on the visit.
    if (visits.some((v) => (v.autoTasks ?? 0) > 0)) {
      type Assignment = { task?: { name?: string } | null; taskName?: string; name?: string }
      const current =
        (await api<{ assignmentsByRound?: Record<string, Assignment[]> }>('GET', `/service-users/${row.id}/visit-tasks`)).data
          ?.assignmentsByRound ?? {}
      const onRound = (round: string) =>
        (current[round] ?? []).map((a) => a.task?.name ?? a.taskName ?? a.name ?? '').filter(Boolean)
      const available = [...taskList.values()].map((t) => t.name)
      const takenByRound = new Map<string, Set<string>>()
      visits = visits.map((v) => {
        const count = Math.min(Math.max(Math.floor(v.autoTasks ?? 0), 0), 5)
        if (!count) return v
        const round = v.round.toUpperCase()
        const taken = takenByRound.get(round) ?? new Set([...onRound(round), ...visits.filter((x) => x.round.toUpperCase() === round).flatMap((x) => (x.tasks ?? []).map((t) => t.task))])
        takenByRound.set(round, taken)
        const picked = pickRoundTasks(round, count, available, taken)
        picked.forEach((t) => taken.add(t))
        if (picked.length < count) {
          summary.warnings.push(`${round} ${v.start}: only ${picked.length} of ${count} tasks auto-added (the rest are already on this round)`)
        }
        log(`  auto-picked tasks for ${round} ${v.start}: ${picked.join(', ') || 'none'}`)
        return { ...v, tasks: [...(v.tasks ?? []), ...picked.map((task) => ({ task, priority: 'routine' }))] }
      })
    }

    // Checked before anything is saved: a medicine's time must fall within its visit (overnight visits run past midnight).
    for (const v of visits) {
      for (const m of v.medicines ?? []) {
        if (!m.time || (m.kind ?? 'REGULAR').toUpperCase() === 'PRN') continue
        const inside = v.end > v.start ? m.time >= v.start && m.time <= v.end : m.time >= v.start || m.time <= v.end
        if (!HM.test(m.time) || !inside) {
          throw new Error(`Medicine "${m.name}" at ${m.time} is outside its visit (${v.round} ${v.start}–${v.end}) — nothing saved for this service user`)
        }
      }
    }

    // 2) Visits as visit plan slots, with available carers only (a visit no available carer can take is skipped).
    const rounds = new Set(lookups.rounds.map((r) => r.code))
    const built: SlotInput[] = []
    // Row codes in use; a switched-off row with the round's own code is an unused round, taken over
    // by the first new visit in it (as switching a round on does on the visit plan screen).
    const usedCodes = new Set(existingSlots.map((s) => s.slotCode.toUpperCase()))
    const unusedRounds = new Set(existingSlots.filter((s) => s.isEnabled === false && s.slotCode === roundOf(s)).map((s) => s.slotCode))
    const codeFor = (round: string) => {
      if (unusedRounds.delete(round) || !usedCodes.has(round)) {
        usedCodes.add(round)
        return round
      }
      const code = nextAdditionalVisitSlotCode(round, [...usedCodes].map((slotCode) => ({ slotCode })))
      usedCodes.add(code)
      return code
    }
    for (const visit of visits) {
      const round = visit.round?.toUpperCase()
      if (!rounds.has(round)) {
        throw new Error(`Unknown round "${visit.round}" (${[...rounds].join(', ')})`)
      }
      const existing = existingSlots.find((s) => s.isEnabled !== false && sameVisit(s, round, visit.start, visit.end))
      const done = await buildSlot(row.id, visit, list(input.carer), existing, summary.warnings)
      if (!done) {
        summary.slots.push(
          `${round} ${visit.start}–${visit.end} — ${existing ? 'kept as it was' : 'not added'} (no available carer)`,
        )
        continue
      }
      const { slot, carers } = done
      // The same visit keeps its row; another visit in the round gets the next row (MORNING__2, …).
      slot.slotCode = existing?.slotCode ?? codeFor(round)
      slot.medicationRoundCode = round
      built.push(slot)
      const days = slot.daysOfWeek.map((d) => DAY_NAMES[d]).join(',')
      const extra = slot.slotCode !== round ? ' (another visit in this round)' : ''
      summary.slots.push(`${round} ${slot.plannedStartTime}–${slot.plannedEndTime}${extra} ${days} · ${carers.join(', ')}`)
    }
    if (!built.length) {
      summary.plan = 'nothing added — no visit had an available carer'
      return summary
    }

    let plan: Plan | undefined
    if (!working) {
      const domHours = (await api<{ weeklyContractedHours?: string | null }>('GET', `/service-users/${row.id}/dom-care`)).data
        ?.weeklyContractedHours
      // The plan must match the service user's current hours (DOM Care tab); changing them needs a
      // manager-approved request, so the input's value is only used when DOM Care has none.
      const fromInput = String(su.weeklyContractedHours ?? '').trim()
      let weeklyContractedHours = String(domHours ?? '').trim() || fromInput
      if (!weeklyContractedHours) {
        // No hours anywhere: the plan uses the default, and the app copies a new plan's hours to the
        // service user (DOM Care tab), as when a plan is created on the screen.
        weeklyContractedHours = DEFAULT_WEEKLY_CONTRACTED_HOURS
        // Shown on the result with a link to their DOM Care tab, where the hours are changed.
        summary.weeklyHoursDefaulted = DEFAULT_WEEKLY_CONTRACTED_HOURS
      }
      if (fromInput && domHours && Number(fromInput) !== Number(domHours)) {
        summary.warnings.push(
          `Plan uses the service user's current ${domHours}h a week, not ${fromInput}h — change the hours in the app (manager approval)`,
        )
      }
      const numberOfCarers = Math.max(...built.map((s) => Number(s.requiredCarers ?? 1)))
      if (dryRun) {
        summary.plan = `would create a draft plan (${weeklyContractedHours}h a week) with ${built.length} visit(s)`
        log(`  ${summary.plan}`)
      } else {
        plan = (await api<Plan>('POST', `/service-users/${row.id}/visit-plans`, { weeklyContractedHours, numberOfCarers, slots: built }))
          .data!
        summary.plan = `created draft plan (${weeklyContractedHours}h a week)`
        log(`  ${summary.plan}`)
        await previews(row.id, plan, plan.slots.map(existingSlotInput), summary)
      }
    } else {
      plan = working
      // Existing visits are kept — other visits in the same round too; a visit with the same round and
      // times is updated (re-running is safe). Over the service user's weekly hours, the app's own
      // workflow applies (the previews below say so).
      const kept = plan.slots.map(existingSlotInput).filter((s) => !built.some((b) => b.slotCode === s.slotCode))
      const slots = [...kept, ...built]
      // Disabled rows are the plan's unused rounds (every plan has one per round).
      const keptVisits = kept.filter((s) => s.isEnabled !== false).length
      summary.plan = `${plan.status.toLowerCase()} plan: ${keptVisits} other visit(s) kept, ${built.length} added/updated`
      log(`  ${summary.plan}`)
      const { applyScheduleImpact } = await previews(row.id, plan, slots, summary)
      if (!dryRun) {
        const saved = await api<Plan>('PATCH', `/service-users/${row.id}/visit-plans/${working.id}`, {
          amendmentReason: reason,
          weeklyContractedHours: working.weeklyContractedHours ?? null,
          numberOfCarers: working.numberOfCarers ?? Math.max(...slots.map((s) => Number(s.requiredCarers ?? 1))),
          notes: working.notes ?? '',
          slots,
          applyScheduleImpact,
          respectWorkingPatternOnSync: respect,
        })
        for (const w of (saved.meta?.carerHoursWarnings as string[] | undefined) ?? []) summary.warnings.push(w)
        for (const h of (saved.meta?.heldTimeChanges as Array<{ slotLabel: string }> | undefined) ?? []) {
          summary.warnings.push(`${h.slotLabel}: new time waits for a manager (carer over weekly hours)`)
        }
        plan = saved.data!
        log('  plan saved')
      }
    }

    // Tasks and medicines only for visits that were added (one with no available carer was skipped).
    const added = visits.filter((v) =>
      built.some((b) => sameVisit(b, v.round.toUpperCase(), v.start, v.end)),
    )
    for (const v of visits) {
      if (!added.includes(v) && (v.tasks?.length || v.medicines?.length)) {
        summary.warnings.push(`${v.round.toUpperCase()} ${v.start}–${v.end} was not added, so its tasks and medicines were not added either`)
      }
    }

    // 3) Tasks — Visit tasks tab: load, merge, save the whole list.
    const wantedTasks = added.flatMap((v) =>
      // Due at the visit's start unless given: a task shows on the visit whose time window holds it.
      (v.tasks ?? []).map((t) => ({ round: v.round.toUpperCase(), days: parseDays(v.days), ...t, dueTime: t.dueTime ?? v.start })),
    )
    if (wantedTasks.length) await saveTasks(row.id, wantedTasks, taskList, summary)

    // 4) Medicines — Add medication: one per name, one time per round it is given in.
    const wantedMeds = added.flatMap((v) =>
      (v.medicines ?? []).map((m) => ({ round: v.round.toUpperCase(), visitStart: v.start, ...m })),
    )
    if (wantedMeds.length) await saveMedicines(row.id, wantedMeds, lookups, summary)

    // No tasks / medicines in the input: the service user's own (already set up per round) apply to
    // these visits, as they do to visits added by hand — report them, never invent any.
    const builtRounds = [...new Set(built.map(roundOf))]
    if (!wantedTasks.length) await reportExistingTasks(row.id, builtRounds, summary)
    if (!wantedMeds.length) await reportExistingMedicines(row.id, builtRounds, lookups, summary)

    if (dryRun || !plan) return summary

    // You choose after the run whether to make the rota: until then a new plan stays a draft (an active
    // plan is what the nightly rolling rota builds) and nothing is generated.
    if (!generateRota) {
      pendingRota.push({ summary, serviceUserId: row.id, plan })
      summary.rotaPending = true
      log(plan.status === 'DRAFT' ? '  plan saved as a draft — the rota waits for your choice' : '  plan saved — the rota waits for your choice')
      return summary
    }
    return activateAndGenerate(summary, row.id, plan)
  }

  /** Activate a draft, generate the rota for the run's dates, read it back — as on the visit plan screen. */
  async function activateAndGenerate(summary: Summary, serviceUserId: string, plan: Plan): Promise<Summary> {
    // 5) Activate a draft (the screen saves first, then activates).
    if (plan.status === 'DRAFT') {
      const impact = (
        await api<{ otherActivePlans?: unknown[]; scheduleImpact?: { jobsCancelled?: number } }>(
          'GET',
          `/service-users/${serviceUserId}/visit-plans/${plan.id}/activate-impact-preview`,
        )
      ).data
      // The Activate dialog's default: with another active plan, its future visits are cancelled.
      const hasOtherActive = (impact?.otherActivePlans?.length ?? 0) > 0
      if (hasOtherActive) {
        summary.warnings.push(
          `Activating replaced another active plan: ${impact?.scheduleImpact?.jobsCancelled ?? 0} of its visits cancelled`,
        )
      }
      const activated = await api<Plan>('POST', `/service-users/${serviceUserId}/visit-plans/${plan.id}/activate`, {
        cancelEndedPlanJobs: hasOtherActive,
      })
      for (const w of (activated.message ?? '').split('Warning: ').slice(1)) summary.warnings.push(w.trim())
      plan = activated.data!
      log('  plan activated')
    } else if (plan.status === 'SUSPENDED') {
      summary.warnings.push('Plan is suspended — rota not generated (reactivate it in the app first)')
      return summary
    }

    // 6) Generate the rota for the dates (preview first, as the Generate rota dialog does).
    let created = 0
    let skipped = 0
    for (const range of chunks(fromDate, toDate)) {
      const qs = new URLSearchParams(range).toString()
      await api('GET', `/service-users/${serviceUserId}/visit-plans/${plan.id}/generate-schedule-preview?${qs}`)
      const gen = await api<{ visitsCreated: number; visitsSkipped: number; weeklyHoursWarning?: string }>(
        'POST',
        `/service-users/${serviceUserId}/visit-plans/${plan.id}/generate-schedule`,
        { ...range, respectWorkingPatternOnSync: respect },
      )
      created += gen.data?.visitsCreated ?? 0
      skipped += gen.data?.visitsSkipped ?? 0
      if (gen.data?.weeklyHoursWarning) summary.warnings.push(gen.data.weeklyHoursWarning)
    }
    log(`  rota generated ${fromDate} → ${toDate}: ${created} visit(s) created, ${skipped} already there`)
    summary.visitsCreated = created
    // The plan's own dates limit the rota (an app rule, left as it is) — say so rather than report a silent 0.
    const planEnd = plan.effectiveTo?.slice(0, 10)
    const planStart = plan.effectiveFrom?.slice(0, 10)
    if (planEnd && planEnd < fromDate) {
      summary.warnings.push(
        `The visit plan ended on ${planEnd} (its end date), so no rota was generated — change or clear the end date in the Visit plan tab, then run again`,
      )
    } else if (planEnd && planEnd < toDate) {
      summary.warnings.push(`The visit plan ends on ${planEnd}, so the rota stops there`)
    }
    if (planStart && planStart > toDate) {
      summary.warnings.push(`The visit plan starts on ${planStart}, after these rota dates, so no rota was generated yet`)
    }

    // 7) Read the rota back.
    summary.visits = await checkRota(serviceUserId)
    return summary
  }

  /** The service user's existing visit tasks on these rounds (they show on the new visits too). */
  async function reportExistingTasks(serviceUserId: string, rounds: string[], summary: Summary) {
    type Assignment = { priority: string; task: { name: string } }
    const byRound =
      (await api<{ assignmentsByRound: Record<string, Assignment[]> }>('GET', `/service-users/${serviceUserId}/visit-tasks`))
        .data?.assignmentsByRound ?? {}
    for (const round of rounds) {
      for (const a of byRound[round] ?? []) summary.tasks.push(`${round}: ${a.task.name} (${a.priority}) — already set up`)
    }
    if (!rounds.some((r) => byRound[r]?.length)) summary.tasks.push(`None set up for ${rounds.join(', ')} — none added`)
  }

  /** The service user's active medicines due in these rounds (their MAR rows land on the new visits). */
  async function reportExistingMedicines(serviceUserId: string, rounds: string[], lookups: Lookups, summary: Summary) {
    type Med = { medicationName: string; status: string; dose?: string | null; schedules?: Array<{ roundId?: string | null; dueTime?: string | null }> }
    const roundIds = new Set(lookups.rounds.filter((r) => rounds.includes(r.code)).map((r) => r.id))
    const meds =
      (await api<Med[]>('GET', `/service-users/${serviceUserId}/medications?limit=100`)).data?.filter((m) => m.status === 'ACTIVE') ?? []
    const due = meds.filter((m) => (m.schedules ?? []).some((s) => s.roundId && roundIds.has(s.roundId)))
    for (const m of due) summary.medicines.push(`${m.medicationName}${m.dose ? ` ${m.dose}` : ''} — already set up`)
    if (!due.length) summary.medicines.push(`None due in ${rounds.join(', ')} — none added`)
  }

  /** Pending Hours approvals now (ids), to count what a service user's run sent there. Null: not allowed to read. */
  async function pendingApprovalIds(): Promise<Set<string> | null> {
    try {
      // The list is not paged: every pending approval comes back.
      const rows = (await api<Array<{ id: string }>>('GET', '/hours-approvals?status=PENDING')).data ?? []
      return new Set(rows.map((r) => r.id))
    } catch {
      return null
    }
  }

  log(`${dryRun ? 'DRY RUN — previews only, nothing saved. ' : ''}Rota ${fromDate} → ${toDate}: ${how}`)
  log('Carers: only those available (working pattern, no clash, not on leave or blocked); others are swapped for available carers.')
  log('Weekly hours: over the limit, the app’s own rule applies (Settings → Dom Rules) — e.g. the visit waits in Hours approvals.')
  if (input.respectWorkingPatterns === false) log('"respectWorkingPatterns": false is ignored — carers are never put on visits they are unavailable for.')
  const lookups = (await api<Lookups>('GET', '/medication-lookups')).data!
  const taskList = catalogueTasks((await api('GET', '/task-catalogue')).data)
  for (const ref of list(input.carerPool)) {
    try {
      pool.push(await findCarer(ref))
    } catch (e) {
      log(`Selected carer "${ref}" skipped: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  const results: Summary[] = []
  // Name and number once found, so a failure is reported by name rather than by the id the page sent.
  const labelOf = new Map<ServiceUserInput, string>()
  for (const su of input.serviceUsers) {
    // Each service user on its own: one failing does not stop or change the others' results.
    const before = dryRun ? null : await pendingApprovalIds()
    try {
      const summary = await processServiceUser(su, lookups, taskList)
      const after = before ? await pendingApprovalIds() : null
      if (before && after) summary.heldForApproval = [...after].filter((id) => !before.has(id)).length
      results.push(summary)
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      log(`  ✖ ${message}`)
      results.push({ serviceUser: labelOf.get(su) ?? su.serviceUser, plan: '', slots: [], tasks: [], medicines: [], warnings: [], failed: message })
    }
  }
  if (!pendingRota.length) return { results, generateRota: null }

  // The rota step, kept for when you choose "Generate rota" after the run. Runs once.
  let ran = false
  const generatePending = async () => {
    if (ran) return results
    ran = true
    log(`Generating the rota ${fromDate} → ${toDate}…`)
    for (const item of pendingRota) {
      log(`━━ ${item.summary.serviceUser}`)
      const before = await pendingApprovalIds()
      try {
        await activateAndGenerate(item.summary, item.serviceUserId, item.plan)
        const after = before ? await pendingApprovalIds() : null
        if (before && after) {
          item.summary.heldForApproval = (item.summary.heldForApproval ?? 0) + [...after].filter((id) => !before.has(id)).length
        }
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e)
        log(`  ✖ ${message}`)
        item.summary.warnings.push(`Rota not generated: ${message}`)
      }
      item.summary.rotaPending = false
    }
    return results
  }
  return { results, generateRota: generatePending }
}

// ── Scripts page: pickers, the configured automation, and recording each run ───

export type PickerOption = { value: string; label: string }

/** Every active service user the user can see (the list endpoint applies branch access), for the picker. */
export async function fetchServiceUserOptions(): Promise<PickerOption[]> {
  const out: PickerOption[] = []
  for (let page = 1; page <= 50; page += 1) {
    const res = await apiJson<Envelope<ServiceUserRow[]>>(`/service-users?limit=100&page=${page}`, { method: 'GET' })
    for (const s of res.data ?? []) {
      out.push({ value: s.id, label: `${s.firstName} ${s.lastName}${s.serviceUserNumber ? ` (${s.serviceUserNumber})` : ''}` })
    }
    const totalPages = Number((res.meta as { totalPages?: number } | undefined)?.totalPages ?? 1)
    if (!res.data?.length || page >= totalPages) break
  }
  return out.sort((a, b) => a.label.localeCompare(b.label))
}

/** The task list a run checks tasks against (Settings → Tasks planner, active tasks), for the task picker. */
export async function fetchTaskOptions(): Promise<PickerOption[]> {
  const res = await apiJson<Envelope<unknown>>('/task-catalogue', { method: 'GET' })
  return [...catalogueTasks(res.data).values()]
    .map((t) => ({ value: t.name, label: t.name }))
    .sort((a, b) => a.label.localeCompare(b.label))
}

/** Every active employee the user can see (branch access applies), with their role, for the carer picker. */
export async function fetchCarerOptions(): Promise<PickerOption[]> {
  type Row = EmployeeRow & { isActive?: boolean; role?: { name: string } | null; jobTitle?: { name: string } | null }
  const out: PickerOption[] = []
  for (let page = 1; page <= 50; page += 1) {
    const res = await apiJson<Envelope<Row[]>>(`/employees?limit=100&page=${page}`, { method: 'GET' })
    for (const e of res.data ?? []) {
      if (e.isActive === false) continue
      const role = e.jobTitle?.name ?? e.role?.name
      out.push({ value: e.id, label: `${carerName(e)}${role ? ` — ${role}` : ''}` })
    }
    const totalPages = Number((res.meta as { totalPages?: number } | undefined)?.totalPages ?? 1)
    if (!res.data?.length || page >= totalPages) break
  }
  return out.sort((a, b) => a.label.localeCompare(b.label))
}

/** Automatic Visit Creation's input: the automation file configured on the server (as `npm run visits:create`). */
export async function fetchVisitCreationConfig(): Promise<{ source: string; config: CreateVisitsInput }> {
  const res = await apiJson<Envelope<{ source: string; config: CreateVisitsInput }>>('/scripts/visit-creation/config', { method: 'GET' })
  return res.data!
}

/** The dates a run will build: today → the rota horizon (Settings → Dom Rules), or the input's own. */
export async function previewRotaDates(input: Pick<CreateVisitsInput, 'fromDate' | 'toDate'>) {
  return rotaDates({ serviceUsers: [], ...input })
}

export type RunOutcome = 'SUCCESS' | 'PARTIAL' | 'FAILED'

/** Every service user done = SUCCESS, some = PARTIAL, none = FAILED. */
export function runOutcome(results: Summary[]): RunOutcome {
  const failed = results.filter((r) => r.failed).length
  return failed === 0 ? 'SUCCESS' : failed === results.length ? 'FAILED' : 'PARTIAL'
}

/**
 * A run as the Scripts page starts it: the server checks the selections and that no other run is
 * going, records the start in the audit log; then the steps run; then the outcome is recorded.
 */
export async function runVisitCreation(
  input: CreateVisitsInput,
  meta: RunMeta,
  options: RunOptions,
): Promise<{ results: Summary[]; outcome: RunOutcome; generateRota: (() => Promise<Summary[]>) | null }> {
  const started = await apiJson<Envelope<{ runId: string }>>('/scripts/visit-creation/runs', {
    method: 'POST',
    body: JSON.stringify({ mode: meta.mode, dryRun: options.dryRun, serviceUserIds: meta.serviceUserIds, carerIds: meta.carerIds }),
  })
  const runId = started.data!.runId
  let results: Summary[] = []
  let generateRota: (() => Promise<Summary[]>) | null = null
  let outcome: RunOutcome = 'FAILED'
  let error: unknown = null
  try {
    const run = await runCreateVisits(input, options)
    results = run.results
    generateRota = run.generateRota
    outcome = runOutcome(results)
  } catch (e) {
    error = e
  }
  const totals = {
    serviceUsers: results.length,
    failed: results.filter((r) => r.failed).length,
    visitsCreated: results.reduce((n, r) => n + (r.visitsCreated ?? 0), 0),
    visitsWithCarers: results.reduce((n, r) => n + (r.visits?.fullyStaffed ?? 0), 0),
    heldForApproval: results.reduce((n, r) => n + (r.heldForApproval ?? 0), 0),
  }
  await apiJson(`/scripts/visit-creation/runs/${runId}/finish`, {
    method: 'POST',
    body: JSON.stringify({
      outcome,
      summary: {
        totals,
        ...(error ? { error: error instanceof Error ? error.message : String(error) } : {}),
        serviceUsers: results.map((r) => ({ serviceUser: r.serviceUser, plan: r.plan, failed: r.failed ?? null, warnings: r.warnings.length })),
      },
    }),
  }).catch(() => undefined) // the run's own result stands even if recording its end fails
  if (error) throw error
  return { results, outcome, generateRota }
}
