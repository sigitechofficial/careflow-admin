/**
 * Scripts → Visit Completion. Completes a carer's visits on a day the way the office does it with
 * Record visit (Schedule jobs): tick the visit's tasks, record the actual times (and the reason the
 * dialog asks for when a visit is late or runs over), complete. The app then prices each visit on
 * its own — pay, charge, and travel time and mileage from the carer's previous visit — and this
 * reads those figures back. Nothing is written straight to the database.
 */
import { ApiError, apiJson } from '@/shared/api/api-client'
import { getSyncedOperationalTimeZone } from '@/shared/lib/operational-day.util'
import {
  mapVisitJobTaskForSave,
  type VisitJobTaskRow,
  type VisitJobTasksResponse,
} from '@/features/scheduling/types/visit-job-tasks.types'

type Envelope<T> = { data?: T; meta?: Record<string, unknown>; message?: string }

/** Waits after the API's rate limit (429) turns a request away (nothing was saved), before sending it again. */
const RATE_LIMIT_WAITS_MS = [5_000, 10_000, 20_000, 30_000]

async function api<T = unknown>(method: 'GET' | 'POST' | 'PATCH', path: string, body?: unknown) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await apiJson<Envelope<T>>(
        path,
        { method, ...(body === undefined ? {} : { body: JSON.stringify(body) }) },
        { timeoutMs: 120_000 },
      )
    } catch (e) {
      const wait = RATE_LIMIT_WAITS_MS[attempt]
      if (!(e instanceof ApiError) || e.status !== 429 || wait === undefined) throw e
      await new Promise((resolve) => setTimeout(resolve, wait))
    }
  }
}

// ── The carer's visits on a day ──────────────────────────────────────────────

/** Allocation statuses the app counts as a carer being on the visit. */
const ACTIVE_ALLOCATION = new Set(['PENDING_CONFIRMATION', 'ALLOCATED', 'CONFIRMED'])
const DONE_STATUSES = new Set(['COMPLETED', 'CANCELLED', 'CALLED_OFF', 'MISSED'])

type DayJobAllocation = { id: string; employeeId: string; status: string; isLeadCarer?: boolean }
type DayJob = {
  id: string
  jobName: string
  status: string
  requiredCarers: number | null
  scheduledStartDateTime: string
  scheduledEndDateTime: string | null
  durationMinutes?: number | null
  serviceUser?: { firstName?: string | null; lastName?: string | null; preferredName?: string | null } | null
  allocations?: DayJobAllocation[]
}

export type CarerVisit = {
  jobId: string
  jobName: string
  serviceUserName: string
  plannedStart: string
  plannedEnd: string
  status: string
  /** The planned end has passed. */
  ended: boolean
  /** Null when it can be completed; otherwise why not. */
  blockedReason: string | null
  /** Active carers on the visit (allocation id + carer), for per-carer times on double-ups. */
  allocations: Array<{ id: string; employeeId: string }>
  requiredCarers: number
}

