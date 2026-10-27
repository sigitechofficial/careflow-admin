import * as React from 'react'
import { Badge } from '@/shared/ui/badge'
import { cn } from '@/shared/lib/utils'
import { dayKeyFromInstant, formatOpsClockTime } from '@/shared/lib/operational-day.util'

type Person = { id: string; firstName?: string | null; lastName?: string | null; preferredName?: string | null }
type Fmt = { formatDate: (iso: string) => string }

const personName = (p?: Person | null) =>
  !p ? '—' : p.preferredName?.trim() || [p.firstName, p.lastName].filter(Boolean).join(' ').trim() || '—'
const clock = (iso?: string | null) => {
  if (!iso) return ''
  const t = formatOpsClockTime(iso)
  return t === '—' ? '' : t
}
const dayOf = (iso?: string | null) => (iso ? dayKeyFromInstant(iso) || iso.slice(0, 10) : '')
const range = (a?: string | null, b?: string | null) => [clock(a), clock(b)].filter(Boolean).join(' – ') || '—'
const humanize = (code?: string | null) =>
  !code
    ? '—'
    : code
        .replace(/_/g, ' ')
        .toLowerCase()
        .replace(/\b\w/g, (c) => c.toUpperCase())
const hours = (n: number) => (Math.round(n * 100) / 100).toString()

const STATUS_TONE: Record<string, string> = {
  COMPLETED: 'bg-success/10 text-success border-success/30',
  APPROVED: 'bg-success/10 text-success border-success/30',
  IN_PROGRESS: 'bg-sky-500/10 text-sky-800 border-sky-500/30 dark:text-sky-200',
  STARTED: 'bg-sky-500/10 text-sky-800 border-sky-500/30 dark:text-sky-200',
  ALLOCATED: 'bg-primary/10 text-primary border-primary/30',
  CONFIRMED: 'bg-primary/10 text-primary border-primary/30',
  PLANNED: 'bg-muted text-muted-foreground border-border',
  PENDING: 'bg-warning/10 text-warning border-warning/30',
  NEEDS_ATTENTION: 'bg-warning/10 text-warning border-warning/30',
  UNALLOCATED: 'bg-warning/10 text-warning border-warning/30',
  MISSED: 'bg-destructive/10 text-destructive border-destructive/30',
  CANCELLED: 'bg-destructive/10 text-destructive border-destructive/30',
  CALLED_OFF: 'bg-destructive/10 text-destructive border-destructive/30',
  REJECTED: 'bg-destructive/10 text-destructive border-destructive/30',
}

export function StatusBadge({ status }: { status?: string | null }) {
  if (!status) return <span className="text-muted-foreground">—</span>
  return (
    <Badge variant="outline" className={cn('whitespace-nowrap font-medium', STATUS_TONE[status] ?? 'bg-muted')}>
      {humanize(status)}
    </Badge>
  )
}

