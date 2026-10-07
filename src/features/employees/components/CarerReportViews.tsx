import * as React from 'react'
import { Badge } from '@/shared/ui/badge'
import { cn } from '@/shared/lib/utils'

type Fmt = { formatDate: (iso: string) => string }
type Emp = {
  id: string
  name: string
  employeeNumber: string | null
  branch: string | null
  role: string | null
  jobTitle: string | null
  isActive: boolean
}
type Cell = string | number | null
type CsvTable = { header: string[]; lines: Cell[][] }

export type CarerReportFilter = 'range' | 'within' | 'none'

export type CarerReportDef = {
  slug: string
  label: string
  description: string
  filter: CarerReportFilter
  /** Default range length (days) when filter is 'range'. */
  defaultDays?: number
  /** Leaving / holiday reports include carers who are no longer active by default. */
  defaultStatus: 'active' | 'all'
  render: (data: Record<string, unknown>, rows: unknown[], fmt: Fmt) => React.ReactNode
  csv: (rows: unknown[]) => CsvTable
}

const td = 'px-3 py-2.5 align-top'
const dash = (v: unknown) => (v === null || v === undefined || v === '' ? '—' : String(v))
const humanize = (code?: string | null) =>
  !code
    ? '—'
    : code
        .replace(/_/g, ' ')
        .toLowerCase()
        .replace(/\b\w/g, (c) => c.toUpperCase())

