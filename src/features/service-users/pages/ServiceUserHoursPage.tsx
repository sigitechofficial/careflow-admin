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
  ClipboardList,
  Clock,
  Download,
  ExternalLink,
  FileWarning,
  Gauge,
  Info,
  Loader2,
  Package,
  Search,
  Users,
  X,
} from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { useAuthStore } from '@/features/auth/store'
import { useServiceUserHoursWeeklySummary } from '@/features/service-users/hooks/useServiceUserHours'
import type {
  ServiceUserContractedSource,
  ServiceUserHourBand,
  ServiceUserHourMetric,
  ServiceUserHoursFacetOption,
  ServiceUserHoursRow,
} from '@/features/service-users/api/service-user-hours.api'
import { ServiceUserHoursGuideAccordion } from '@/features/service-users/components/ServiceUserHoursGuideAccordion'
import { ServiceUserHoursDetailDialog } from '@/features/service-users/components/ServiceUserHoursDetailDialog'
import { PageHeader } from '@/shared/ui/page-elements'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Badge } from '@/shared/ui/badge'
import { ContentCard } from '@/shared/ui/content-section'
import { useGlobalLocationScope } from '@/features/locations/hooks/useGlobalLocationScope'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/ui/tooltip'
import { cn } from '@/shared/lib/utils'

const HOURS_METRIC_TOOLTIPS = {
  serviceUsers: 'Service users matching the current filters for the selected Mon–Sun week.',
  package:
    'Weekly funded / planned care allowance. Taken in order from: active visit plan → DOM care contracted hours → funding authorised hours.',
  assigned:
    'Hours already on the rota this week — sum of scheduled job durations (excludes cancelled / called-off). This is booked time, not necessarily delivered.',
  worked:
    'Hours actually delivered / billable this week from visit reconciliations. Multi-carer visits are counted once.',
  utilisation:
    'Assigned hours ÷ package hours for the week. Over 100% means more rota time than the package allows.',
  overPackage:
    'Assigned hours minus package hours when assigned is higher — how far over the weekly package the rota is.',
  overWorked: 'Service users whose worked (billable) hours exceed their weekly package.',
  missingPackage:
    'Service users with no visit plan, DOM care, or funding authorised hours set for package calculation.',
  visits:
    'Worked (billable) visits / assigned (scheduled) visits for the selected Mon–Sun week.',
  band: 'Bucket of assigned hours used for filtering (for example 10–20h).',
} as const

