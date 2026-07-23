import * as React from 'react'
import {
  AlertTriangle,
  CalendarClock,
  CalendarRange,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Clock,
  Download,
  ExternalLink,
  FileWarning,
  Gauge,
  Loader2,
  Package,
  Search,
  ShieldAlert,
  Users,
  X,
} from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { useAuthStore } from '@/features/auth/store'
import { useEmployeeHoursWeeklySummary } from '@/features/employees/hooks/useEmployeeHours'
import type {
  EmployeeHourBand,
  EmployeeHourMetric,
  EmployeeHoursFacetOption,
  EmployeeHoursRow,
  EmployeeStaffKind,
} from '@/features/employees/api/employee-hours.api'
import { EmployeeHoursMonthlyPanel } from '@/features/employees/components/EmployeeHoursMonthlyPanel'
import { EmployeeHoursGuideAccordion } from '@/features/employees/components/EmployeeHoursGuideAccordion'
import { PageHeader } from '@/shared/ui/page-elements'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Badge } from '@/shared/ui/badge'
import { ContentCard } from '@/shared/ui/content-section'
import { cn } from '@/shared/lib/utils'

const BANDS: { id: EmployeeHourBand | 'all'; label: string }[] = [
  { id: 'all', label: 'All hours' },
  { id: 'under_10', label: 'Under 10h' },
  { id: '10_20', label: '10–20h' },
  { id: '20_30', label: '20–30h' },
  { id: '30_40', label: '30–40h' },
  { id: 'over_40', label: '40h+' },
]

const METRICS: { id: EmployeeHourMetric; label: string }[] = [
  { id: 'worked', label: 'Band by hours worked' },
  { id: 'assigned', label: 'Band by assigned hours' },
  { id: 'weekly', label: 'Band by contracted hours' },
]

const STAFF_KINDS: { id: EmployeeStaffKind; label: string }[] = [
  { id: 'all', label: 'All staff' },
  { id: 'permanent', label: 'Permanent' },
  { id: 'bank', label: 'Bank' },
  { id: 'agency', label: 'Agency' },
]

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

type SortKey =
  | 'name'
  | 'weeklyHours'
  | 'assignedHours'
  | 'hoursWorked'
  | 'utilisationPct'
  | 'visaType'
  | 'hoursOverCap'
  | 'workedVisits'

type SummaryTone = 'primary' | 'sky' | 'emerald' | 'amber' | 'rose' | 'slate'

const SUMMARY_TONE_CLASS: Record<SummaryTone, string> = {
  primary: 'bg-primary/10 text-primary',
  sky: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
  emerald: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  amber: 'bg-amber-500/10 text-amber-800 dark:text-amber-300',
  rose: 'bg-rose-500/10 text-rose-700 dark:text-rose-300',
  slate: 'bg-muted text-muted-foreground',
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function mondayOfIsoWeekContaining(date: Date): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const dow = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() - (dow - 1))
  return d
}

