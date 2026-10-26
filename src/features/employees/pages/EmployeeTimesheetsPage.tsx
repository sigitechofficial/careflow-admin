import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import {
  AlertTriangle,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  FileSpreadsheet,
  ListChecks,
  Loader2,
  PlayCircle,
} from 'lucide-react'
import { useAuthStore } from '@/features/auth/store'
import { listAllEmployees, type EmployeeListRow } from '@/features/employees/api'
import { employeeKeys } from '@/features/employees/keys'
import { useGlobalLocationScope } from '@/features/locations/hooks/useGlobalLocationScope'
import { useEmployeeLocations } from '@/features/settings/hooks/useLocationManagement'
import { fetchEcmVisitsTable } from '@/features/ecm/api/ecm.api'
import { buildEcmVisitsCsv, EcmVisitsTable } from '@/features/ecm/components/EcmVisitsTable'
import type { EcmLiveVisitRow } from '@/features/ecm/types/ecm.types'
import { dayKeyFromInstant, operationalTodayIso } from '@/shared/lib/operational-day.util'
import { PageHeader } from '@/shared/ui/page-elements'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { ContentCard } from '@/shared/ui/content-section'
import { Combobox, type ComboboxOption } from '@/shared/ui/combobox'
import { cn } from '@/shared/lib/utils'

function employeeName(e: EmployeeListRow): string {
  return e.fullName?.trim() || [e.firstName, e.lastName].filter(Boolean).join(' ').trim() || 'Unnamed'
}

function currentMonthRange(): { dateFrom: string; dateTo: string } {
  const month = operationalTodayIso().slice(0, 7)
  const [y = 1970, m = 1] = month.split('-').map(Number)
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate()
  return { dateFrom: `${month}-01`, dateTo: `${month}-${String(lastDay).padStart(2, '0')}` }
}

function shiftIsoDay(iso: string, days: number): string {
  const [y = 1970, m = 1, d = 1] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10)
}

type DateRange = { dateFrom: string; dateTo: string }

/** Today and the two days before it. */
function last3DaysRange(): DateRange {
  const today = operationalTodayIso()
  return { dateFrom: shiftIsoDay(today, -2), dateTo: today }
}

/** The previous Monday–Sunday week. */
function lastWeekRange(): DateRange {
  const today = operationalTodayIso()
  const [y = 1970, m = 1, d = 1] = today.split('-').map(Number)
  const daysSinceMonday = (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7
  const thisMonday = shiftIsoDay(today, -daysSinceMonday)
  return { dateFrom: shiftIsoDay(thisMonday, -7), dateTo: shiftIsoDay(thisMonday, -1) }
}

/** The previous calendar month. */
function lastMonthRange(): DateRange {
  const firstOfThisMonth = `${operationalTodayIso().slice(0, 7)}-01`
  const lastOfPrevMonth = shiftIsoDay(firstOfThisMonth, -1)
  return { dateFrom: `${lastOfPrevMonth.slice(0, 7)}-01`, dateTo: lastOfPrevMonth }
}

/** Quick ranges in the organisation operational timezone, inclusive. */
const RANGE_PRESETS = [
  { key: '3d', label: 'Last 3 days', range: last3DaysRange },
  { key: 'last-week', label: 'Last week', range: lastWeekRange },
  { key: 'last-month', label: 'Last month', range: lastMonthRange },
] as const

function fileSlug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'employee'
}

/**
 * Visits for the given employees. The ECM table endpoint takes one employee per request,
 * so requests run a few at a time; a visit shared by two carers is kept once.
 * `jobIdsByEmployee` keeps each employee's own visits (for the dropdown counts and selection).
 */
async function fetchVisitsForEmployees(
  employeeIds: string[],
  range: { dateFrom: string; dateTo: string },
): Promise<{ rows: EcmLiveVisitRow[]; truncated: boolean; jobIdsByEmployee: Record<string, string[]> }> {
  const byJob = new Map<string, EcmLiveVisitRow>()
  const jobIdsByEmployee: Record<string, string[]> = {}
  let truncated = false
  const queue = [...employeeIds]
  const worker = async () => {
    for (let id = queue.shift(); id; id = queue.shift()) {
      const data = await fetchEcmVisitsTable({ employeeId: id, ...range })
      truncated ||= data.truncated
      jobIdsByEmployee[id] = data.rows.map(row => row.scheduledJobId)
      for (const row of data.rows) if (!byJob.has(row.scheduledJobId)) byJob.set(row.scheduledJobId, row)
    }
  }
  await Promise.all(Array.from({ length: Math.min(4, queue.length) }, worker))
  const rows = [...byJob.values()].sort(
    // Latest first.
    (a, b) => new Date(b.plannedStartDateTime).getTime() - new Date(a.plannedStartDateTime).getTime(),
  )
  return { rows, truncated, jobIdsByEmployee }
}