function personName(p: DayJob['serviceUser']): string {
  if (!p) return 'Service user'
  return (p.preferredName?.trim() || `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim()) || 'Service user'
}

/** The carer's visits on the day, in time order, with whether each can be completed. */
export async function fetchCarerVisits(employeeId: string, date: string): Promise<CarerVisit[]> {
  const jobs: DayJob[] = []
  for (let page = 1; page <= 20; page += 1) {
    const res = await api<{ jobs: DayJob[] }>('GET', `/scheduled-jobs-housekeeping/day-jobs?date=${date}&limit=200&page=${page}`)
    const rows = res.data?.jobs ?? []
    jobs.push(...rows)
    const totalPages = Number((res.meta as { totalPages?: number } | undefined)?.totalPages ?? 1)
    if (rows.length < 200 || page >= totalPages) break
  }
  const now = Date.now()
  return jobs
    .filter((j) => (j.allocations ?? []).some((a) => a.employeeId === employeeId && ACTIVE_ALLOCATION.has(a.status)))
    .map((j) => {
      const active = (j.allocations ?? []).filter((a) => ACTIVE_ALLOCATION.has(a.status))
      const required = Math.max(1, j.requiredCarers ?? 1)
      const plannedEnd =
        j.scheduledEndDateTime ??
        new Date(new Date(j.scheduledStartDateTime).getTime() + (j.durationMinutes ?? 30) * 60_000).toISOString()
      let blockedReason: string | null = null
      if (DONE_STATUSES.has(j.status)) blockedReason = `already ${j.status.toLowerCase().replace(/_/g, ' ')}`
      else if (active.length < required) blockedReason = `needs ${required} carers, ${active.length} assigned — assign carers first`
      return {
        jobId: j.id,
        jobName: j.jobName,
        serviceUserName: personName(j.serviceUser),
        plannedStart: j.scheduledStartDateTime,
        plannedEnd,
        status: j.status,
        ended: new Date(plannedEnd).getTime() <= now,
        blockedReason,
        allocations: active.map((a) => ({ id: a.id, employeeId: a.employeeId })),
        requiredCarers: required,
      }
    })
    .sort((a, b) => a.plannedStart.localeCompare(b.plannedStart))
}

// ── Completing ───────────────────────────────────────────────────────────────

/** How the visits went: as planned, 15 minutes late (same length), or 15 minutes longer than planned. */
export type CompletionScenario = 'AS_PLANNED' | 'LATE_START' | 'OVERRUN'
export const SCENARIO_LABELS: Record<CompletionScenario, string> = {
  AS_PLANNED: 'As planned (actual times = planned)',
  LATE_START: 'Started 15 min late (same length)',
  OVERRUN: 'Ran 15 min over',
}
const SCENARIO_MINUTES = 15

/** date: the day (yyyy-mm-dd, organisation time zone) the visits are on. */
export type CompleteVisitsInput = { employeeId: string; date: string; visits: CarerVisit[]; scenario: CompletionScenario }

export type VisitCompletionResult = {
  jobId: string
  label: string
  planned: string
  actual: string
  /** What happened, or why the visit was not completed. */
  outcome: string
  completed: boolean
  tasksDone: string[]
  tasksLeft: string[]
  pay?: VisitPay
}

/** What the app worked out for the visit once completed (its visit reconciliation). */
export type VisitPay = {
  status: string
  payable: string
  billable: string
  payAmount: number | null
  chargeAmount: number | null
  currency: string
  travelMinutes: number | null
  travelMiles: number | null
  mileageAmount: number | null
  mileageExplanation: string | null
  travelAmount: number | null
  travelExplanation: string | null
  fromPreviousVisit: string | null
  exceptions: string[]
}

export type CompleteVisitsRunOptions = { dryRun: boolean; log: (line: string) => void }

/** HH:mm in the organisation's time zone (Settings), as the rota board shows times. */
const hm = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: getSyncedOperationalTimeZone() })
const addMinutes = (iso: string, minutes: number) => new Date(new Date(iso).getTime() + minutes * 60_000).toISOString()
const amount = (v: unknown): number | null => (v == null || v === '' || Number.isNaN(Number(v)) ? null : Number(v))

export function actualTimes(v: Pick<CarerVisit, 'plannedStart' | 'plannedEnd'>, scenario: CompletionScenario) {
  if (scenario === 'LATE_START') {
    return { start: addMinutes(v.plannedStart, SCENARIO_MINUTES), end: addMinutes(v.plannedEnd, SCENARIO_MINUTES) }
  }
  if (scenario === 'OVERRUN') return { start: v.plannedStart, end: addMinutes(v.plannedEnd, SCENARIO_MINUTES) }
  return { start: v.plannedStart, end: v.plannedEnd }
}

/**
 * The visit's tasks as Record visit saves them: tick-only tasks ticked, note tasks ticked with
 * "Completed as planned". Tasks that need a recorded reading (blood pressure, glucose, …) are left —
 * a made-up reading would become a clinical observation.
 */
export function tasksAsDone(tasks: VisitJobTaskRow[]) {
  const done: string[] = []
  const left: string[] = []
  const rows = tasks.map((t) => {
    if (t.isCompleted) {
      done.push(`${t.name} (already done)`)
      return t
    }
    const mode = t.completionInput?.inputMode ?? 'tick'
    if (mode === 'tick') {
      done.push(t.name)
      return { ...t, isCompleted: true, outcome: 'completed' as const }
    }
    if (mode === 'note') {
      done.push(`${t.name} (note: Completed as planned)`)
      return { ...t, isCompleted: true, outcome: 'completed' as const, notes: 'Completed as planned' }
    }
    left.push(`${t.name} — needs ${t.completionInput?.valueLabel?.toLowerCase() || 'a recorded value'}; record it on the visit`)
    return t
  })
  return { rows, done, left }
}

/**
 * Completes the visits in time order (each visit's travel is worked out from the one before it),
 * then reads back pay, charge, travel and mileage. Visits already done, or short of carers, are skipped.
 */
export async function runCompleteVisits(input: CompleteVisitsInput, { dryRun, log }: CompleteVisitsRunOptions) {
  const results: VisitCompletionResult[] = []
  const visits = [...input.visits].sort((a, b) => a.plannedStart.localeCompare(b.plannedStart))
  log(`${dryRun ? 'CHECK — nothing saved. ' : ''}${visits.length} visit(s), ${SCENARIO_LABELS[input.scenario].toLowerCase()}`)

  for (const v of visits) {
    const label = `${hm(v.plannedStart)} ${v.jobName}`
    const planned = `${hm(v.plannedStart)}–${hm(v.plannedEnd)}`
    log(`━━ ${label}`)
    if (v.blockedReason) {
      log(`  skipped: ${v.blockedReason}`)
      results.push({ jobId: v.jobId, label, planned, actual: '—', outcome: `Skipped: ${v.blockedReason}`, completed: false, tasksDone: [], tasksLeft: [] })
      continue
    }
    const times = actualTimes(v, input.scenario)
    const actual = `${hm(times.start)}–${hm(times.end)}`
    try {
      // 1) Tasks — as Record visit does: load, tick, save the whole list.
      const taskData = (await api<VisitJobTasksResponse>('GET', `/scheduled-jobs-housekeeping/jobs/${v.jobId}/visit-tasks`)).data
      const tasks = taskData?.tasks ?? []
      const { rows, done, left } = tasksAsDone(tasks)
      if (!dryRun && taskData?.medicationRoundCode && tasks.length) {
        await api('PATCH', `/scheduled-jobs-housekeeping/jobs/${v.jobId}/visit-tasks`, { tasks: rows.map(mapVisitJobTaskForSave) })
        log(`  tasks saved: ${done.length} done${left.length ? `, ${left.length} left for you` : ''}`)
      }

      // 2) Complete — actual times (each carer's on a double-up), and the reasons the dialog asks for.
      const multiCarer = v.requiredCarers > 1 || v.allocations.length > 1
      const body: Record<string, unknown> = {
        status: 'COMPLETED',
        notes: `Reason (Completed): Recorded from Scripts → Visit Completion — ${SCENARIO_LABELS[input.scenario].toLowerCase()}`,
        actualStartDateTime: times.start,
        actualEndDateTime: times.end,
        careNotDelivered: false,
        ...(multiCarer
          ? { carerActuals: v.allocations.map((a) => ({ allocationId: a.id, actualStartDateTime: times.start, actualEndDateTime: times.end })) }
          : {}),
        ...(input.scenario === 'LATE_START'
          ? { timingExceptionReasonCode: 'TRAFFIC_OR_ROAD_CLOSURE', timingExceptionNotes: 'Started late (traffic)' }
          : {}),
        ...(input.scenario === 'OVERRUN'
          ? {
              overrunReason: 'Client needed more time',
              timingExceptionReasonCode: 'CLIENT_REQUEST_OR_NEED',
              timingExceptionNotes: 'Client needed more time',
            }
          : {}),
      }
      if (!dryRun) {
        await api('PATCH', `/scheduled-jobs-housekeeping/jobs/${v.jobId}/complete`, body)
        log(`  completed ${actual}`)
      } else {
        log(`  would complete ${actual}; tasks: ${done.length} done${left.length ? `, ${left.length} left` : ''}`)
      }
      results.push({
        jobId: v.jobId,
        label,
        planned,
        actual,
        outcome: dryRun ? 'Would be completed' : 'Completed',
        completed: !dryRun,
        tasksDone: done,
        tasksLeft: left,
      })
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      log(`  ✖ ${message}`)
      results.push({ jobId: v.jobId, label, planned, actual, outcome: `Not completed: ${message}`, completed: false, tasksDone: [], tasksLeft: [] })
    }
  }

  // 3) Pay, charge, travel and mileage — as the app priced each completed visit.
  if (!dryRun && results.some((r) => r.completed)) {
    log('Reading pay, charge, travel and mileage…')
    const list =
      (
        await api<Array<{ id: string; scheduledJobId: string; employeeId: string | null }>>(
          'GET',
          `/billing/visit-reconciliations?employeeId=${input.employeeId}&dateFrom=${input.date}&dateTo=${input.date}&limit=100`,
        )
      ).data ?? []
    for (const r of results.filter((x) => x.completed)) {
      const recon = list.find((x) => x.scheduledJobId === r.jobId && x.employeeId === input.employeeId)
      if (!recon) {
        r.outcome += ' — pay record not found yet (see Billing → Visit reconciliations)'
        continue
      }
      type Detail = {
        status: string
        approvedPayable: string
        approvedBillable: string
        payableAmount: unknown
        billableAmount: unknown
        currency: string
        travelMiles: number | null
        travelMinutes: number | null
        exceptions?: Array<{ code?: string; message?: string } | string> | null
        travelPay?: {
          mileage: { amount: number; explanation: string } | null
          travel: { amount: number; explanation: string } | null
        } | null
        previousVisit?: { serviceUserName: string; startDateTime: string } | null
      }
      const d = (await api<Detail>('GET', `/billing/visit-reconciliations/${recon.id}`)).data
      if (!d) continue
      r.pay = {
        status: d.status,
        payable: d.approvedPayable,
        billable: d.approvedBillable,
        payAmount: amount(d.payableAmount),
        chargeAmount: amount(d.billableAmount),
        currency: d.currency || 'GBP',
        travelMinutes: d.travelMinutes,
        travelMiles: d.travelMiles,
        mileageAmount: d.travelPay?.mileage?.amount ?? null,
        mileageExplanation: d.travelPay?.mileage?.explanation ?? null,
        travelAmount: d.travelPay?.travel?.amount ?? null,
        travelExplanation: d.travelPay?.travel?.explanation ?? null,
        fromPreviousVisit: d.previousVisit ? `${d.previousVisit.serviceUserName} at ${hm(d.previousVisit.startDateTime)}` : null,
        exceptions: (d.exceptions ?? []).map((x) => (typeof x === 'string' ? x : x.message || x.code || '')).filter(Boolean),
      }
      log(`  ${r.label}: pay ${r.pay.payAmount ?? '—'} · charge ${r.pay.chargeAmount ?? '—'} · travel ${r.pay.travelMinutes ?? 0} min, ${r.pay.travelMiles ?? 0} mi`)
    }
  }
  return results
}