function toIsoDate(d: Date): string {
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`
}

function shiftWeek(isoMonday: string, delta: number): string {
  const [y = 0, m = 1, day = 1] = isoMonday.split('-').map(Number)
  const d = new Date(Date.UTC(y, m - 1, day + delta * 7))
  return toIsoDate(d)
}

function weekLabel(weekStart: string, weekEnd: string): string {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  })
  const from = new Date(`${weekStart}T00:00:00.000Z`)
  const to = new Date(`${weekEnd}T00:00:00.000Z`)
  return `${fmt.format(from)} – ${fmt.format(to)} ${weekStart.slice(0, 4)}`
}

function formatHours(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—'
  return `${n.toFixed(n % 1 === 0 ? 0 : 2)}h`
}

function formatPct(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—'
  return `${Math.round(n)}%`
}

/** Assigned hours beyond contracted weekly hours (0 when within contract or unknown). */
function hoursOverAssigned(row: EmployeeHoursRow): number {
  if (row.weeklyHours == null || !Number.isFinite(row.weeklyHours)) return 0
  return Math.max(0, Math.round((row.assignedHours - row.weeklyHours) * 100) / 100)
}

/** Assigned hours beyond the effective weekly cap (0 when within cap or unknown). */
function hoursOverAssignedCap(row: EmployeeHoursRow): number {
  if (row.effectiveCapHours == null || !Number.isFinite(row.effectiveCapHours)) return 0
  return Math.max(0, Math.round((row.assignedHours - row.effectiveCapHours) * 100) / 100)
}

function FacetSelect({
  label,
  value,
  options,
  onChange,
  testId,
}: {
  label: string
  value: string
  options: EmployeeHoursFacetOption[]
  onChange: (value: string) => void
  testId: string
}) {
  return (
    <select
      className="flex h-9 max-w-[13rem] rounded-md border border-input bg-background px-2 text-sm"
      value={value}
      onChange={e => onChange(e.target.value)}
      data-testid={testId}
      aria-label={label}
    >
      <option value="">{label}: all</option>
      {options.map(o => (
        <option key={o.id} value={o.id}>
          {o.name} ({o.count})
        </option>
      ))}
    </select>
  )
}

function csvEscape(value: string | number | null | undefined): string {
  const s = value == null ? '' : String(value)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function exportCsv(rows: EmployeeHoursRow[], weekStart: string) {
  const header = [
    'Employee',
    'Employee number',
    'Active',
    'Role',
    'Job title',
    'Contract type',
    'Branch',
    'Staff kind',
    'Immigration',
    'Weekly cap (h)',
    'Contracted weekly hours',
    'Min hours',
    'Max hours',
    'Guaranteed hours',
    'Assigned hours',
    'Hours worked',
    'Utilisation %',
    'Hours over assigned',
    'Hours over assigned cap',
    'Hours over cap',
    'Remaining vs contract',
    'Remaining to cap',
    'Assigned visits',
    'Worked visits',
    ...DAY_LABELS.map(d => `${d} worked (h)`),
  ]
  const lines = rows.map(r =>
    [
      r.employeeName,
      r.employeeNumber,
      r.isActive ? 'Yes' : 'No',
      r.roleName,
      r.jobTitleName,
      r.contractTypeName,
      r.branchName,
      r.isAgencyStaff ? 'Agency' : r.isBankStaff ? 'Bank' : 'Permanent',
      r.immigration?.label ?? '',
      r.effectiveCapHours,
      r.weeklyHours,
      r.minimumHours,
      r.maximumHours,
      r.guaranteedHours,
      r.assignedHours,
      r.hoursWorked,
      r.utilisationPct,
      hoursOverAssigned(r),
      hoursOverAssignedCap(r),
      r.hoursOverCap,
      r.remainingContractHours,
      r.remainingCapHours,
      r.assignedVisits,
      r.workedVisits,
      ...r.dayHours,
    ]
      .map(csvEscape)
      .join(','),
  )
  const blob = new Blob([[header.join(','), ...lines].join('\n')], {
    type: 'text/csv;charset=utf-8;',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `employee-hours-${weekStart}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function sortValue(row: EmployeeHoursRow, key: SortKey): number | string {
  switch (key) {
    case 'name':
      return row.employeeName.toLowerCase()
    case 'weeklyHours':
      return row.weeklyHours ?? -1
    case 'assignedHours':
      return row.assignedHours
    case 'hoursWorked':
      return row.hoursWorked
    case 'utilisationPct':
      return row.utilisationPct ?? -1
    case 'visaType':
      return (row.immigration?.label ?? '').toLowerCase()
    case 'hoursOverCap':
      return row.hoursOverCap
    case 'workedVisits':
      return row.workedVisits
  }
}

function SortableTh({
  label,
  sortKey,
  activeKey,
  dir,
  onSort,
  align = 'right',
}: {
  label: string
  sortKey: SortKey
  activeKey: SortKey
  dir: 'asc' | 'desc'
  onSort: (key: SortKey) => void
  align?: 'left' | 'right'
}) {
  const active = activeKey === sortKey
  return (
    <th
      className={cn(
        'whitespace-nowrap px-3 py-2.5 font-medium text-muted-foreground',
        align === 'right' ? 'text-right' : 'text-left',
      )}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          'inline-flex items-center gap-1 hover:text-foreground',
          active && 'text-foreground',
        )}
      >
        {label}
        <span className="text-[10px] leading-none">
          {active ? (dir === 'asc' ? '▲' : '▼') : ''}
        </span>
      </button>
    </th>
  )
}

