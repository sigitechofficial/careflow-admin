import * as React from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  Loader2,
  Pencil,
  Search,
  X,
} from 'lucide-react'
import { Link } from '@tanstack/react-router'
import {
  useEmployeeHoursMonthlySummary,
  useUpsertEmployeeHoursMonthlyReview,
} from '@/features/employees/hooks/useEmployeeHours'
import type {
  EmployeeComplianceStatus,
  EmployeeHoursMonthlyRow,
  EmployeeReviewFilter,
} from '@/features/employees/api/employee-hours.api'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Badge } from '@/shared/ui/badge'
import { ContentCard } from '@/shared/ui/content-section'
import { EmployeeHoursGuideAccordion } from '@/features/employees/components/EmployeeHoursGuideAccordion'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { Label, Textarea } from '@/shared/ui/form-field'
import { cn } from '@/shared/lib/utils'

const STATUS_META: Record<
  EmployeeComplianceStatus,
  { label: string; className: string }
> = {
  compliant: { label: 'Compliant', className: 'border-success/40 bg-success/10 text-success' },
  action_required: {
    label: 'Action required',
    className: 'border-warning/40 bg-warning/10 text-warning',
  },
  breach: {
    label: 'Breach',
    className: 'border-destructive/40 bg-destructive/10 text-destructive',
  },
}

const REVIEW_FILTERS: { id: EmployeeReviewFilter; label: string }[] = [
  { id: 'all', label: 'Reviews: all' },
  { id: 'completed', label: 'Reviews: completed' },
  { id: 'pending', label: 'Reviews: pending' },
]

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function currentMonthKey(): string {
  const now = new Date()
  return `${now.getUTCFullYear()}-${pad2(now.getUTCMonth() + 1)}`
}