function Table({ head, children, minWidth = 900 }: { head: string[]; children: React.ReactNode; minWidth?: number }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm" style={{ minWidth }}>
        <thead className="bg-muted/50 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <tr>
            {head.map((h) => (
              <th key={h} className="whitespace-nowrap px-3 py-2.5">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">{children}</tbody>
      </table>
    </div>
  )
}

function Summary({ items }: { items: Array<{ label: string; value: React.ReactNode; tone?: 'danger' | 'warn' }> }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {items.map((i) => (
        <div key={i.label} className="rounded-lg border border-border bg-card px-4 py-3">
          <p className="text-xs font-medium text-muted-foreground">{i.label}</p>
          <p
            className={cn(
              'mt-0.5 text-lg font-semibold tabular-nums',
              i.tone === 'danger' ? 'text-destructive' : i.tone === 'warn' ? 'text-warning' : 'text-foreground',
            )}
          >
            {i.value}
          </p>
        </div>
      ))}
    </div>
  )
}

function CarerCell({ e }: { e: Emp }) {
  return (
    <div>
      <p className="font-medium text-foreground">{e.name}</p>
      <p className="text-xs text-muted-foreground">
        {[e.employeeNumber, e.isActive ? null : 'Inactive'].filter(Boolean).join(' · ') || ' '}
      </p>
    </div>
  )
}

const TONE: Record<string, string> = {
  EXPIRED: 'bg-destructive/10 text-destructive border-destructive/30',
  MISSING: 'bg-destructive/10 text-destructive border-destructive/30',
  REJECTED: 'bg-destructive/10 text-destructive border-destructive/30',
  BLOCKED: 'bg-destructive/10 text-destructive border-destructive/30',
  DUE_SOON: 'bg-warning/10 text-warning border-warning/30',
  EXPIRING_SOON: 'bg-warning/10 text-warning border-warning/30',
  ATTENTION: 'bg-warning/10 text-warning border-warning/30',
  REQUIRED: 'bg-warning/10 text-warning border-warning/30',
  COMPLIANT: 'bg-success/10 text-success border-success/30',
  AUTHORISED: 'bg-success/10 text-success border-success/30',
  PENDING: 'bg-warning/10 text-warning border-warning/30',
}

function Pill({ status, label }: { status?: string | null; label?: string }) {
  if (!status && !label) return <span className="text-muted-foreground">—</span>
  return (
    <Badge
      variant="outline"
      className={cn('whitespace-nowrap font-medium', (status && TONE[status.toUpperCase()]) || 'bg-muted')}
    >
      {label ?? humanize(status)}
    </Badge>
  )
}

const empCols = (e: Emp): Cell[] => [e.name, e.employeeNumber, e.branch]

// ── row shapes from /employee-reports/* ────────────────────────────────────
type ActivityRow = {
  employee: Emp
  visits: number
  completed: number
  missed: number
  cancelled: number
  plannedHours: number
  actualHours: number
  lateStarts: number
  tasksCompleted: number
  notesLeft: number
}
type ExpiryRow = { id: string; employee: Emp; kind: string; item: string; expiryDate: string; daysLeft: number; state: string }
type DetailRow = {
  employeeId: string
  employeeName: string
  jobTitle: string | null
  roleName: string | null
  compliancePercent: number | null
  status: string
  blockingIssues: number
  totalIssues: number
  nearestExpiryDate: string | null
  issues: Array<{ item: string; status: string; expiryDate: string | null }>
}
type Bucket = { overdue: number; dueSoon: number }
type AnalysisRow = {
  employee: Emp
  reviews: Bucket
  skills: Bucket
  certifications: Bucket
  compliance: Bucket
  overdue: number
  dueSoon: number
  items: Array<{ item: string; kind: string; date: string; overdue: boolean }>
}
type RoleRow = {
  employee: Emp
  accessLevel: string | null
  workArea: string | null
  contractType: string | null
  grade: string | null
  startDate: string | null
  staffType: string
}
type LeavingRow = { id: string; employee: Emp; startDate: string | null; leavingDate: string; reason: string | null; notes: string | null }
type PersonRow = {
  employee: Emp
  email: string | null
  phone: string | null
  town: string | null
  postcode: string | null
  startDate: string | null
  contractType: string | null
  contractedWeeklyHours: number | null
}
type HolidayRow = {
  id: string
  employee: Emp
  type: string
  from: string
  to: string
  days: number
  sickness: boolean
  status: string
  notes: string | null
}

const bucket = (b: Bucket) =>
  b.overdue || b.dueSoon ? (
    <span className="tabular-nums">
      {b.overdue ? <span className="font-medium text-destructive">{b.overdue} overdue</span> : null}
      {b.overdue && b.dueSoon ? ' · ' : null}
      {b.dueSoon ? <span className="text-warning">{b.dueSoon} due</span> : null}
    </span>
  ) : (
    <span className="text-muted-foreground">—</span>
  )

export const CARER_REPORTS: CarerReportDef[] = [
  {
    slug: 'activity-summary',
    label: 'Carer activity summary',
    description: 'Visits, hours, late starts, tasks completed and notes left by each carer.',
    filter: 'range',
    defaultDays: 30,
    defaultStatus: 'active',
    render: (_d, rows) => {
      const list = rows as ActivityRow[]
      const sum = (k: keyof Omit<ActivityRow, 'employee'>) => list.reduce((n, r) => n + (r[k] as number), 0)
      return (
        <div className="space-y-4">
          <Summary
            items={[
              { label: 'Visits', value: sum('visits') },
              { label: 'Completed', value: sum('completed') },
              { label: 'Missed', value: sum('missed'), tone: sum('missed') ? 'danger' : undefined },
              { label: 'Planned hours', value: Math.round(sum('plannedHours') * 100) / 100 },
              { label: 'Actual hours', value: Math.round(sum('actualHours') * 100) / 100 },
              { label: 'Late starts', value: sum('lateStarts'), tone: sum('lateStarts') ? 'warn' : undefined },
            ]}
          />
          <p className="text-xs text-muted-foreground">Totals are for the carers on this page.</p>
          <Table head={['Carer', 'Branch', 'Visits', 'Completed', 'Missed', 'Cancelled', 'Planned h', 'Actual h', 'Late starts', 'Tasks', 'Notes']} minWidth={1000}>
            {list.map((r) => (
              <tr key={r.employee.id}>
                <td className={td}>
                  <CarerCell e={r.employee} />
                </td>
                <td className={cn(td, 'text-muted-foreground')}>{dash(r.employee.branch)}</td>
                <td className={cn(td, 'tabular-nums')}>{r.visits}</td>
                <td className={cn(td, 'tabular-nums')}>{r.completed}</td>
                <td className={cn(td, 'tabular-nums', r.missed > 0 && 'font-medium text-destructive')}>{r.missed}</td>
                <td className={cn(td, 'tabular-nums')}>{r.cancelled}</td>
                <td className={cn(td, 'tabular-nums')}>{r.plannedHours}</td>
                <td className={cn(td, 'tabular-nums')}>{r.actualHours}</td>
                <td className={cn(td, 'tabular-nums', r.lateStarts > 0 && 'font-medium text-warning')}>{r.lateStarts}</td>
                <td className={cn(td, 'tabular-nums')}>{r.tasksCompleted}</td>
                <td className={cn(td, 'tabular-nums')}>{r.notesLeft}</td>
              </tr>
            ))}
          </Table>
        </div>
      )
    },
    csv: (rows) => ({
      header: ['Carer', 'Employee no.', 'Branch', 'Visits', 'Completed', 'Missed', 'Cancelled', 'Planned hours', 'Actual hours', 'Late starts', 'Tasks completed', 'Notes left'],
      lines: (rows as ActivityRow[]).map((r) => [
        ...empCols(r.employee),
        r.visits,
        r.completed,
        r.missed,
        r.cancelled,
        r.plannedHours,
        r.actualHours,
        r.lateStarts,
        r.tasksCompleted,
        r.notesLeft,
      ]),
    }),
  },
  {
    slug: 'compliance',
    label: 'Compliance report',
    description: 'Skills, certifications and compliance documents that are expired or expiring soon.',
    filter: 'within',
    defaultStatus: 'active',
    render: (d, rows, { formatDate }) => (
      <div className="space-y-4">
        <Summary
          items={[
            { label: 'Expired', value: dash(d.expiredCount), tone: Number(d.expiredCount) ? 'danger' : undefined },
            { label: `Due in ${dash(d.withinDays)} days`, value: dash(d.dueSoonCount), tone: Number(d.dueSoonCount) ? 'warn' : undefined },
          ]}
        />
        <Table head={['Carer', 'Branch', 'Type', 'Item', 'Expiry', 'Status']} minWidth={820}>
          {(rows as ExpiryRow[]).map((r) => (
            <tr key={`${r.kind}-${r.id}`}>
              <td className={td}>
                <CarerCell e={r.employee} />
              </td>
              <td className={cn(td, 'text-muted-foreground')}>{dash(r.employee.branch)}</td>
              <td className={td}>{r.kind}</td>
              <td className={cn(td, 'font-medium')}>{r.item}</td>
              <td className={cn(td, 'whitespace-nowrap')}>{formatDate(r.expiryDate)}</td>
              <td className={td}>
                <Pill
                  status={r.state}
                  label={r.daysLeft < 0 ? `Expired ${-r.daysLeft} d ago` : r.daysLeft === 0 ? 'Expires today' : `${r.daysLeft} d left`}
                />
              </td>
            </tr>
          ))}
        </Table>
      </div>
    ),
    csv: (rows) => ({
      header: ['Carer', 'Employee no.', 'Branch', 'Type', 'Item', 'Expiry date', 'Days left', 'Status'],
      lines: (rows as ExpiryRow[]).map((r) => [...empCols(r.employee), r.kind, r.item, r.expiryDate, r.daysLeft, humanize(r.state)]),
    }),
  },
  {
    slug: 'compliance-detail',
    label: 'Employee compliance detail',
    description: 'Every carer’s compliance status with missing, expired and expiring documents.',
    filter: 'none',
    defaultStatus: 'active',
    render: (d, rows, { formatDate }) => (
      <div className="space-y-4">
        <Summary
          items={[
            { label: 'Fully compliant', value: dash(d.fullyCompliant) },
            { label: 'Need action', value: dash(d.needsAction), tone: Number(d.needsAction) ? 'warn' : undefined },
          ]}
        />
        <Table head={['Carer', 'Role / job title', 'Compliance', 'Status', 'Blocking', 'Issues', 'Next expiry']} minWidth={980}>
          {(rows as DetailRow[]).map((r) => (
            <tr key={r.employeeId}>
              <td className={cn(td, 'font-medium')}>{r.employeeName}</td>
              <td className={cn(td, 'text-muted-foreground')}>{[r.roleName, r.jobTitle].filter(Boolean).join(' · ') || '—'}</td>
              <td className={cn(td, 'tabular-nums')}>{r.compliancePercent == null ? '—' : `${r.compliancePercent}%`}</td>
              <td className={td}>
                <Pill status={r.status} />
              </td>
              <td className={cn(td, 'tabular-nums', r.blockingIssues > 0 && 'font-medium text-destructive')}>{r.blockingIssues}</td>
              <td className={cn(td, 'max-w-[22rem]')}>
                {r.issues.length ? (
                  <div className="flex flex-wrap gap-1">
                    {r.issues.slice(0, 6).map((i) => (
                      <Pill key={`${i.item}-${i.status}`} status={i.status} label={`${i.item}: ${humanize(i.status)}`} />
                    ))}
                    {r.issues.length > 6 ? <span className="text-xs text-muted-foreground">+{r.issues.length - 6}</span> : null}
                  </div>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>
              <td className={cn(td, 'whitespace-nowrap')}>{r.nearestExpiryDate ? formatDate(r.nearestExpiryDate) : '—'}</td>
            </tr>
          ))}
        </Table>
      </div>
    ),
    csv: (rows) => ({
      header: ['Carer', 'Role', 'Job title', 'Compliance %', 'Status', 'Blocking issues', 'Issues', 'Next expiry'],
      lines: (rows as DetailRow[]).map((r) => [
        r.employeeName,
        r.roleName,
        r.jobTitle,
        r.compliancePercent,
        humanize(r.status),
        r.blockingIssues,
        r.issues.map((i) => `${i.item}: ${humanize(i.status)}`).join('; '),
        r.nearestExpiryDate,
      ]),
    }),
  },
  {
    slug: 'staff-analysis',
    label: 'Staff analysis',
    description: 'Overdue or due-soon reviews, skills, certifications and compliance for each carer.',
    filter: 'within',
    defaultStatus: 'active',
    render: (_d, rows, { formatDate }) => (
      <Table head={['Carer', 'Branch', 'Reviews', 'Skills', 'Certifications', 'Compliance', 'Items']} minWidth={1000}>
        {(rows as AnalysisRow[]).map((r) => (
          <tr key={r.employee.id}>
            <td className={td}>
              <CarerCell e={r.employee} />
            </td>
            <td className={cn(td, 'text-muted-foreground')}>{dash(r.employee.branch)}</td>
            <td className={td}>{bucket(r.reviews)}</td>
            <td className={td}>{bucket(r.skills)}</td>
            <td className={td}>{bucket(r.certifications)}</td>
            <td className={td}>{bucket(r.compliance)}</td>
            <td className={cn(td, 'max-w-[22rem]')}>
              <div className="flex flex-wrap gap-1">
                {r.items.slice(0, 4).map((i) => (
                  <Pill
                    key={`${i.kind}-${i.item}-${i.date}`}
                    status={i.overdue ? 'EXPIRED' : 'DUE_SOON'}
                    label={`${i.item} · ${formatDate(i.date)}`}
                  />
                ))}
                {r.items.length > 4 ? <span className="text-xs text-muted-foreground">+{r.items.length - 4}</span> : null}
              </div>
            </td>
          </tr>
        ))}
      </Table>
    ),
    csv: (rows) => ({
      header: ['Carer', 'Employee no.', 'Branch', 'Overdue', 'Due soon', 'Reviews overdue', 'Skills overdue', 'Certifications overdue', 'Compliance overdue', 'Items'],
      lines: (rows as AnalysisRow[]).map((r) => [
        ...empCols(r.employee),
        r.overdue,
        r.dueSoon,
        r.reviews.overdue,
        r.skills.overdue,
        r.certifications.overdue,
        r.compliance.overdue,
        r.items.map((i) => `${i.kind}: ${i.item} (${i.date}${i.overdue ? ', overdue' : ''})`).join('; '),
      ]),
    }),
  },
  {
    slug: 'roles',
    label: 'Employee role report',
    description: 'Role, job title, access level, work area and employment type for each carer.',
    filter: 'none',
    defaultStatus: 'active',
    render: (_d, rows, { formatDate }) => (
      <Table head={['Carer', 'Branch', 'Role', 'Job title', 'Access level', 'Work area', 'Contract', 'Grade', 'Type', 'Start date']} minWidth={1100}>
        {(rows as RoleRow[]).map((r) => (
          <tr key={r.employee.id}>
            <td className={td}>
              <CarerCell e={r.employee} />
            </td>
            <td className={cn(td, 'text-muted-foreground')}>{dash(r.employee.branch)}</td>
            <td className={td}>{dash(r.employee.role)}</td>
            <td className={td}>{dash(r.employee.jobTitle)}</td>
            <td className={td}>{dash(r.accessLevel)}</td>
            <td className={td}>{dash(r.workArea)}</td>
            <td className={td}>{dash(r.contractType)}</td>
            <td className={td}>{dash(r.grade)}</td>
            <td className={td}>{r.staffType}</td>
            <td className={cn(td, 'whitespace-nowrap')}>{r.startDate ? formatDate(r.startDate) : '—'}</td>
          </tr>
        ))}
      </Table>
    ),
    csv: (rows) => ({
      header: ['Carer', 'Employee no.', 'Branch', 'Role', 'Job title', 'Access level', 'Work area', 'Contract', 'Grade', 'Type', 'Start date'],
      lines: (rows as RoleRow[]).map((r) => [
        ...empCols(r.employee),
        r.employee.role,
        r.employee.jobTitle,
        r.accessLevel,
        r.workArea,
        r.contractType,
        r.grade,
        r.staffType,
        r.startDate,
      ]),
    }),
  },
  {
    slug: 'leaving',
    label: 'Employee leaving report',
    description: 'Carers who left in the date range, with their leaving reason.',
    filter: 'range',
    defaultDays: 365,
    defaultStatus: 'all',
    render: (_d, rows, { formatDate }) => (
      <Table head={['Carer', 'Branch', 'Role', 'Started', 'Left', 'Reason', 'Notes']} minWidth={900}>
        {(rows as LeavingRow[]).map((r) => (
          <tr key={r.id}>
            <td className={td}>
              <CarerCell e={r.employee} />
            </td>
            <td className={cn(td, 'text-muted-foreground')}>{dash(r.employee.branch)}</td>
            <td className={td}>{dash(r.employee.role)}</td>
            <td className={cn(td, 'whitespace-nowrap')}>{r.startDate ? formatDate(r.startDate) : '—'}</td>
            <td className={cn(td, 'whitespace-nowrap font-medium')}>{formatDate(r.leavingDate)}</td>
            <td className={td}>{dash(r.reason)}</td>
            <td className={cn(td, 'max-w-[18rem] text-xs text-muted-foreground')}>{dash(r.notes)}</td>
          </tr>
        ))}
      </Table>
    ),
    csv: (rows) => ({
      header: ['Carer', 'Employee no.', 'Branch', 'Role', 'Start date', 'Leaving date', 'Reason', 'Notes'],
      lines: (rows as LeavingRow[]).map((r) => [...empCols(r.employee), r.employee.role, r.startDate, r.leavingDate, r.reason, r.notes]),
    }),
  },
  {
    slug: 'details',
    label: 'Employee detail report',
    description: 'Contact and employment details for every carer.',
    filter: 'none',
    defaultStatus: 'active',
    render: (_d, rows, { formatDate }) => (
      <Table head={['Carer', 'Email', 'Phone', 'Town / postcode', 'Branch', 'Role', 'Start date', 'Contract', 'Hours/wk']} minWidth={1100}>
        {(rows as PersonRow[]).map((r) => (
          <tr key={r.employee.id}>
            <td className={td}>
              <CarerCell e={r.employee} />
            </td>
            <td className={cn(td, 'break-all')}>{dash(r.email)}</td>
            <td className={cn(td, 'whitespace-nowrap')}>{dash(r.phone)}</td>
            <td className={td}>{[r.town, r.postcode].filter(Boolean).join(', ') || '—'}</td>
            <td className={cn(td, 'text-muted-foreground')}>{dash(r.employee.branch)}</td>
            <td className={td}>{[r.employee.role, r.employee.jobTitle].filter(Boolean).join(' · ') || '—'}</td>
            <td className={cn(td, 'whitespace-nowrap')}>{r.startDate ? formatDate(r.startDate) : '—'}</td>
            <td className={td}>{dash(r.contractType)}</td>
            <td className={cn(td, 'tabular-nums')}>{dash(r.contractedWeeklyHours)}</td>
          </tr>
        ))}
      </Table>
    ),
    csv: (rows) => ({
      header: ['Carer', 'Employee no.', 'Branch', 'Email', 'Phone', 'Town', 'Postcode', 'Role', 'Job title', 'Start date', 'Contract', 'Contracted hours/week', 'Active'],
      lines: (rows as PersonRow[]).map((r) => [
        ...empCols(r.employee),
        r.email,
        r.phone,
        r.town,
        r.postcode,
        r.employee.role,
        r.employee.jobTitle,
        r.startDate,
        r.contractType,
        r.contractedWeeklyHours,
        r.employee.isActive ? 'Yes' : 'No',
      ]),
    }),
  },
  {
    slug: 'holidays',
    label: 'Holiday report',
    description: 'Holidays and absences (including sickness) in the date range.',
    filter: 'range',
    defaultDays: 90,
    defaultStatus: 'all',
    render: (d, rows, { formatDate }) => {
      const totals = (d.totalsByType as Record<string, number> | undefined) ?? {}
      return (
        <div className="space-y-4">
          {Object.keys(totals).length ? (
            <div className="flex flex-wrap gap-2">
              {Object.entries(totals).map(([type, days]) => (
                <span key={type} className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-sm">
                  {type}
                  <span className="font-semibold tabular-nums">
                    {days} day{days === 1 ? '' : 's'}
                  </span>
                </span>
              ))}
            </div>
          ) : null}
          <Table head={['Carer', 'Branch', 'Type', 'From', 'To', 'Days', 'Sickness', 'Status', 'Notes']} minWidth={1000}>
            {(rows as HolidayRow[]).map((r) => (
              <tr key={r.id}>
                <td className={td}>
                  <CarerCell e={r.employee} />
                </td>
                <td className={cn(td, 'text-muted-foreground')}>{dash(r.employee.branch)}</td>
                <td className={td}>{r.type}</td>
                <td className={cn(td, 'whitespace-nowrap')}>{formatDate(r.from)}</td>
                <td className={cn(td, 'whitespace-nowrap')}>{formatDate(r.to)}</td>
                <td className={cn(td, 'tabular-nums')}>{r.days}</td>
                <td className={td}>{r.sickness ? <Pill status="EXPIRED" label="Sickness" /> : '—'}</td>
                <td className={td}>
                  <Pill status={r.status} label={r.status || undefined} />
                </td>
                <td className={cn(td, 'max-w-[16rem] text-xs text-muted-foreground')}>{dash(r.notes)}</td>
              </tr>
            ))}
          </Table>
        </div>
      )
    },
    csv: (rows) => ({
      header: ['Carer', 'Employee no.', 'Branch', 'Type', 'From', 'To', 'Days', 'Sickness', 'Status', 'Notes'],
      lines: (rows as HolidayRow[]).map((r) => [
        ...empCols(r.employee),
        r.type,
        r.from,
        r.to,
        r.days,
        r.sickness ? 'Yes' : 'No',
        r.status,
        r.notes,
      ]),
    }),
  },
]

function csvEscape(value: Cell | undefined): string {
  const s = value == null ? '' : String(value)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function carerReportCsv(table: CsvTable): string {
  return [table.header, ...table.lines].map((line) => line.map(csvEscape).join(',')).join('\n')
}