function HoursMetricInfoIcon({ label, tooltip }: { label: string; tooltip: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex shrink-0 text-muted-foreground transition-colors hover:text-foreground"
          aria-label={`About ${label}`}
          onClick={e => {
            e.preventDefault()
            e.stopPropagation()
          }}
        >
          <Info className="h-3.5 w-3.5" aria-hidden />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-sm text-left text-xs leading-snug">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  )
}

const BANDS: { id: ServiceUserHourBand | 'all'; label: string }[] = [
  { id: 'all', label: 'All hours' },
  { id: 'under_10', label: 'Under 10h' },
  { id: '10_20', label: '10–20h' },
  { id: '20_30', label: '20–30h' },
  { id: '30_40', label: '30–40h' },
  { id: 'over_40', label: '40h+' },
]

const METRICS: { id: ServiceUserHourMetric; label: string }[] = [
  { id: 'assigned', label: 'Band by assigned hours' },
  { id: 'worked', label: 'Band by hours worked' },
  { id: 'package', label: 'Band by package hours' },
]

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const SOURCE_LABEL: Record<ServiceUserContractedSource, string> = {
  visit_plan: 'Visit plan',
  dom_care: 'DOM care',
  funding: 'Funding authorised',
}

type SortKey =
  | 'name'
  | 'weeklyPackageHours'
  | 'assignedHours'
  | 'hoursWorked'
  | 'utilisationPct'
  | 'hoursOverPackage'
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

function FacetSelect({
  label,
  value,
  options,
  onChange,
  testId,
  disabled,
}: {
  label: string
  value: string
  options: ServiceUserHoursFacetOption[]
  onChange: (value: string) => void
  testId: string
  disabled?: boolean
}) {
  return (
    <select
      className="flex h-9 max-w-[13rem] rounded-md border border-input bg-background px-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
      value={value}
      onChange={e => onChange(e.target.value)}
      data-testid={testId}
      aria-label={label}
      disabled={disabled}
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

function exportCsv(rows: ServiceUserHoursRow[], weekStart: string) {
  const header = [
    'Service user',
    'Service user number',
    'Active',
    'Branch',
    'Care type',
    'Funding type',
    'Status',
    'Risk level',
    'Package hours source',
    'Weekly package hours',
    'Authorised weekly hours',
    'Assigned hours',
    'Hours worked',
    'Assigned utilisation %',
    'Worked utilisation %',
    'Hours over package',
    'Hours over worked',
    'Remaining vs package',
    'Assigned visits',
    'Worked visits',
    ...DAY_LABELS.map(d => `${d} worked (h)`),
  ]
  const lines = rows.map(r =>
    [
      r.serviceUserName,
      r.serviceUserNumber,
      r.isActive ? 'Yes' : 'No',
      r.branchName,
      r.careTypeName,
      r.fundingTypeName,
      r.statusName,
      r.riskLevelName,
      r.contractedSource ? SOURCE_LABEL[r.contractedSource] : '',
      r.weeklyPackageHours,
      r.authorisedWeeklyHours,
      r.assignedHours,
      r.hoursWorked,
      r.assignedUtilisationPct,
      r.utilisationPct,
      r.hoursOverPackage,
      r.hoursOverWorked,
      r.remainingPackageHours,
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
  a.download = `service-user-hours-${weekStart}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function sortValue(row: ServiceUserHoursRow, key: SortKey): number | string {
  switch (key) {
    case 'name':
      return row.serviceUserName.toLowerCase()
    case 'weeklyPackageHours':
      return row.weeklyPackageHours ?? -1
    case 'assignedHours':
      return row.assignedHours
    case 'hoursWorked':
      return row.hoursWorked
    case 'utilisationPct':
      return row.assignedUtilisationPct ?? -1
    case 'hoursOverPackage':
      return row.hoursOverPackage
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
  tooltip,
}: {
  label: string
  sortKey: SortKey
  activeKey: SortKey
  dir: 'asc' | 'desc'
  onSort: (key: SortKey) => void
  align?: 'left' | 'right'
  tooltip?: string
}) {
  const active = activeKey === sortKey
  return (
    <th
      className={cn(
        'whitespace-nowrap px-3 py-2.5 font-medium text-muted-foreground',
        align === 'right' ? 'text-right' : 'text-left',
      )}
    >
      <span
        className={cn(
          'inline-flex items-center gap-1',
          align === 'right' && 'justify-end',
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
        {tooltip ? <HoursMetricInfoIcon label={label} tooltip={tooltip} /> : null}
      </span>
    </th>
  )
}

export default function ServiceUserHoursPage() {
  const canRead = useAuthStore(s => s.can('service_users.read'))
  const canOpenServiceUser = useAuthStore(
    s => s.can('service_users.update') || s.can('service_users.read'),
  )

  const [weekStart, setWeekStart] = React.useState(() =>
    toIsoDate(mondayOfIsoWeekContaining(new Date())),
  )
  const [hourBand, setHourBand] = React.useState<ServiceUserHourBand | 'all'>('all')
  const [bandMetric, setBandMetric] = React.useState<ServiceUserHourMetric>('assigned')
  const [search, setSearch] = React.useState('')
  const [locationId, setLocationId] = React.useState('')
  const [careTypeId, setCareTypeId] = React.useState('')
  const [fundingTypeId, setFundingTypeId] = React.useState('')
  const [statusId, setStatusId] = React.useState('')
  const [overPackageOnly, setOverPackageOnly] = React.useState(false)
  const [overWorkedOnly, setOverWorkedOnly] = React.useState(false)
  const [includeInactive, setIncludeInactive] = React.useState(false)
  const [sortKey, setSortKey] = React.useState<SortKey>('name')
  const [sortDir, setSortDir] = React.useState<'asc' | 'desc'>('asc')
  const [expandedId, setExpandedId] = React.useState<string | null>(null)
  const [detailTarget, setDetailTarget] = React.useState<{
    serviceUserId: string
    serviceUserName: string
    assignedHours: number
    assignedVisits: number
    workedVisits: number
  } | null>(null)

  const { locationId: globalLocationId, isScoped: globalLocationScoped } =
    useGlobalLocationScope()

  React.useEffect(() => {
    if (globalLocationScoped && globalLocationId) {
      setLocationId(globalLocationId)
    } else if (!globalLocationScoped) {
      setLocationId('')
    }
  }, [globalLocationId, globalLocationScoped])

  const effectiveLocationId = globalLocationScoped && globalLocationId ? globalLocationId : locationId

  const query = useServiceUserHoursWeeklySummary(
    {
      weekStart,
      hourBand: hourBand === 'all' ? undefined : hourBand,
      bandMetric,
      search: search.trim() || undefined,
      locationId: effectiveLocationId || undefined,
      careTypeId: careTypeId || undefined,
      fundingTypeId: fundingTypeId || undefined,
      statusId: statusId || undefined,
      overPackageOnly: overPackageOnly || undefined,
      overWorkedOnly: overWorkedOnly || undefined,
      includeInactive: includeInactive || undefined,
    },
    canRead,
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
    Boolean(
      (!globalLocationScoped && locationId) || careTypeId || fundingTypeId || statusId,
    ) ||
    overPackageOnly ||
    overWorkedOnly

  const clearFilters = () => {
    setHourBand('all')
    setSearch('')
    if (!globalLocationScoped) setLocationId('')
    setCareTypeId('')
    setFundingTypeId('')
    setStatusId('')
    setOverPackageOnly(false)
    setOverWorkedOnly(false)
  }

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir(key === 'name' ? 'asc' : 'desc')
    }
  }

  const overPackageServiceUsers = React.useMemo(
    () =>
      rows
        .filter(r => r.hoursOverPackage > 0 && r.weeklyPackageHours != null)
        .map(r => ({
          serviceUserId: r.serviceUserId,
          serviceUserName: r.serviceUserName,
          packageHours: r.weeklyPackageHours as number,
          assignedHours: r.assignedHours,
          overHours: r.hoursOverPackage,
        })),
    [rows],
  )

  if (!canRead) {
    return (
      <p className="text-sm text-muted-foreground">
        You do not have permission to view service user hours.
      </p>
    )
  }

  const summaryCards: Array<{
    title: string
    value: string
    hint: string
    tone: SummaryTone
    icon: React.ReactNode
    tooltip?: string
  }> = [
    {
      title: 'Service users',
      value: String(data?.serviceUserCount ?? 0),
      hint: 'Matching current filters',
      tone: 'primary',
      icon: <Users className="h-4 w-4" aria-hidden />,
      tooltip: HOURS_METRIC_TOOLTIPS.serviceUsers,
    },
    {
      title: 'Package hours',
      value: formatHours(data?.totals.packageHours),
      hint: `Avg ${formatHours(data?.totals.averagePackageHours)} per service user`,
      tone: 'sky',
      icon: <Package className="h-4 w-4" aria-hidden />,
      tooltip: HOURS_METRIC_TOOLTIPS.package,
    },
    {
      title: 'Assigned hours',
      value: formatHours(data?.totals.assignedHours),
      hint: `${data?.totals.assignedVisits ?? 0} scheduled visits`,
      tone: 'sky',
      icon: <CalendarClock className="h-4 w-4" aria-hidden />,
      tooltip: HOURS_METRIC_TOOLTIPS.assigned,
    },
    {
      title: 'Hours worked',
      value: formatHours(data?.totals.hoursWorked),
      hint: `${data?.totals.workedVisits ?? 0} billable visits`,
      tone: 'emerald',
      icon: <CheckCircle2 className="h-4 w-4" aria-hidden />,
      tooltip: HOURS_METRIC_TOOLTIPS.worked,
    },
    {
      title: 'Avg assigned utilisation',
      value: formatPct(data?.totals.averageAssignedUtilisationPct),
      hint: 'Assigned vs package hours',
      tone: 'primary',
      icon: <Gauge className="h-4 w-4" aria-hidden />,
      tooltip: HOURS_METRIC_TOOLTIPS.utilisation,
    },
    {
      title: 'Over package',
      value: formatHours(data?.totals.hoursOverPackage),
      hint: `${data?.totals.overPackageCount ?? 0} service user${
        (data?.totals.overPackageCount ?? 0) === 1 ? '' : 's'
      } assigned above package`,
      tone: 'amber',
      icon: <AlertTriangle className="h-4 w-4" aria-hidden />,
      tooltip: HOURS_METRIC_TOOLTIPS.overPackage,
    },
    {
      title: 'Over worked',
      value: String(data?.totals.overWorkedCount ?? 0),
      hint: 'Worked above weekly package hours',
      tone: 'rose',
      icon: <Clock className="h-4 w-4" aria-hidden />,
      tooltip: HOURS_METRIC_TOOLTIPS.overWorked,
    },
    {
      title: 'Missing package',
      value: String(data?.totals.missingPackageCount ?? 0),
      hint: 'No visit plan / DOM care / funding hours set',
      tone: 'slate',
      icon: <FileWarning className="h-4 w-4" aria-hidden />,
      tooltip: HOURS_METRIC_TOOLTIPS.missingPackage,
    },
  ]

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex flex-col gap-4 p-5" data-testid="service-user-hours-page">
      <PageHeader
        title="Service User hours"
        description="Weekly package (contracted) hours, assigned scheduled hours, billable hours worked, and over-package alerts."
        icon={<Clock className="h-4 w-4 text-muted-foreground" aria-hidden />}
        breadcrumb={[
          { label: 'Home', href: '/' },
          { label: 'Service Users', href: '/service-users/all' },
          { label: 'Hours' },
        ]}
      />

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
            data-testid="service-user-hours-week-picker"
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
              placeholder="Search name or service user #…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              data-testid="service-user-hours-search"
            />
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={rows.length === 0}
            onClick={() => exportCsv(rows, data?.weekStart ?? weekStart)}
            data-testid="service-user-hours-export"
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
            value={effectiveLocationId}
            options={facets?.locations ?? []}
            onChange={setLocationId}
            testId="service-user-hours-filter-branch"
            disabled={globalLocationScoped}
          />
          <FacetSelect
            label="Care type"
            value={careTypeId}
            options={facets?.careTypes ?? []}
            onChange={setCareTypeId}
            testId="service-user-hours-filter-care-type"
          />
          <FacetSelect
            label="Funding type"
            value={fundingTypeId}
            options={facets?.fundingTypes ?? []}
            onChange={setFundingTypeId}
            testId="service-user-hours-filter-funding-type"
          />
          <FacetSelect
            label="Status"
            value={statusId}
            options={facets?.statuses ?? []}
            onChange={setStatusId}
            testId="service-user-hours-filter-status"
          />
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
            onChange={e => setBandMetric(e.target.value as ServiceUserHourMetric)}
            data-testid="service-user-hours-band-metric"
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
                data-testid={`service-user-hours-band-${band.id}`}
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
                checked={overPackageOnly}
                onChange={e => setOverPackageOnly(e.target.checked)}
                data-testid="service-user-hours-over-package-only"
              />
              Over package
            </label>
            <label className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={overWorkedOnly}
                onChange={e => setOverWorkedOnly(e.target.checked)}
                data-testid="service-user-hours-over-worked-only"
              />
              Over worked
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
              <p className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
                {card.title}
                {card.tooltip ? (
                  <HoursMetricInfoIcon label={card.title} tooltip={card.tooltip} />
                ) : null}
              </p>
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

      <ServiceUserHoursGuideAccordion
        overPackageServiceUsers={overPackageServiceUsers}
        serviceUserCount={data?.serviceUserCount ?? rows.length}
      />

      <ContentCard className="overflow-hidden p-0">
        {query.isLoading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary" aria-hidden />
            <p className="text-sm text-muted-foreground">Loading service user hours…</p>
          </div>
        ) : query.isError ? (
          <p className="p-4 text-sm text-destructive">Could not load service user hours.</p>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <CircleHelp className="h-6 w-6" aria-hidden />
            </span>
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">No matching service users</p>
              <p className="text-sm text-muted-foreground">
                Try another week, clear filters, or include inactive service users.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-sm">
              <thead className="sticky top-0 z-10 bg-muted/95 backdrop-blur">
                <tr className="border-b border-border">
                  <th className="w-8 px-2 py-2.5" aria-label="Expand" />
                  <SortableTh
                    label="Service user"
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
                    label="Package"
                    sortKey="weeklyPackageHours"
                    activeKey={sortKey}
                    dir={sortDir}
                    onSort={handleSort}
                    tooltip={HOURS_METRIC_TOOLTIPS.package}
                  />
                  <SortableTh
                    label="Assigned"
                    sortKey="assignedHours"
                    activeKey={sortKey}
                    dir={sortDir}
                    onSort={handleSort}
                    tooltip={HOURS_METRIC_TOOLTIPS.assigned}
                  />
                  <SortableTh
                    label="Worked"
                    sortKey="hoursWorked"
                    activeKey={sortKey}
                    dir={sortDir}
                    onSort={handleSort}
                    tooltip={HOURS_METRIC_TOOLTIPS.worked}
                  />
                  <SortableTh
                    label="Utilisation"
                    sortKey="utilisationPct"
                    activeKey={sortKey}
                    dir={sortDir}
                    onSort={handleSort}
                    tooltip={HOURS_METRIC_TOOLTIPS.utilisation}
                  />
                  <SortableTh
                    label="Over package"
                    sortKey="hoursOverPackage"
                    activeKey={sortKey}
                    dir={sortDir}
                    onSort={handleSort}
                    tooltip={HOURS_METRIC_TOOLTIPS.overPackage}
                  />
                  <SortableTh
                    label="Visits (week)"
                    sortKey="workedVisits"
                    activeKey={sortKey}
                    dir={sortDir}
                    onSort={handleSort}
                    tooltip={HOURS_METRIC_TOOLTIPS.visits}
                  />
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      Band
                      <HoursMetricInfoIcon label="Band" tooltip={HOURS_METRIC_TOOLTIPS.band} />
                    </span>
                  </th>
                  <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map(row => {
                  const expanded = expandedId === row.serviceUserId
                  const hasOverPackage = row.hoursOverPackage > 0
                  return (
                    <React.Fragment key={row.serviceUserId}>
                      <tr
                        className={cn(
                          'border-b border-border last:border-0 hover:bg-muted/20',
                          hasOverPackage && 'bg-warning/5',
                        )}
                        data-testid={`service-user-hours-row-${row.serviceUserId}`}
                      >
                        <td className="px-2 py-2.5 align-top">
                          <button
                            type="button"
                            aria-label={expanded ? 'Collapse details' : 'Expand details'}
                            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                            onClick={() =>
                              setExpandedId(expanded ? null : row.serviceUserId)
                            }
                          >
                            <ChevronDown
                              className={cn(
                                'h-4 w-4 transition-transform',
                                expanded && 'rotate-180',
                              )}
                            />
                          </button>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex flex-col">
                            <span className="font-medium text-foreground">
                              {row.serviceUserName}
                              {!row.isActive ? (
                                <Badge variant="outline" className="ml-1.5 text-[10px]">
                                  Inactive
                                </Badge>
                              ) : null}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {row.serviceUserNumber ? `#${row.serviceUserNumber}` : '—'}
                              {row.careTypeName ? ` · ${row.careTypeName}` : ''}
                              {row.statusName ? ` · ${row.statusName}` : ''}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex flex-col">
                            <span>{row.branchName ?? '—'}</span>
                            <span className="text-xs text-muted-foreground">
                              {row.fundingTypeName ?? ''}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <div className="flex flex-col items-end">
                            <span className="tabular-nums">
                              {formatHours(row.weeklyPackageHours)}
                            </span>
                            {row.contractedSource ? (
                              <span className="text-[10px] text-muted-foreground">
                                {SOURCE_LABEL[row.contractedSource]}
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td
                          className={cn(
                            'px-3 py-2.5 text-right tabular-nums',
                            hasOverPackage && 'font-semibold text-amber-800 dark:text-amber-300',
                          )}
                        >
                          <div className="inline-flex flex-col items-end gap-1">
                            <span>{formatHours(row.assignedHours)}</span>
                            {hasOverPackage ? (
                              <Badge
                                variant="solid-warning"
                                size="sm"
                                className="whitespace-nowrap"
                                title={`Assigned ${formatHours(row.assignedHours)} vs package ${formatHours(row.weeklyPackageHours)}`}
                              >
                                +{formatHours(row.hoursOverPackage)} over package
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
                                  (row.assignedUtilisationPct ?? 0) > 100
                                    ? 'bg-warning'
                                    : 'bg-primary',
                                )}
                                style={{
                                  width: `${Math.min(100, Math.max(0, row.assignedUtilisationPct ?? 0))}%`,
                                }}
                              />
                            </div>
                            <span className="w-10 text-right tabular-nums text-xs">
                              {formatPct(row.assignedUtilisationPct)}
                            </span>
                          </div>
                        </td>
                        <td
                          className={cn(
                            'px-3 py-2.5 text-right tabular-nums',
                            hasOverPackage && 'font-semibold text-amber-800 dark:text-amber-300',
                          )}
                        >
                          {hasOverPackage ? formatHours(row.hoursOverPackage) : '—'}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums">
                          {row.workedVisits}
                          <span className="text-xs text-muted-foreground">
                            {' '}
                            / {row.assignedVisits}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <Badge variant="outline" className="whitespace-nowrap font-medium">
                            {BANDS.find(b => b.id === row.hourBand)?.label ?? row.hourBand}
                          </Badge>
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <div className="inline-flex items-center justify-end gap-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setDetailTarget({
                                  serviceUserId: row.serviceUserId,
                                  serviceUserName: row.serviceUserName,
                                  assignedHours: row.assignedHours,
                                  assignedVisits: row.assignedVisits,
                                  workedVisits: row.workedVisits,
                                })
                              }
                              data-testid={`service-user-hours-detail-${row.serviceUserId}`}
                            >
                              <ClipboardList className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                              Detail
                            </Button>
                            {canOpenServiceUser ? (
                              <Button variant="ghost" size="sm" asChild>
                                <Link
                                  to="/service-users/$serviceUserId/visit-plan"
                                  params={{ serviceUserId: row.serviceUserId }}
                                >
                                  Open
                                  <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                                </Link>
                              </Button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                      {expanded ? (
                        <tr className="border-b border-border bg-muted/10 last:border-0">
                          <td colSpan={11} className="px-4 py-3">
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
                                        <span className="text-[10px] text-muted-foreground">
                                          {day}
                                        </span>
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
                                  [
                                    'Package source',
                                    row.contractedSource
                                      ? SOURCE_LABEL[row.contractedSource]
                                      : '—',
                                  ],
                                  ['Authorised weekly hours', formatHours(row.authorisedWeeklyHours)],
                                  [
                                    'Remaining vs package',
                                    formatHours(row.remainingPackageHours),
                                  ],
                                  [
                                    'Worked utilisation',
                                    formatPct(row.utilisationPct),
                                  ],
                                  [
                                    'Hours over worked',
                                    row.hoursOverWorked > 0
                                      ? `+${formatHours(row.hoursOverWorked)}`
                                      : '—',
                                  ],
                                  ['Risk level', row.riskLevelName ?? '—'],
                                  ['Service start', row.serviceStartDate ?? '—'],
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

      <ServiceUserHoursDetailDialog
        open={detailTarget != null}
        onOpenChange={open => {
          if (!open) setDetailTarget(null)
        }}
        serviceUserId={detailTarget?.serviceUserId ?? null}
        serviceUserName={detailTarget?.serviceUserName}
        initialMonth={(data?.weekStart ?? weekStart).slice(0, 7)}
        listWeekStart={data?.weekStart ?? weekStart}
        listWeekEnd={data?.weekEnd}
        listWeekAssignedHours={detailTarget?.assignedHours}
        listWeekAssignedVisits={detailTarget?.assignedVisits}
        listWeekWorkedVisits={detailTarget?.workedVisits}
      />
    </div>
    </TooltipProvider>
  )
}