type VisitBucket = 'completed' | 'in_progress' | 'missed' | 'not_completed' | 'upcoming'
type CardFilter = 'all' | 'today' | VisitBucket

const COMPLETED_STATUSES = new Set(['COMPLETED', 'COMPLETED_WITH_EXCEPTION', 'CHECKED_OUT', 'CLOSED'])
const IN_PROGRESS_STATUSES = new Set(['CHECKED_IN', 'IN_PROGRESS', 'EN_ROUTE'])
const MISSED_CLASSIFICATIONS = new Set(['POTENTIAL_MISSED', 'CONFIRMED_MISSED'])

/** One bucket per visit, so the bucket cards add up to the total. */
function visitBucket(row: EcmLiveVisitRow, now: number): VisitBucket {
  const status = String(row.lifecycleStatus ?? '').toUpperCase()
  if (COMPLETED_STATUSES.has(status)) return 'completed'
  if (IN_PROGRESS_STATUSES.has(status)) return 'in_progress'
  if (MISSED_CLASSIFICATIONS.has(String(row.missedClassification ?? '').toUpperCase())) return 'missed'
  const end = new Date(row.plannedEndDateTime ?? row.plannedStartDateTime).getTime()
  return end < now ? 'not_completed' : 'upcoming'
}

const visitDay = (row: EcmLiveVisitRow) =>
  dayKeyFromInstant(row.plannedStartDateTime) || row.plannedStartDateTime.slice(0, 10)