function Table({ head, children, minWidth = 900 }: { head: string[]; children: React.ReactNode; minWidth?: number }) {
  return (
    <div className="max-h-[70vh] overflow-auto rounded-lg border border-border">
      <table className="w-full text-sm" style={{ minWidth }}>
        <thead className="sticky top-0 z-10 bg-muted text-left text-xs font-medium uppercase tracking-wide text-muted-foreground shadow-[inset_0_-1px_0_hsl(var(--border))]">
          <tr>
            {head.map((h) => (
              <th key={h} className="whitespace-nowrap px-3 py-2.5">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border [&>tr:nth-child(even)]:bg-muted/20 [&>tr]:transition-colors [&>tr:hover]:bg-muted/40">
          {children}
        </tbody>
      </table>
    </div>
  )
}

const td = 'px-3 py-2.5 align-top'

function Summary({ items }: { items: Array<{ label: string; value: React.ReactNode }> }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map((i) => (
        <div key={i.label} className="rounded-lg border border-border bg-card px-4 py-3">
          <p className="text-xs font-medium text-muted-foreground">{i.label}</p>
          <p className="mt-0.5 text-lg font-semibold tabular-nums text-foreground">{i.value}</p>
        </div>
      ))}
    </div>
  )
}

// ── Row shapes returned by /schedule-reports/* ───────────────────────────
type VisitDetailRow = {
  scheduledVisitId: string
  visitName?: string | null
  jobName?: string | null
  serviceUser?: Person & { serviceUserNumber?: string | null }
  scheduledStartDateTime: string
  scheduledEndDateTime?: string | null
  actualStartDateTime?: string | null
  actualEndDateTime?: string | null
  status?: string
  notes?: string | null
  assignedEmployees?: Array<{ employee?: Person | null }>
}
type JobRow = {
  id: string
  jobName?: string | null
  status?: string
  serviceUser?: Person
  scheduledStartDateTime: string
  scheduledEndDateTime?: string | null
  scheduleArea?: { name?: string | null } | null
}
type CarerAllocationRow = {
  employee: Person & { email?: string | null }
  days: Array<{
    date: string
    totalMinutes: number
    jobs: Array<{
      scheduledJobId: string
      jobName?: string | null
      serviceUser?: Person
      scheduledStartDateTime: string
      scheduledEndDateTime?: string | null
      durationMinutes?: number | null
    }>
  }>
}
type SuVisitsRow = {
  serviceUser: Person
  visits: Array<{
    scheduledVisitId: string
    visitName?: string | null
    scheduledStartDateTime: string
    scheduledEndDateTime?: string | null
    status?: string
    assignedCarers?: Person[]
  }>
}
type TimeAnalysisRow = {
  serviceUser: Person
  visitCount: number
  scheduledHours: number
  completedHours: number
  missedCount: number
  cancelledCount: number
}
type CapacityRow = {
  employeeId: string
  employeeName: string
  contractedHours: number | null
  maximumHours: number | null
  weeklyHours: number
} & Record<(typeof WEEKDAYS)[number], number>
type CallOffRow = {
  id: string
  callOffDate: string
  reason?: string | null
  notes?: string | null
  status?: string
  serviceUser?: Person
  scheduledJob?: { jobName?: string | null } | null
  scheduledVisit?: { visitName?: string | null } | null
  requestedBy?: (Person & { email?: string | null }) | null
  approvedBy?: (Person & { email?: string | null }) | null
}

const WEEKDAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const

export type ReportView = {
  /** Inclusive day limit accepted by the API for this report. */
  maxDays: number
  rowsOf: (data: unknown) => unknown[]
  render: (data: Record<string, unknown>, rows: unknown[], fmt: Fmt) => React.ReactNode
  csv: (rows: unknown[], fmt: Fmt) => { header: string[]; lines: Array<Array<string | number | null>> }
}

const arr = (data: unknown, key: string) =>
  ((data as Record<string, unknown> | undefined)?.[key] as unknown[] | undefined) ?? []

/** Views keyed by report type (see /schedule-reports/report-types). */
export const REPORT_VIEWS: Record<string, ReportView> = {
  VISIT_DETAIL: {
    maxDays: 92,
    rowsOf: (d) => arr(d, 'rows'),
    render: (_d, rows, { formatDate }) => (
      <Table head={['Date', 'Visit', 'Service user', 'Carers', 'Planned', 'Actual', 'Status', 'Notes']}>
        {(rows as VisitDetailRow[]).map((r) => (
          <tr key={r.scheduledVisitId}>
            <td className={cn(td, 'whitespace-nowrap')}>{formatDate(dayOf(r.scheduledStartDateTime))}</td>
            <td className={td}>{r.visitName || r.jobName || '—'}</td>
            <td className={td}>
              <p className="font-medium">{personName(r.serviceUser)}</p>
              {r.serviceUser?.serviceUserNumber ? (
                <p className="text-xs text-muted-foreground">{r.serviceUser.serviceUserNumber}</p>
              ) : null}
            </td>
            <td className={td}>{(r.assignedEmployees ?? []).map((a) => personName(a.employee)).join(', ') || '—'}</td>
            <td className={cn(td, 'whitespace-nowrap tabular-nums')}>
              {range(r.scheduledStartDateTime, r.scheduledEndDateTime)}
            </td>
            <td className={cn(td, 'whitespace-nowrap tabular-nums')}>
              {range(r.actualStartDateTime, r.actualEndDateTime)}
            </td>
            <td className={td}>
              <StatusBadge status={r.status} />
            </td>
            <td className={cn(td, 'max-w-[16rem] text-xs text-muted-foreground')}>{r.notes || '—'}</td>
          </tr>
        ))}
      </Table>
    ),
    csv: (rows) => ({
      header: ['Date', 'Visit', 'Service user', 'Service user no.', 'Carers', 'Planned start', 'Planned end', 'Actual start', 'Actual end', 'Status', 'Notes'],
      lines: (rows as VisitDetailRow[]).map((r) => [
        dayOf(r.scheduledStartDateTime),
        r.visitName || r.jobName || '',
        personName(r.serviceUser),
        r.serviceUser?.serviceUserNumber ?? '',
        (r.assignedEmployees ?? []).map((a) => personName(a.employee)).join('; '),
        clock(r.scheduledStartDateTime),
        clock(r.scheduledEndDateTime),
        clock(r.actualStartDateTime),
        clock(r.actualEndDateTime),
        humanize(r.status),
        r.notes ?? '',
      ]),
    }),
  },

  SCHEDULED_JOBS_STATUS: {
    maxDays: 92,
    rowsOf: (d) => arr(d, 'jobs'),
    render: (d, rows, { formatDate }) => {
      const counts = (d.countsByStatus as Record<string, number> | undefined) ?? {}
      return (
        <div className="space-y-4">
          {Object.keys(counts).length ? (
            <div className="flex flex-wrap gap-2">
              {Object.entries(counts).map(([status, n]) => (
                <span
                  key={status}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm',
                    STATUS_TONE[status] ?? 'bg-muted',
                  )}
                >
                  {humanize(status)}
                  <span className="font-semibold tabular-nums">{n}</span>
                </span>
              ))}
            </div>
          ) : null}
          <Table head={['Date', 'Time', 'Job', 'Service user', 'Area', 'Status']} minWidth={760}>
            {(rows as JobRow[]).map((r) => (
              <tr key={r.id}>
                <td className={cn(td, 'whitespace-nowrap')}>{formatDate(dayOf(r.scheduledStartDateTime))}</td>
                <td className={cn(td, 'whitespace-nowrap tabular-nums')}>
                  {range(r.scheduledStartDateTime, r.scheduledEndDateTime)}
                </td>
                <td className={td}>{r.jobName || '—'}</td>
                <td className={td}>{personName(r.serviceUser)}</td>
                <td className={cn(td, 'text-muted-foreground')}>{r.scheduleArea?.name || '—'}</td>
                <td className={td}>
                  <StatusBadge status={r.status} />
                </td>
              </tr>
            ))}
          </Table>
        </div>
      )
    },
    csv: (rows) => ({
      header: ['Date', 'Start', 'End', 'Job', 'Service user', 'Area', 'Status'],
      lines: (rows as JobRow[]).map((r) => [
        dayOf(r.scheduledStartDateTime),
        clock(r.scheduledStartDateTime),
        clock(r.scheduledEndDateTime),
        r.jobName ?? '',
        personName(r.serviceUser),
        r.scheduleArea?.name ?? '',
        humanize(r.status),
      ]),
    }),
  },

  DAILY_CARER_ALLOCATION: {
    maxDays: 92,
    rowsOf: (d) => arr(d, 'employees'),
    render: (_d, rows, { formatDate }) => (
      <div className="space-y-4">
        {(rows as CarerAllocationRow[]).map((r) => {
          const totalMinutes = r.days.reduce((n, day) => n + day.totalMinutes, 0)
          const visits = r.days.reduce((n, day) => n + day.jobs.length, 0)
          return (
            <section key={r.employee.id} className="overflow-hidden rounded-lg border border-border">
              <header className="flex flex-wrap items-center justify-between gap-2 bg-muted/40 px-4 py-2.5">
                <p className="text-sm font-semibold">{personName(r.employee)}</p>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {visits} visit{visits === 1 ? '' : 's'} · {hours(totalMinutes / 60)} h · {r.days.length} day
                  {r.days.length === 1 ? '' : 's'}
                </p>
              </header>
              <table className="w-full text-sm">
                <tbody className="divide-y divide-border [&>tr]:transition-colors [&>tr:hover]:bg-muted/30">
                  {r.days.map((day) => (
                    <tr key={day.date}>
                      <td className={cn(td, 'w-40 whitespace-nowrap font-medium')}>{formatDate(day.date)}</td>
                      <td className={td}>
                        <ul className="space-y-0.5">
                          {day.jobs.map((j) => (
                            <li key={j.scheduledJobId} className="flex flex-wrap gap-x-2">
                              <span className="tabular-nums text-muted-foreground">
                                {range(j.scheduledStartDateTime, j.scheduledEndDateTime)}
                              </span>
                              <span>{personName(j.serviceUser)}</span>
                            </li>
                          ))}
                        </ul>
                      </td>
                      <td className={cn(td, 'w-24 whitespace-nowrap text-right tabular-nums')}>
                        {hours(day.totalMinutes / 60)} h
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )
        })}
      </div>
    ),
    csv: (rows) => ({
      header: ['Carer', 'Date', 'Start', 'End', 'Service user', 'Job', 'Minutes'],
      lines: (rows as CarerAllocationRow[]).flatMap((r) =>
        r.days.flatMap((day) =>
          day.jobs.map((j) => [
            personName(r.employee),
            day.date,
            clock(j.scheduledStartDateTime),
            clock(j.scheduledEndDateTime),
            personName(j.serviceUser),
            j.jobName ?? '',
            j.durationMinutes ?? '',
          ]),
        ),
      ),
    }),
  },

  SERVICE_USER_VISIT: {
    maxDays: 92,
    rowsOf: (d) => arr(d, 'serviceUsers'),
    render: (_d, rows, { formatDate }) => (
      <div className="space-y-4">
        {(rows as SuVisitsRow[]).map((r) => (
          <section key={r.serviceUser.id} className="overflow-hidden rounded-lg border border-border">
            <header className="flex flex-wrap items-center justify-between gap-2 bg-muted/40 px-4 py-2.5">
              <p className="text-sm font-semibold">{personName(r.serviceUser)}</p>
              <p className="text-xs text-muted-foreground tabular-nums">
                {r.visits.length} visit{r.visits.length === 1 ? '' : 's'}
              </p>
            </header>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-border [&>tr]:transition-colors [&>tr:hover]:bg-muted/30">
                {r.visits.map((v) => (
                  <tr key={v.scheduledVisitId}>
                    <td className={cn(td, 'w-40 whitespace-nowrap')}>{formatDate(dayOf(v.scheduledStartDateTime))}</td>
                    <td className={cn(td, 'w-32')}>{v.visitName || '—'}</td>
                    <td className={cn(td, 'w-36 whitespace-nowrap tabular-nums')}>
                      {range(v.scheduledStartDateTime, v.scheduledEndDateTime)}
                    </td>
                    <td className={td}>{(v.assignedCarers ?? []).map(personName).join(', ') || 'Unallocated'}</td>
                    <td className={cn(td, 'w-36')}>
                      <StatusBadge status={v.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))}
      </div>
    ),
    csv: (rows) => ({
      header: ['Service user', 'Date', 'Visit', 'Start', 'End', 'Carers', 'Status'],
      lines: (rows as SuVisitsRow[]).flatMap((r) =>
        r.visits.map((v) => [
          personName(r.serviceUser),
          dayOf(v.scheduledStartDateTime),
          v.visitName ?? '',
          clock(v.scheduledStartDateTime),
          clock(v.scheduledEndDateTime),
          (v.assignedCarers ?? []).map(personName).join('; '),
          humanize(v.status),
        ]),
      ),
    }),
  },

  SERVICE_USER_TIME_ANALYSIS: {
    maxDays: 92,
    rowsOf: (d) => arr(d, 'rows'),
    render: (_d, rows) => {
      const list = rows as TimeAnalysisRow[]
      const total = list.reduce(
        (t, r) => ({
          visits: t.visits + r.visitCount,
          scheduled: t.scheduled + r.scheduledHours,
          completed: t.completed + r.completedHours,
          missed: t.missed + r.missedCount,
          cancelled: t.cancelled + r.cancelledCount,
        }),
        { visits: 0, scheduled: 0, completed: 0, missed: 0, cancelled: 0 },
      )
      return (
        <div className="space-y-4">
          <Summary
            items={[
              { label: 'Visits', value: total.visits },
              { label: 'Scheduled hours', value: hours(total.scheduled) },
              { label: 'Completed hours', value: hours(total.completed) },
              { label: 'Missed / cancelled', value: `${total.missed} / ${total.cancelled}` },
            ]}
          />
          <Table head={['Service user', 'Visits', 'Scheduled h', 'Completed h', 'Completed %', 'Missed', 'Cancelled']} minWidth={720}>
            {list.map((r) => (
              <tr key={r.serviceUser.id}>
                <td className={cn(td, 'font-medium')}>{personName(r.serviceUser)}</td>
                <td className={cn(td, 'tabular-nums')}>{r.visitCount}</td>
                <td className={cn(td, 'tabular-nums')}>{hours(r.scheduledHours)}</td>
                <td className={cn(td, 'tabular-nums')}>{hours(r.completedHours)}</td>
                <td className={cn(td, 'tabular-nums')}>
                  {r.scheduledHours ? `${Math.round((r.completedHours / r.scheduledHours) * 100)}%` : '—'}
                </td>
                <td className={cn(td, 'tabular-nums', r.missedCount > 0 && 'font-medium text-destructive')}>
                  {r.missedCount}
                </td>
                <td className={cn(td, 'tabular-nums')}>{r.cancelledCount}</td>
              </tr>
            ))}
          </Table>
        </div>
      )
    },
    csv: (rows) => ({
      header: ['Service user', 'Visits', 'Scheduled hours', 'Completed hours', 'Missed', 'Cancelled'],
      lines: (rows as TimeAnalysisRow[]).map((r) => [
        personName(r.serviceUser),
        r.visitCount,
        r.scheduledHours,
        r.completedHours,
        r.missedCount,
        r.cancelledCount,
      ]),
    }),
  },

  EMPLOYEE_CAPACITY: {
    maxDays: 30,
    rowsOf: (d) => arr(d, 'rows'),
    render: (_d, rows) => (
      <Table
        head={['Employee', 'Contracted h/wk', 'Max h/wk', 'Scheduled h', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']}
        minWidth={980}
      >
        {(rows as CapacityRow[]).map((r) => {
          const over = r.maximumHours != null && r.weeklyHours > r.maximumHours
          const underContract = r.contractedHours != null && r.weeklyHours < r.contractedHours
          return (
            <tr key={r.employeeId}>
              <td className={cn(td, 'font-medium')}>{r.employeeName}</td>
              <td className={cn(td, 'tabular-nums')}>{r.contractedHours ?? '—'}</td>
              <td className={cn(td, 'tabular-nums')}>{r.maximumHours ?? '—'}</td>
              <td
                className={cn(
                  td,
                  'tabular-nums font-medium',
                  over ? 'text-destructive' : underContract ? 'text-warning' : 'text-foreground',
                )}
                title={over ? 'Above maximum hours' : underContract ? 'Below contracted hours' : undefined}
              >
                {hours(r.weeklyHours)}
              </td>
              {WEEKDAYS.map((d) => (
                <td key={d} className={cn(td, 'tabular-nums', !r[d] && 'text-muted-foreground')}>
                  {hours(r[d] ?? 0)}
                </td>
              ))}
            </tr>
          )
        })}
      </Table>
    ),
    csv: (rows) => ({
      header: ['Employee', 'Contracted hours/week', 'Maximum hours/week', 'Scheduled hours', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      lines: (rows as CapacityRow[]).map((r) => [
        r.employeeName,
        r.contractedHours,
        r.maximumHours,
        r.weeklyHours,
        ...WEEKDAYS.map((d) => r[d] ?? 0),
      ]),
    }),
  },

  CALL_OFF_VISIT: {
    maxDays: 92,
    rowsOf: (d) => arr(d, 'rows'),
    render: (_d, rows, { formatDate }) => (
      <Table head={['Date', 'Service user', 'Visit', 'Reason', 'Requested by', 'Approved by', 'Status']} minWidth={900}>
        {(rows as CallOffRow[]).map((r) => (
          <tr key={r.id}>
            <td className={cn(td, 'whitespace-nowrap')}>{formatDate(r.callOffDate)}</td>
            <td className={cn(td, 'font-medium')}>{personName(r.serviceUser)}</td>
            <td className={td}>{r.scheduledVisit?.visitName || r.scheduledJob?.jobName || '—'}</td>
            <td className={td}>
              <p>{humanize(r.reason)}</p>
              {r.notes ? <p className="text-xs text-muted-foreground">{r.notes}</p> : null}
            </td>
            <td className={td}>{r.requestedBy ? personName(r.requestedBy) : '—'}</td>
            <td className={td}>{r.approvedBy ? personName(r.approvedBy) : '—'}</td>
            <td className={td}>
              <StatusBadge status={r.status} />
            </td>
          </tr>
        ))}
      </Table>
    ),
    csv: (rows) => ({
      header: ['Date', 'Service user', 'Visit', 'Reason', 'Notes', 'Requested by', 'Approved by', 'Status'],
      lines: (rows as CallOffRow[]).map((r) => [
        r.callOffDate,
        personName(r.serviceUser),
        r.scheduledVisit?.visitName || r.scheduledJob?.jobName || '',
        humanize(r.reason),
        r.notes ?? '',
        r.requestedBy ? personName(r.requestedBy) : '',
        r.approvedBy ? personName(r.approvedBy) : '',
        humanize(r.status),
      ]),
    }),
  },
}

function csvEscape(value: string | number | null | undefined): string {
  const s = value == null ? '' : String(value)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function toCsv(table: { header: string[]; lines: Array<Array<string | number | null>> }): string {
  return [table.header, ...table.lines].map((line) => line.map(csvEscape).join(',')).join('\n')
}