export default function EmployeeHoursPage() {
  const canRead = useAuthStore(
    s => s.can('employees.read') || s.can('employees.reports.read'),
  )
  const canOpenEmployee = useAuthStore(s => s.can('employees.update') || s.can('employees.read'))
  const canEditReview = useAuthStore(s => s.can('employees.update'))

  const [view, setView] = React.useState<'monthly' | 'weekly'>('monthly')
  const [weekStart, setWeekStart] = React.useState(() =>
    toIsoDate(mondayOfIsoWeekContaining(new Date())),
  )
  const [hourBand, setHourBand] = React.useState<EmployeeHourBand | 'all'>('all')
  const [bandMetric, setBandMetric] = React.useState<EmployeeHourMetric>('worked')
  const [search, setSearch] = React.useState('')
  const [roleId, setRoleId] = React.useState('')
  const [jobTitleId, setJobTitleId] = React.useState('')
  const [contractTypeId, setContractTypeId] = React.useState('')
  const [locationId, setLocationId] = React.useState('')
  const [visaTypeId, setVisaTypeId] = React.useState('')
  const [staffKind, setStaffKind] = React.useState<EmployeeStaffKind>('all')
  const [overContractOnly, setOverContractOnly] = React.useState(false)
  const [overCapOnly, setOverCapOnly] = React.useState(false)
  const [includeInactive, setIncludeInactive] = React.useState(false)
  const [sortKey, setSortKey] = React.useState<SortKey>('name')
  const [sortDir, setSortDir] = React.useState<'asc' | 'desc'>('asc')
  const [expandedId, setExpandedId] = React.useState<string | null>(null)

  const query = useEmployeeHoursWeeklySummary(
    {
      weekStart,
      hourBand: hourBand === 'all' ? undefined : hourBand,
      bandMetric,
      search: search.trim() || undefined,
      roleId: roleId || undefined,
      jobTitleId: jobTitleId || undefined,
      contractTypeId: contractTypeId || undefined,
      locationId: locationId || undefined,
      visaTypeId: visaTypeId || undefined,
      staffKind: staffKind === 'all' ? undefined : staffKind,
      overContractOnly: overContractOnly || undefined,
      overCapOnly: overCapOnly || undefined,
      includeInactive: includeInactive || undefined,
    },
    canRead && view === 'weekly',
  )

  const data = query.data
  const bandCounts = data?.bandCounts
  const facets = data?.facets

  const rows = React.useMemo(() => {
    const base = [...(data?.rows ?? [])]
    base.sort((a, b) => {
      const av = sortValue(a, sortKey)
      const bv = sortValue(b, sortKey)
      const cmp =
        typeof av === 'string' && typeof bv === 'string'
          ? av.localeCompare(bv)
          : Number(av) - Number(bv)
      return sortDir === 'asc' ? cmp : -cmp
    })
    return base
  }, [data?.rows, sortKey, sortDir])

  const hasSecondaryFilters =
    Boolean(roleId || jobTitleId || contractTypeId || locationId || visaTypeId) ||
    staffKind !== 'all' ||
    overContractOnly ||
    overCapOnly

  const clearFilters = () => {
    setHourBand('all')
    setSearch('')
    setRoleId('')
    setJobTitleId('')
    setContractTypeId('')
    setLocationId('')
    setVisaTypeId('')
    setStaffKind('all')
    setOverContractOnly(false)
    setOverCapOnly(false)
  }

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir(key === 'name' ? 'asc' : 'desc')
    }
  }

  const overAssignedEmployees = React.useMemo(
    () =>
      rows
        .map(r => {
          const overContract = hoursOverAssigned(r)
          const overCap = hoursOverAssignedCap(r)
          const overHours = Math.max(overContract, overCap)
          if (overHours <= 0) return null
          const baseline =
            overCap > 0 && (overContract <= 0 || overCap >= overContract)
              ? (r.effectiveCapHours as number)
              : (r.weeklyHours as number)
          return {
            employeeId: r.employeeId,
            employeeName: r.employeeName,
            contractedHours: baseline,
            assignedHours: r.assignedHours,
            overHours,
          }
        })
        .filter((r): r is NonNullable<typeof r> => r != null),
    [rows],
  )

  const overAssignedCount = overAssignedEmployees.length
  const overAssignedHoursTotal = React.useMemo(
    () =>
      Math.round(
        overAssignedEmployees.reduce((sum, r) => sum + r.overHours, 0) * 100,
      ) / 100,
    [overAssignedEmployees],
  )

  if (!canRead) {
    return (
      <p className="text-sm text-muted-foreground">
        You do not have permission to view employee hours.
      </p>
    )
  }

  const summaryCards: Array<{
    title: string
    value: string
    hint: string
    tone: SummaryTone
    icon: React.ReactNode
  }> = [
    {
      title: 'Employees',
      value: String(data?.employeeCount ?? 0),
      hint: 'Matching current filters',
      tone: 'primary',
      icon: <Users className="h-4 w-4" aria-hidden />,
    },
    {
      title: 'Contracted hours',
      value: formatHours(data?.totals.contractedHours),
      hint: `Avg ${formatHours(data?.totals.averageWeeklyHours)} per employee`,
      tone: 'sky',
      icon: <Package className="h-4 w-4" aria-hidden />,
    },
    {
      title: 'Assigned hours',
      value: formatHours(data?.totals.assignedHours),
      hint: `${data?.totals.assignedVisits ?? 0} scheduled visits`,
      tone: 'sky',
      icon: <CalendarClock className="h-4 w-4" aria-hidden />,
    },
    {
      title: 'Hours worked',
      value: formatHours(data?.totals.hoursWorked),
      hint: `${data?.totals.workedVisits ?? 0} payable visits`,
      tone: 'emerald',
      icon: <CheckCircle2 className="h-4 w-4" aria-hidden />,
    },
    {
      title: 'Avg utilisation',
      value: formatPct(data?.totals.averageUtilisationPct),
      hint: 'Worked vs contracted hours',
      tone: 'primary',
      icon: <Gauge className="h-4 w-4" aria-hidden />,
    },
    {
      title: 'Over assigned',
      value: formatHours(overAssignedHoursTotal),
      hint: `${overAssignedCount} employee${overAssignedCount === 1 ? '' : 's'} assigned above contract or weekly cap`,
      tone: 'amber',
      icon: <AlertTriangle className="h-4 w-4" aria-hidden />,
    },
    {
      title: 'Hours over cap',
      value: formatHours(data?.totals.hoursOverCap),
      hint: `${data?.totals.overCapCount ?? 0} employees over their weekly cap`,
      tone: 'rose',
      icon: <ShieldAlert className="h-4 w-4" aria-hidden />,
    },
    {
      title: 'Over contract',
      value: String(data?.totals.overContractCount ?? 0),
      hint: 'Employees worked above contracted hours',
      tone: 'slate',
      icon: <FileWarning className="h-4 w-4" aria-hidden />,
    },
  ]

  return (
    <div className="flex flex-col gap-4" data-testid="employee-hours-page">
      <PageHeader
        title="Employee hours"
        description={
          view === 'monthly'
            ? 'Monthly sponsor-compliance report — CoS weekly hours, week 1–5 worked hours, SMS reporting and review status.'
            : 'Weekly assigned hours, contracted weekly hours, hours worked, overtime, immigration caps, and utilisation.'
        }
        icon={<Clock className="h-4 w-4 text-muted-foreground" aria-hidden />}
        breadcrumb={[
          { label: 'Home', href: '/' },
          { label: 'Employee', href: '/employee/staff-list' },
          { label: 'Hours' },
        ]}
      />

      {/* View toggle */}
      <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/40 p-1 self-start">
        {(
          [
            { id: 'monthly', label: 'Monthly compliance (CoS)' },
            { id: 'weekly', label: 'Weekly overview' },
          ] as const
        ).map(tab => (
          <Button
            key={tab.id}
            type="button"
            size="sm"
            variant={view === tab.id ? 'default' : 'ghost'}
            onClick={() => setView(tab.id)}
            data-testid={`employee-hours-view-${tab.id}`}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {view === 'monthly' ? (
        <EmployeeHoursMonthlyPanel canEdit={canEditReview} />
      ) : (
        <>
      {/* Week navigation + search + export */}
      <ContentCard className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="icon"
            variant="outline"
            aria-label="Previous week"
            onClick={() => setWeekStart(w => shiftWeek(w, -1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-[12rem] text-center">
            <p className="inline-flex items-center justify-center gap-1.5 text-sm font-semibold text-foreground">
              <CalendarRange className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
              {data ? weekLabel(data.weekStart, data.weekEnd) : 'This week'}
            </p>
            <p className="text-xs text-muted-foreground">
              {data ? `${data.weekStart} → ${data.weekEnd}` : weekStart}
            </p>
          </div>
          <Button
            type="button"
            size="icon"
            variant="outline"
            aria-label="Next week"
            onClick={() => setWeekStart(w => shiftWeek(w, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <input
            type="date"
            className="flex h-9 rounded-md border border-input bg-background px-2 text-sm"
            value={weekStart}
            aria-label="Jump to week containing date"
            onChange={e => {
              const parsed = e.target.value ? new Date(`${e.target.value}T00:00:00.000Z`) : null
              if (parsed && !Number.isNaN(parsed.getTime())) {
                setWeekStart(toIsoDate(mondayOfIsoWeekContaining(parsed)))
              }
            }}
            data-testid="employee-hours-week-picker"
          />
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setWeekStart(toIsoDate(mondayOfIsoWeekContaining(new Date())))}
          >
            <CalendarRange className="mr-1.5 h-3.5 w-3.5" aria-hidden />
            This week
          </Button>

          <div className="relative ml-auto min-w-[14rem] flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Search name or employee #…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              data-testid="employee-hours-search"
            />
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={rows.length === 0}
            onClick={() => exportCsv(rows, data?.weekStart ?? weekStart)}
            data-testid="employee-hours-export"
          >
            <Download className="mr-1.5 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </ContentCard>

      {/* Organisation filters */}
      <ContentCard className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          <FacetSelect
            label="Branch"
            value={locationId}
            options={facets?.locations ?? []}
            onChange={setLocationId}
            testId="employee-hours-filter-branch"
          />
          <FacetSelect
            label="Role"
            value={roleId}
            options={facets?.roles ?? []}
            onChange={setRoleId}
            testId="employee-hours-filter-role"
          />
          <FacetSelect
            label="Job title"
            value={jobTitleId}
            options={facets?.jobTitles ?? []}
            onChange={setJobTitleId}
            testId="employee-hours-filter-job-title"
          />
          <FacetSelect
            label="Contract type"
            value={contractTypeId}
            options={facets?.contractTypes ?? []}
            onChange={setContractTypeId}
            testId="employee-hours-filter-contract-type"
          />
          <FacetSelect
            label="Immigration"
            value={visaTypeId}
            options={facets?.visaTypes ?? []}
            onChange={setVisaTypeId}
            testId="employee-hours-filter-immigration"
          />
          <select
            className="flex h-9 rounded-md border border-input bg-background px-2 text-sm"
            value={staffKind}
            onChange={e => setStaffKind(e.target.value as EmployeeStaffKind)}
            aria-label="Staff kind"
            data-testid="employee-hours-filter-staff-kind"
          >
            {STAFF_KINDS.map(k => (
              <option key={k.id} value={k.id}>
                {k.label}
              </option>
            ))}
          </select>
          {hasSecondaryFilters ? (
            <Button type="button" size="sm" variant="ghost" onClick={clearFilters}>
              <X className="mr-1 h-3.5 w-3.5" />
              Clear filters
            </Button>
          ) : null}
        </div>
      </ContentCard>

      {/* Hour bands + exception toggles */}
      <ContentCard className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="flex h-9 rounded-md border border-input bg-background px-2 text-sm"
            value={bandMetric}
            onChange={e => setBandMetric(e.target.value as EmployeeHourMetric)}
            data-testid="employee-hours-band-metric"
          >
            {METRICS.map(m => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
          {BANDS.map(band => {
            const count =
              band.id === 'all'
                ? Object.values(bandCounts ?? {}).reduce((a, b) => a + b, 0)
                : (bandCounts?.[band.id] ?? 0)
            const active = hourBand === band.id
            return (
              <Button
                key={band.id}
                type="button"
                size="sm"
                variant={active ? 'default' : 'outline'}
                onClick={() => setHourBand(band.id)}
                data-testid={`employee-hours-band-${band.id}`}
              >
                {band.label}
                <Badge
                  variant="outline"
                  className={cn(
                    'ml-1.5 tabular-nums',
                    active ? 'border-primary-foreground/30 bg-primary-foreground/10' : '',
                  )}
                >
                  {query.isLoading ? '…' : count}
                </Badge>
              </Button>
            )
          })}
          <div className="ml-auto flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <label className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={overContractOnly}
                onChange={e => setOverContractOnly(e.target.checked)}
              />
              Over contract
            </label>
            <label className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={overCapOnly}
                onChange={e => setOverCapOnly(e.target.checked)}
              />
              Over cap
            </label>
            <label className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={includeInactive}
                onChange={e => setIncludeInactive(e.target.checked)}
              />
              Include inactive
            </label>
          </div>
        </div>
      </ContentCard>

      {/* Summary cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map(card => (
          <ContentCard key={card.title} className="space-y-2 p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="text-xs font-medium text-muted-foreground">{card.title}</p>
              <span
                className={cn(
                  'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                  SUMMARY_TONE_CLASS[card.tone],
                )}
              >
                {card.icon}
              </span>
            </div>
            <p className="text-xl font-semibold tabular-nums text-foreground">{card.value}</p>
            <p className="text-xs text-muted-foreground">{card.hint}</p>
          </ContentCard>
        ))}
      </div>

      <EmployeeHoursGuideAccordion
        view="weekly"
        overHoursEmployees={overAssignedEmployees}
        employeeCount={data?.employeeCount ?? rows.length}
      />

      <ContentCard className="overflow-hidden p-0">
        {query.isLoading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary" aria-hidden />
            <p className="text-sm text-muted-foreground">Loading employee hours…</p>
          </div>
        ) : query.isError ? (
          <p className="p-4 text-sm text-destructive">Could not load employee hours.</p>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <CircleHelp className="h-6 w-6" aria-hidden />
            </span>
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">No matching employees</p>
              <p className="text-sm text-muted-foreground">
                Try another week, clear filters, or include inactive employees.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1180px] text-sm">
              <thead className="sticky top-0 z-10 bg-muted/95 backdrop-blur">
                <tr className="border-b border-border">
                  <th className="w-8 px-2 py-2.5" aria-label="Expand" />
                  <SortableTh
                    label="Employee"
                    sortKey="name"
                    activeKey={sortKey}
                    dir={sortDir}
                    onSort={handleSort}
                    align="left"
                  />
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">
                    Branch
                  </th>
                  <SortableTh
                    label="Contracted"
                    sortKey="weeklyHours"
                    activeKey={sortKey}
                    dir={sortDir}
                    onSort={handleSort}
                  />
                  <th className="whitespace-nowrap px-3 py-2.5 text-right font-medium text-muted-foreground">
                    Weekly cap
                  </th>
                  <SortableTh
                    label="Assigned"
                    sortKey="assignedHours"
                    activeKey={sortKey}
                    dir={sortDir}
                    onSort={handleSort}
                  />
                  <SortableTh
                    label="Worked"
                    sortKey="hoursWorked"
                    activeKey={sortKey}
                    dir={sortDir}
                    onSort={handleSort}
                  />
                  <SortableTh
                    label="Utilisation"
                    sortKey="utilisationPct"
                    activeKey={sortKey}
                    dir={sortDir}
                    onSort={handleSort}
                  />
                  <SortableTh
                    label="Visa type"
                    sortKey="visaType"
                    activeKey={sortKey}
                    dir={sortDir}
                    onSort={handleSort}
                    align="left"
                  />
                  <SortableTh
                    label="Over cap"
                    sortKey="hoursOverCap"
                    activeKey={sortKey}
                    dir={sortDir}
                    onSort={handleSort}
                  />
                  <SortableTh
                    label="Visits"
                    sortKey="workedVisits"
                    activeKey={sortKey}
                    dir={sortDir}
                    onSort={handleSort}
                  />
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Band</th>
                  <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map(row => {
                  const expanded = expandedId === row.employeeId
                  const overAssigned = hoursOverAssigned(row)
                  const overAssignedCap = hoursOverAssignedCap(row)
                  const hasOverAssigned = overAssigned > 0 || overAssignedCap > 0
                  return (
                    <React.Fragment key={row.employeeId}>
                      <tr
                        className={cn(
                          'border-b border-border last:border-0 hover:bg-muted/20',
                          hasOverAssigned && 'bg-warning/5',
                        )}
                        data-testid={`employee-hours-row-${row.employeeId}`}
                      >
                        <td className="px-2 py-2.5 align-top">
                          <button
                            type="button"
                            aria-label={expanded ? 'Collapse details' : 'Expand details'}
                            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                            onClick={() => setExpandedId(expanded ? null : row.employeeId)}
                          >
                            <ChevronDown
                              className={cn('h-4 w-4 transition-transform', expanded && 'rotate-180')}
                            />
                          </button>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex flex-col">
                            <span className="font-medium text-foreground">
                              {row.employeeName}
                              {!row.isActive ? (
                                <Badge variant="outline" className="ml-1.5 text-[10px]">
                                  Inactive
                                </Badge>
                              ) : null}
                              {row.isAgencyStaff ? (
                                <Badge variant="outline" className="ml-1.5 text-[10px]">
                                  Agency
                                </Badge>
                              ) : row.isBankStaff ? (
                                <Badge variant="outline" className="ml-1.5 text-[10px]">
                                  Bank
                                </Badge>
                              ) : null}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {row.employeeNumber ? `#${row.employeeNumber}` : '—'}
                              {row.roleName ? ` · ${row.roleName}` : ''}
                              {row.jobTitleName && row.jobTitleName !== row.roleName
                                ? ` · ${row.jobTitleName}`
                                : ''}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex flex-col">
                            <span>{row.branchName ?? '—'}</span>
                            <span className="text-xs text-muted-foreground">
                              {row.contractTypeName ?? ''}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums">
                          {formatHours(row.weeklyHours)}
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <div className="flex flex-col items-end">
                            <span className="tabular-nums">
                              {formatHours(row.effectiveCapHours)}
                              {row.capOverrideActive ? (
                                <Badge variant="outline" className="ml-1 text-[10px]">
                                  Override
                                </Badge>
                              ) : null}
                            </span>
                          </div>
                        </td>
                        <td
                          className={cn(
                            'px-3 py-2.5 text-right tabular-nums',
                            hasOverAssigned && 'font-semibold text-amber-800 dark:text-amber-300',
                          )}
                        >
                          <div className="inline-flex flex-col items-end gap-1">
                            <span>{formatHours(row.assignedHours)}</span>
                            {overAssigned > 0 ? (
                              <Badge
                                variant="solid-warning"
                                size="sm"
                                className="whitespace-nowrap"
                                title={`Assigned ${formatHours(row.assignedHours)} vs contracted ${formatHours(row.weeklyHours)}`}
                              >
                                +{formatHours(overAssigned)} over contract
                              </Badge>
                            ) : null}
                            {overAssignedCap > 0 ? (
                              <Badge
                                variant="solid-destructive"
                                size="sm"
                                className="whitespace-nowrap"
                                title={`Assigned ${formatHours(row.assignedHours)} vs weekly cap ${formatHours(row.effectiveCapHours)}`}
                              >
                                +{formatHours(overAssignedCap)} over cap
                              </Badge>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums font-medium">
                          {formatHours(row.hoursWorked)}
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center justify-end gap-2">
                            <div className="h-1.5 w-14 overflow-hidden rounded-full bg-muted">
                              <div
                                className={cn(
                                  'h-full rounded-full',
                                  (row.utilisationPct ?? 0) > 100 ? 'bg-warning' : 'bg-primary',
                                )}
                                style={{
                                  width: `${Math.min(100, Math.max(0, row.utilisationPct ?? 0))}%`,
                                }}
                              />
                            </div>
                            <span className="w-10 text-right tabular-nums text-xs">
                              {formatPct(row.utilisationPct)}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-left">
                          <span className="text-sm text-foreground">
                            {row.immigration?.label ?? '—'}
                          </span>
                          {row.immigration?.capHours != null ? (
                            <span className="mt-0.5 block text-xs text-muted-foreground">
                              Cap {formatHours(row.immigration.capHours)}
                            </span>
                          ) : null}
                        </td>
                        <td
                          className={cn(
                            'px-3 py-2.5 text-right tabular-nums',
                            row.hoursOverCap > 0 && 'font-semibold text-destructive',
                          )}
                        >
                          {row.hoursOverCap > 0 ? formatHours(row.hoursOverCap) : '—'}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums">
                          {row.workedVisits}
                          <span className="text-xs text-muted-foreground"> / {row.assignedVisits}</span>
                        </td>
                        <td className="px-3 py-2.5">
                          <Badge variant="outline" className="whitespace-nowrap font-medium">
                            {BANDS.find(b => b.id === row.hourBand)?.label ?? row.hourBand}
                          </Badge>
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          {canOpenEmployee ? (
                            <Button variant="ghost" size="sm" asChild>
                              <Link
                                to="/employee/$employeeId/edit"
                                params={{ employeeId: row.employeeId }}
                              >
                                Open
                                <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                              </Link>
                            </Button>
                          ) : null}
                        </td>
                      </tr>
                      {expanded ? (
                        <tr className="border-b border-border bg-muted/10 last:border-0">
                          <td colSpan={13} className="px-4 py-3">
                            <div className="grid gap-4 lg:grid-cols-[auto_1fr]">
                              <div>
                                <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                                  Worked hours by day
                                </p>
                                <div className="flex gap-1.5">
                                  {DAY_LABELS.map((day, i) => {
                                    const worked = row.dayHours[i] ?? 0
                                    return (
                                      <div
                                        key={day}
                                        className="flex w-14 flex-col items-center rounded-md border border-border bg-background px-1 py-1.5"
                                      >
                                        <span className="text-[10px] text-muted-foreground">{day}</span>
                                        <span className="text-xs font-medium tabular-nums">
                                          {worked > 0 ? formatHours(worked) : '—'}
                                        </span>
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs sm:grid-cols-3 lg:grid-cols-4">
                                {[
                                  ['Minimum hours', formatHours(row.minimumHours)],
                                  ['Maximum hours', formatHours(row.maximumHours)],
                                  ['Guaranteed hours', formatHours(row.guaranteedHours)],
                                  [
                                    'Immigration cap',
                                    row.immigration
                                      ? `${row.immigration.label} · ${formatHours(row.immigration.capHours)}`
                                      : '—',
                                  ],
                                  ['Remaining vs contract', formatHours(row.remainingContractHours)],
                                  [
                                    'Over assigned vs contract',
                                    overAssigned > 0 ? `+${formatHours(overAssigned)}` : '—',
                                  ],
                                  [
                                    'Over assigned vs weekly cap',
                                    overAssignedCap > 0 ? `+${formatHours(overAssignedCap)}` : '—',
                                  ],
                                  ['Remaining to cap', formatHours(row.remainingCapHours)],
                                  ['Start date', row.startDate ?? '—'],
                                  [
                                    '48h opt-out',
                                    row.optedOutOf48Hours ? 'Opted out' : 'Not opted out',
                                  ],
                                ].map(([label, value]) => (
                                  <div key={label} className="flex flex-col">
                                    <span className="text-muted-foreground">{label}</span>
                                    <span className="font-medium text-foreground">{value}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </ContentCard>
        </>
      )}
    </div>
  )
}