function shiftMonth(monthKey: string, delta: number): string {
  const [y = 0, m = 1] = monthKey.split('-').map(Number)
  const d = new Date(Date.UTC(y, m - 1 + delta, 1))
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}`
}

function formatHours(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—'
  return n.toFixed(n % 1 === 0 ? 0 : 2)
}

/** Excess hours across week blocks vs CoS / effective weekly cap. */
function monthlyOverHours(row: EmployeeHoursMonthlyRow): {
  capHours: number
  peakWeekHours: number
  overHours: number
} | null {
  const cap = row.effectiveCapHours ?? row.cosWeeklyHours
  if (cap == null || !Number.isFinite(cap) || cap <= 0) return null
  let overHours = 0
  let peakWeekHours = 0
  for (const week of row.weekHours) {
    const h = Number(week) || 0
    peakWeekHours = Math.max(peakWeekHours, h)
    overHours += Math.max(0, h - cap)
  }
  overHours = Math.round(overHours * 100) / 100
  if (overHours <= 0) return null
  return { capHours: cap, peakWeekHours, overHours }
}

function csvEscape(value: string | number | boolean | null | undefined): string {
  const s = value == null ? '' : String(value)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function exportCsv(rows: EmployeeHoursMonthlyRow[], monthKey: string) {
  const header = [
    'Record ID',
    'Month',
    'Year',
    'Worker ID',
    'First Name',
    'Surname',
    'Full Name',
    'CoS Weekly Hours',
    'Week 1 Hours',
    'Week 2 Hours',
    'Week 3 Hours',
    'Week 4 Hours',
    'Week 5 Hours',
    'Total Monthly Hours',
    'SMS Reporting Required?',
    'Monthly Review Completed?',
    'Compliance Status',
    'Comments',
    'Location / branch',
  ]
  const lines = rows.map(r =>
    [
      r.recordId,
      r.month,
      r.year,
      r.workerId,
      r.firstName,
      r.surname,
      r.fullName,
      r.cosWeeklyHours,
      ...r.weekHours,
      r.totalMonthlyHours,
      r.smsReportingRequired ? 'Yes' : 'No',
      r.reviewCompleted ? 'Yes' : 'No',
      STATUS_META[r.complianceStatus].label,
      r.comments,
      r.branchName,
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
  a.download = `employee-hours-compliance-${monthKey}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export function EmployeeHoursMonthlyPanel({ canEdit }: { canEdit: boolean }) {
  const [month, setMonth] = React.useState(currentMonthKey)
  const [search, setSearch] = React.useState('')
  const [locationId, setLocationId] = React.useState('')
  const [complianceStatus, setComplianceStatus] = React.useState<EmployeeComplianceStatus | ''>('')
  const [reviewFilter, setReviewFilter] = React.useState<EmployeeReviewFilter>('all')
  const [smsOnly, setSmsOnly] = React.useState(false)
  const [sponsoredOnly, setSponsoredOnly] = React.useState(false)
  const [includeInactive, setIncludeInactive] = React.useState(false)

  const [editing, setEditing] = React.useState<EmployeeHoursMonthlyRow | null>(null)
  const [draftReviewCompleted, setDraftReviewCompleted] = React.useState(false)
  const [draftSms, setDraftSms] = React.useState<'auto' | 'yes' | 'no'>('auto')
  const [draftStatus, setDraftStatus] = React.useState<'auto' | EmployeeComplianceStatus>('auto')
  const [draftComments, setDraftComments] = React.useState('')

  const query = useEmployeeHoursMonthlySummary({
    month,
    search: search.trim() || undefined,
    locationId: locationId || undefined,
    complianceStatus: complianceStatus || undefined,
    reviewFilter: reviewFilter === 'all' ? undefined : reviewFilter,
    smsOnly: smsOnly || undefined,
    sponsoredOnly: sponsoredOnly || undefined,
    includeInactive: includeInactive || undefined,
  })
  const mutation = useUpsertEmployeeHoursMonthlyReview()

  const data = query.data
  const rows = data?.rows ?? []

  const overHoursEmployees = React.useMemo(
    () =>
      rows
        .map(row => {
          const over = monthlyOverHours(row)
          if (!over) return null
          return {
            employeeId: row.employeeId,
            employeeName: row.fullName,
            contractedHours: over.capHours,
            assignedHours: over.peakWeekHours,
            overHours: over.overHours,
          }
        })
        .filter((r): r is NonNullable<typeof r> => r != null),
    [rows],
  )

  const openEdit = (row: EmployeeHoursMonthlyRow) => {
    setEditing(row)
    setDraftReviewCompleted(row.reviewCompleted)
    setDraftSms(row.smsOverridden ? (row.smsReportingRequired ? 'yes' : 'no') : 'auto')
    setDraftStatus(row.complianceOverridden ? row.complianceStatus : 'auto')
    setDraftComments(row.comments ?? '')
  }

  const handleSave = async () => {
    if (!editing) return
    await mutation.mutateAsync({
      employeeId: editing.employeeId,
      month,
      reviewCompleted: draftReviewCompleted,
      smsReportingRequired: draftSms === 'auto' ? null : draftSms === 'yes',
      complianceStatusOverride: draftStatus === 'auto' ? null : draftStatus,
      comments: draftComments.trim() || null,
    })
    setEditing(null)
  }

  const hasFilters =
    Boolean(search || locationId || complianceStatus) ||
    reviewFilter !== 'all' ||
    smsOnly ||
    sponsoredOnly

  const summaryCards = [
    { title: 'Employees', value: String(data?.employeeCount ?? 0), hint: 'Matching current filters' },
    {
      title: 'Total monthly hours',
      value: formatHours(data?.totals.totalMonthlyHours),
      hint: `${data?.monthName ?? ''} ${data?.year ?? ''}`,
    },
    {
      title: 'Sponsored workers',
      value: String(data?.totals.sponsoredCount ?? 0),
      hint: 'Skilled / Health and Care visas',
    },
    {
      title: 'SMS reporting required',
      value: String(data?.totals.smsRequiredCount ?? 0),
      hint: 'Report via UKVI Sponsor Management System',
    },
    {
      title: 'Reviews completed',
      value: `${data?.totals.reviewsCompletedCount ?? 0} / ${data?.employeeCount ?? 0}`,
      hint: `${data?.totals.reviewsPendingCount ?? 0} pending`,
    },
    {
      title: 'Compliance',
      value: String(data?.totals.statusCounts.breach ?? 0),
      hint: `breaches · ${data?.totals.statusCounts.action_required ?? 0} action required`,
    },
  ]

  return (
    <div className="flex flex-col gap-4" data-testid="employee-hours-monthly">
      {/* Month navigation + search + export */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="icon"
          variant="outline"
          aria-label="Previous month"
          onClick={() => setMonth(m => shiftMonth(m, -1))}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-[10rem] text-center">
          <p className="text-sm font-semibold text-foreground">
            {data ? `${data.monthName} ${data.year}` : month}
          </p>
          <p className="text-xs text-muted-foreground">Weeks: 1–7 · 8–14 · 15–21 · 22–28 · 29+</p>
        </div>
        <Button
          type="button"
          size="icon"
          variant="outline"
          aria-label="Next month"
          onClick={() => setMonth(m => shiftMonth(m, 1))}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <input
          type="month"
          className="flex h-9 rounded-md border border-input bg-background px-2 text-sm"
          value={month}
          aria-label="Jump to month"
          onChange={e => {
            if (/^\d{4}-\d{2}$/.test(e.target.value)) setMonth(e.target.value)
          }}
          data-testid="employee-hours-month-picker"
        />
        <Button type="button" size="sm" variant="ghost" onClick={() => setMonth(currentMonthKey())}>
          This month
        </Button>

        <div className="relative ml-auto min-w-[14rem] flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Search name, worker or record ID…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            data-testid="employee-hours-monthly-search"
          />
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={rows.length === 0}
          onClick={() => exportCsv(rows, data?.month ?? month)}
          data-testid="employee-hours-monthly-export"
        >
          <Download className="mr-1.5 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <select
          className="flex h-9 max-w-[13rem] rounded-md border border-input bg-background px-2 text-sm"
          value={locationId}
          onChange={e => setLocationId(e.target.value)}
          aria-label="Location or branch"
          data-testid="employee-hours-filter-location"
        >
          <option value="">Location / branch: all</option>
          {(data?.facets.locations ?? []).map(location => (
            <option key={location.id} value={location.id}>
              {location.name} ({location.count})
            </option>
          ))}
        </select>
        <select
          className="flex h-9 rounded-md border border-input bg-background px-2 text-sm"
          value={complianceStatus}
          onChange={e => setComplianceStatus(e.target.value as EmployeeComplianceStatus | '')}
          aria-label="Compliance status"
          data-testid="employee-hours-filter-compliance"
        >
          <option value="">Compliance: all</option>
          <option value="compliant">Compliant</option>
          <option value="action_required">Action required</option>
          <option value="breach">Breach</option>
        </select>
        <select
          className="flex h-9 rounded-md border border-input bg-background px-2 text-sm"
          value={reviewFilter}
          onChange={e => setReviewFilter(e.target.value as EmployeeReviewFilter)}
          aria-label="Monthly review"
          data-testid="employee-hours-filter-review"
        >
          {REVIEW_FILTERS.map(f => (
            <option key={f.id} value={f.id}>
              {f.label}
            </option>
          ))}
        </select>
        <div className="ml-auto flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <label className="flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={sponsoredOnly}
              onChange={e => setSponsoredOnly(e.target.checked)}
            />
            Sponsored only
          </label>
          <label className="flex items-center gap-1.5">
            <input type="checkbox" checked={smsOnly} onChange={e => setSmsOnly(e.target.checked)} />
            SMS required only
          </label>
          <label className="flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={includeInactive}
              onChange={e => setIncludeInactive(e.target.checked)}
            />
            Include inactive
          </label>
          {hasFilters ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setSearch('')
                setLocationId('')
                setComplianceStatus('')
                setReviewFilter('all')
                setSmsOnly(false)
                setSponsoredOnly(false)
              }}
            >
              <X className="mr-1 h-3.5 w-3.5" />
              Clear
            </Button>
          ) : null}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {summaryCards.map(card => (
          <ContentCard key={card.title} className="space-y-1 p-4">
            <p className="text-xs font-medium text-muted-foreground">{card.title}</p>
            <p className="text-xl font-semibold tabular-nums text-foreground">{card.value}</p>
            <p className="text-xs text-muted-foreground">{card.hint}</p>
          </ContentCard>
        ))}
      </div>

      <EmployeeHoursGuideAccordion
        view="monthly"
        overHoursEmployees={overHoursEmployees}
        employeeCount={data?.employeeCount ?? rows.length}
      />

      <ContentCard className="overflow-hidden p-0">
        {query.isLoading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary" aria-hidden />
            <p className="text-sm text-muted-foreground">Loading monthly compliance report…</p>
          </div>
        ) : query.isError ? (
          <p className="p-4 text-sm text-destructive">Could not load the monthly report.</p>
        ) : rows.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">
            No employees match the selected month and filters.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1680px] text-sm">
              <thead className="sticky top-0 z-10 bg-muted/95 backdrop-blur">
                <tr className="border-b border-border">
                  {[
                    ['Record ID', 'left'],
                    ['Month', 'left'],
                    ['Year', 'right'],
                    ['Worker ID', 'left'],
                    ['First Name', 'left'],
                    ['Surname', 'left'],
                    ['Full Name', 'left'],
                    ['CoS Weekly Hours', 'right'],
                    ['Week 1 Hours', 'right'],
                    ['Week 2 Hours', 'right'],
                    ['Week 3 Hours', 'right'],
                    ['Week 4 Hours', 'right'],
                    ['Week 5 Hours', 'right'],
                    ['Total Monthly Hours', 'right'],
                    ['SMS Reporting Required?', 'left'],
                    ['Monthly Review Completed?', 'left'],
                    ['Compliance Status', 'left'],
                    ['Comments', 'left'],
                    ['Location / branch', 'left'],
                    ['Action', 'right'],
                  ].map(([label, align]) => (
                    <th
                      key={label}
                      className={cn(
                        'whitespace-nowrap px-3 py-2.5 font-medium text-muted-foreground',
                        align === 'right' ? 'text-right' : 'text-left',
                      )}
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(row => {
                  const status = STATUS_META[row.complianceStatus]
                  const overCap = (h: number) =>
                    row.effectiveCapHours != null && h > row.effectiveCapHours
                  return (
                    <tr
                      key={row.employeeId}
                      className="border-b border-border last:border-0 hover:bg-muted/20"
                      data-testid={`employee-hours-monthly-row-${row.employeeId}`}
                    >
                      <td className="whitespace-nowrap px-3 py-2.5 font-mono text-xs">
                        {row.recordId}
                      </td>
                      <td className="px-3 py-2.5">{row.month}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{row.year}</td>
                      <td className="px-3 py-2.5">
                        {row.workerId}
                        {!row.isActive ? (
                          <Badge variant="outline" className="ml-1.5 text-[10px]">
                            Inactive
                          </Badge>
                        ) : null}
                      </td>
                      <td className="px-3 py-2.5">{row.firstName || '—'}</td>
                      <td className="px-3 py-2.5">{row.surname || '—'}</td>
                      <td className="px-3 py-2.5 font-medium text-foreground">
                        {row.fullName}
                        {row.sponsored ? (
                          <Badge variant="outline" className="ml-1.5 text-[10px]">
                            Sponsored
                          </Badge>
                        ) : null}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">
                        {formatHours(row.cosWeeklyHours)}
                      </td>
                      {row.weekHours.map((h, i) => (
                        <td
                          key={i}
                          className={cn(
                            'px-3 py-2.5 text-right tabular-nums',
                            overCap(h) && 'font-semibold text-destructive',
                          )}
                        >
                          {h > 0 ? formatHours(h) : '—'}
                        </td>
                      ))}
                      <td className="px-3 py-2.5 text-right tabular-nums font-semibold">
                        {formatHours(row.totalMonthlyHours)}
                      </td>
                      <td className="px-3 py-2.5">
                        <Badge
                          variant="outline"
                          className={cn(
                            row.smsReportingRequired
                              ? 'border-warning/40 bg-warning/10 text-warning'
                              : '',
                          )}
                        >
                          {row.smsReportingRequired ? 'Yes' : 'No'}
                          {row.smsOverridden ? ' *' : ''}
                        </Badge>
                      </td>
                      <td className="px-3 py-2.5">
                        <Badge
                          variant="outline"
                          className={cn(
                            row.reviewCompleted
                              ? 'border-success/40 bg-success/10 text-success'
                              : 'border-warning/40 bg-warning/10 text-warning',
                          )}
                        >
                          {row.reviewCompleted ? 'Yes' : 'No'}
                        </Badge>
                      </td>
                      <td className="px-3 py-2.5">
                        <Badge variant="outline" className={status.className}>
                          {status.label}
                          {row.complianceOverridden ? ' *' : ''}
                        </Badge>
                      </td>
                      <td className="max-w-[16rem] px-3 py-2.5">
                        <span className="block truncate text-xs" title={row.comments ?? ''}>
                          {row.comments ?? '—'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">{row.branchName ?? '—'}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right">
                        {canEdit ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEdit(row)}
                            data-testid={`employee-hours-monthly-edit-${row.employeeId}`}
                          >
                            <Pencil className="mr-1 h-3.5 w-3.5" />
                            Review
                          </Button>
                        ) : null}
                        <Button variant="ghost" size="sm" asChild>
                          <Link
                            to="/employee/$employeeId/edit"
                            params={{ employeeId: row.employeeId }}
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </ContentCard>

      <p className="text-xs text-muted-foreground">
        * manually overridden value. SMS reporting is auto-flagged for sponsored workers when a
        completed week is over the weekly cap or under{' '}
        {Math.round((data?.smsUnderHoursRatio ?? 0.8) * 100)}% of CoS weekly hours.
      </p>

      {/* Review edit dialog */}
      <Dialog open={editing != null} onOpenChange={open => !open && setEditing(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Monthly review — {editing?.fullName}</DialogTitle>
            <DialogDescription>
              {data?.monthName} {data?.year} · {editing?.recordId}
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
          <div className="flex flex-col gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={draftReviewCompleted}
                onChange={e => setDraftReviewCompleted(e.target.checked)}
              />
              Monthly review completed
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>SMS reporting required</Label>
                <select
                  className="flex h-9 rounded-md border border-input bg-background px-2 text-sm"
                  value={draftSms}
                  onChange={e => setDraftSms(e.target.value as 'auto' | 'yes' | 'no')}
                >
                  <option value="auto">Auto (derived)</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Compliance status</Label>
                <select
                  className="flex h-9 rounded-md border border-input bg-background px-2 text-sm"
                  value={draftStatus}
                  onChange={e =>
                    setDraftStatus(e.target.value as 'auto' | EmployeeComplianceStatus)
                  }
                >
                  <option value="auto">Auto (derived)</option>
                  <option value="compliant">Compliant</option>
                  <option value="action_required">Action required</option>
                  <option value="breach">Breach</option>
                </select>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="monthly-review-comments">Comments</Label>
              <Textarea
                id="monthly-review-comments"
                rows={4}
                placeholder="Notes for this month's compliance review…"
                value={draftComments}
                onChange={e => setDraftComments(e.target.value)}
              />
            </div>
          </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSave} disabled={mutation.isPending}>
              {mutation.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
              Save review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