function SummaryCard({
  title,
  value,
  hint,
  icon,
  iconClassName,
  active,
  onClick,
  testId,
}: {
  title: string
  value: number
  hint: string
  icon: React.ReactNode
  iconClassName: string
  active: boolean
  onClick: () => void
  testId: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      data-testid={testId}
      className={cn(
        'rounded-xl border px-4 py-3.5 text-left shadow-sm transition-colors',
        active ? 'border-primary bg-primary/5' : 'border-border bg-card hover:bg-muted/30',
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{title}</p>
          <p className="mt-0.5 text-xl font-display font-semibold tabular-nums text-foreground">{value}</p>
          <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{hint}</p>
        </div>
        <span className={cn('inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', iconClassName)}>
          {icon}
        </span>
      </div>
    </button>
  )
}

export default function EmployeeTimesheetsPage() {
  const canOpenSchedule = useAuthStore(s => s.can('schedule_timelines.read' as never))
  const [range, setRange] = React.useState(currentMonthRange)
  const [employeeId, setEmployeeId] = React.useState('')
  const { locationId: globalLocationId } = useGlobalLocationScope()
  const [zoneId, setZoneId] = React.useState('')
  const [branchId, setBranchId] = React.useState('')

  const locationsQuery = useEmployeeLocations()
  const zones = React.useMemo(() => {
    const all = [...(locationsQuery.data?.zones ?? [])].sort((a, b) => a.name.localeCompare(b.name))
    if (!globalLocationId) return all
    // With a header location, offer only that branch and its zone (branch ids are location ids).
    const limited = all
      .map(z => ({ ...z, branches: z.branches.filter(b => b.id === globalLocationId) }))
      .filter(z => z.branches.length > 0)
    return limited.length > 0 ? limited : all
  }, [locationsQuery.data?.zones, globalLocationId])
  // Drop a zone / branch the header location no longer allows.
  React.useEffect(() => {
    if (!locationsQuery.data) return
    if (zoneId && !zones.some(z => z.id === zoneId)) setZoneId('')
    if (branchId && !zones.some(z => z.branches.some(b => b.id === branchId))) setBranchId('')
  }, [zones, zoneId, branchId, locationsQuery.data])
  const selectedZone = zones.find(z => z.id === zoneId)
  const zoneOptions = React.useMemo<ComboboxOption[]>(
    () => [{ value: '', label: 'All zones' }, ...zones.map(z => ({ value: z.id, label: z.name }))],
    [zones],
  )
  // Branches of the chosen zone; every branch while no zone is chosen.
  const branchOptions = React.useMemo<ComboboxOption[]>(() => {
    const source = selectedZone ? [selectedZone] : zones
    const branches = source
      .flatMap(z => z.branches.map(b => ({ value: b.id, label: b.name, description: selectedZone ? undefined : z.name })))
      .sort((a, b) => a.label.localeCompare(b.label))
    return [{ value: '', label: selectedZone ? `All branches in ${selectedZone.name}` : 'All branches' }, ...branches]
  }, [zones, selectedZone])

  // Zone / branch on the page take precedence over the header location.
  const scopedLocationIds = branchId
    ? [branchId]
    : selectedZone
      ? selectedZone.branches.map(b => b.id)
      : globalLocationId
        ? [globalLocationId]
        : undefined
  const zoneHasNoBranches = Boolean(selectedZone && !branchId && selectedZone.branches.length === 0)
  const listParams = { locationIds: scopedLocationIds }
  const employeesQuery = useQuery({
    queryKey: [...employeeKeys.lists(), 'all', listParams] as const,
    queryFn: () => listAllEmployees(listParams),
    enabled: !zoneHasNoBranches,
  })
  const employees = React.useMemo(
    () =>
      zoneHasNoBranches
        ? []
        : [...(employeesQuery.data ?? [])].sort((a, b) => employeeName(a).localeCompare(employeeName(b))),
    [employeesQuery.data, zoneHasNoBranches],
  )
  // Drop a selection that is no longer in the (branch-scoped) list.
  React.useEffect(() => {
    if (employeeId && employeesQuery.data && !employeesQuery.data.some(e => e.id === employeeId)) {
      setEmployeeId('')
    }
  }, [employeeId, employeesQuery.data])

  const rangeValid = Boolean(range.dateFrom && range.dateTo && range.dateFrom <= range.dateTo)
  // Always load every listed employee, so the dropdown can show each one's visit count.
  const employeeIds = employees.map(e => e.id)

  const visitsQuery = useQuery({
    queryKey: ['employee-timesheets', range, employeeIds] as const,
    queryFn: () => fetchVisitsForEmployees(employeeIds, range),
    enabled: rangeValid && employeeIds.length > 0,
  })
  const jobIdsByEmployee = visitsQuery.data?.jobIdsByEmployee

  const employeeOptions = React.useMemo<ComboboxOption[]>(
    () => [
      { value: '', label: `All employees (${employees.length})` },
      ...employees.map(e => {
        const count = jobIdsByEmployee?.[e.id]?.length
        const visits = count == null ? null : `${count} visit${count === 1 ? '' : 's'}`
        return {
          value: e.id,
          label: `${employeeName(e)}${e.isActive ? '' : ' (inactive)'}`,
          description: [e.jobTitle?.name, visits].filter(Boolean).join(' · ') || undefined,
        }
      }),
    ],
    [employees, jobIdsByEmployee],
  )

  const allRows = React.useMemo(() => {
    const rows = visitsQuery.data?.rows ?? []
    if (!employeeId) return rows
    const own = new Set(jobIdsByEmployee?.[employeeId] ?? [])
    return rows.filter(row => own.has(row.scheduledJobId))
  }, [visitsQuery.data?.rows, jobIdsByEmployee, employeeId])
  const [cardFilter, setCardFilter] = React.useState<CardFilter>('all')

  const today = operationalTodayIso()
  const classified = React.useMemo(() => {
    const now = Date.now()
    return allRows.map(row => ({ row, bucket: visitBucket(row, now), isToday: visitDay(row) === today }))
  }, [allRows, today])
  const counts = React.useMemo(() => {
    const next = { all: classified.length, today: 0, completed: 0, in_progress: 0, missed: 0, not_completed: 0, upcoming: 0 }
    for (const c of classified) {
      next[c.bucket] += 1
      if (c.isToday) next.today += 1
    }
    return next
  }, [classified])
  // The table and the CSV show the visits of the selected card.
  const rows = React.useMemo(
    () =>
      cardFilter === 'all'
        ? allRows
        : classified
            .filter(c => (cardFilter === 'today' ? c.isToday : c.bucket === cardFilter))
            .map(c => c.row),
    [allRows, classified, cardFilter],
  )
  const toggleCard = (next: CardFilter) => setCardFilter(prev => (prev === next ? 'all' : next))

  const selectedName = employees.find(e => e.id === employeeId)
  const downloadCsv = () => {
    // Same format as the employee Visits tab export. BOM so Excel reads UTF-8 correctly.
    const blob = new Blob(['﻿', buildEcmVisitsCsv(rows)], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `timesheet-${selectedName ? fileSlug(employeeName(selectedName)) : 'all-employees'}-${range.dateFrom}_to_${range.dateTo}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col gap-4" data-testid="employee-timesheets-page">
      <PageHeader
        title="Timesheets"
        description={[
          'Employee visits with planned vs actual times, punctuality and duration. Download as CSV.',
          globalLocationId && !zoneId && !branchId ? 'Showing employees for the selected header location.' : null,
        ]
          .filter(Boolean)
          .join(' ')}
        icon={
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
            <FileSpreadsheet className="h-4 w-4" aria-hidden />
          </span>
        }
        breadcrumb={[
          { label: 'Home', href: '/' },
          { label: 'Employee', href: '/employee/staff-list' },
          { label: 'Timesheets' },
        ]}
      />

      <ContentCard className="space-y-3 p-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
            Zone
            <Combobox
              className="w-48"
              options={zoneOptions}
              value={zoneId}
              onChange={next => {
                setZoneId(next)
                setBranchId('')
              }}
              placeholder="All zones"
              searchPlaceholder="Search zone…"
              emptyText="No zones found."
              loading={locationsQuery.isLoading}
              disabled={locationsQuery.isLoading}
              data-testid="timesheets-zone"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
            Branch
            <Combobox
              className="w-56"
              options={branchOptions}
              value={branchId}
              onChange={setBranchId}
              placeholder={selectedZone ? `All branches in ${selectedZone.name}` : 'All branches'}
              searchPlaceholder="Search branch…"
              emptyText="No branches found."
              loading={locationsQuery.isLoading}
              disabled={locationsQuery.isLoading}
              data-testid="timesheets-branch"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
            Employee
            <Combobox
              className="w-64"
              options={employeeOptions}
              value={employeeId}
              onChange={setEmployeeId}
              placeholder={`All employees (${employees.length})`}
              searchPlaceholder="Search employee…"
              emptyText="No employees found."
              loading={employeesQuery.isLoading}
              disabled={employeesQuery.isLoading}
              data-testid="timesheets-employee"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
            From
            <Input
              type="date"
              className="h-9 w-40"
              value={range.dateFrom}
              onChange={e => setRange(r => ({ ...r, dateFrom: e.target.value }))}
              data-testid="timesheets-date-from"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
            To
            <Input
              type="date"
              className="h-9 w-40"
              value={range.dateTo}
              onChange={e => setRange(r => ({ ...r, dateTo: e.target.value }))}
              data-testid="timesheets-date-to"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            {RANGE_PRESETS.map(p => {
              const r = p.range()
              const active = r.dateFrom === range.dateFrom && r.dateTo === range.dateTo
              return (
                <Button
                  key={p.key}
                  type="button"
                  size="sm"
                  variant="outline"
                  className={cn('h-9', active && 'border-primary bg-primary/10 text-primary')}
                  title={`${r.dateFrom} to ${r.dateTo}`}
                  onClick={() => setRange(r)}
                  data-testid={`timesheets-range-${p.key}`}
                >
                  {p.label}
                </Button>
              )
            })}
          </div>
        </div>
        {!rangeValid && (
          <p className="text-sm text-destructive">Choose a valid date range (From must be on or before To).</p>
        )}
      </ContentCard>

      {rangeValid && !visitsQuery.isError ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7" data-testid="timesheets-summary-cards">
          <SummaryCard
            title="All visits"
            value={counts.all}
            hint="In the selected dates"
            icon={<ListChecks className="h-5 w-5" aria-hidden />}
            iconClassName="bg-slate-500/10 text-slate-700 dark:text-slate-300"
            active={cardFilter === 'all'}
            onClick={() => setCardFilter('all')}
            testId="timesheets-card-all"
          />
          <SummaryCard
            title="Today"
            value={counts.today}
            hint={today >= range.dateFrom && today <= range.dateTo ? 'Planned for today' : 'Today is outside the dates'}
            icon={<CalendarDays className="h-5 w-5" aria-hidden />}
            iconClassName="bg-sky-500/10 text-sky-700 dark:text-sky-300"
            active={cardFilter === 'today'}
            onClick={() => toggleCard('today')}
            testId="timesheets-card-today"
          />
          <SummaryCard
            title="Completed"
            value={counts.completed}
            hint="Checked out or closed"
            icon={<CheckCircle2 className="h-5 w-5" aria-hidden />}
            iconClassName="bg-success/10 text-success"
            active={cardFilter === 'completed'}
            onClick={() => toggleCard('completed')}
            testId="timesheets-card-completed"
          />
          <SummaryCard
            title="In progress"
            value={counts.in_progress}
            hint="Checked in, not yet out"
            icon={<PlayCircle className="h-5 w-5" aria-hidden />}
            iconClassName="bg-primary/10 text-primary"
            active={cardFilter === 'in_progress'}
            onClick={() => toggleCard('in_progress')}
            testId="timesheets-card-in-progress"
          />
          <SummaryCard
            title="Missed"
            value={counts.missed}
            hint="Flagged missed by ECM"
            icon={<AlertTriangle className="h-5 w-5" aria-hidden />}
            iconClassName="bg-destructive/10 text-destructive"
            active={cardFilter === 'missed'}
            onClick={() => toggleCard('missed')}
            testId="timesheets-card-missed"
          />
          <SummaryCard
            title="Not completed"
            value={counts.not_completed}
            hint="Past, no check-out recorded"
            icon={<Clock className="h-5 w-5" aria-hidden />}
            iconClassName="bg-amber-500/10 text-amber-800 dark:text-amber-300"
            active={cardFilter === 'not_completed'}
            onClick={() => toggleCard('not_completed')}
            testId="timesheets-card-not-completed"
          />
          <SummaryCard
            title="Upcoming"
            value={counts.upcoming}
            hint="Not started yet"
            icon={<CalendarClock className="h-5 w-5" aria-hidden />}
            iconClassName="bg-violet-500/10 text-violet-700 dark:text-violet-300"
            active={cardFilter === 'upcoming'}
            onClick={() => toggleCard('upcoming')}
            testId="timesheets-card-upcoming"
          />
        </div>
      ) : null}

      <ContentCard className="space-y-3 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Visit list</h3>
            <p className="text-xs text-muted-foreground">
              {visitsQuery.isFetching
                ? 'Loading visits…'
                : `${rows.length} visit${rows.length === 1 ? '' : 's'}${cardFilter === 'all' ? '' : ` of ${allRows.length} (filtered by card)`}`}
              {visitsQuery.data?.truncated ? ' | some employees have more visits than shown — narrow the dates' : ''}
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            leftIcon={<Download className="h-3.5 w-3.5" />}
            disabled={rows.length === 0 || visitsQuery.isFetching}
            onClick={downloadCsv}
            data-testid="timesheets-export-csv"
          >
            Export CSV
          </Button>
        </div>

        {employeesQuery.isLoading || (visitsQuery.isLoading && visitsQuery.fetchStatus !== 'idle') ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden />
          </div>
        ) : employeesQuery.isError || visitsQuery.isError ? (
          <p className="py-6 text-center text-sm text-destructive">Could not load visits.</p>
        ) : rows.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center">
            <p className="text-sm text-muted-foreground">
              {cardFilter === 'all' ? 'No visits in this date range.' : 'No visits match the selected card.'}
            </p>
          </div>
        ) : (
          <EcmVisitsTable
            rows={rows}
            className="max-h-[min(70vh,36rem)] overflow-auto"
            renderAction={row =>
              canOpenSchedule ? (
                <Button variant="ghost" size="sm" asChild>
                  <Link
                    to="/scheduling/visits/$jobId"
                    params={{ jobId: row.scheduledJobId }}
                    search={{
                      date: dayKeyFromInstant(row.plannedStartDateTime) || row.plannedStartDateTime.slice(0, 10),
                      returnTo: '/employee/timesheets',
                    }}
                    className="inline-flex items-center gap-1"
                  >
                    Open
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                  </Link>
                </Button>
              ) : (
                <span className="text-xs text-muted-foreground">—</span>
              )
            }
          />
        )}
      </ContentCard>
    </div>
  )
}
