import * as React from 'react'
import {
  CalendarOff,
  Download,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import { useAuthStore } from '@/features/auth/store'
import {
  useDeleteEmployeeAbsence,
  useEmployeeAbsences,
} from '@/features/employees/hooks/useEmployeeAbsences'
import {
  ABSENCE_PERMISSION_STATUSES,
  ABSENCE_TYPES,
  type AbsencePermissionStatus,
  type AbsenceType,
  type EmployeeAbsenceRow,
} from '@/features/employees/api/employee-absences.api'
import { EmployeeAbsenceFormDialog } from '@/features/employees/components/EmployeeAbsenceFormDialog'
import { PageHeader } from '@/shared/ui/page-elements'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Badge } from '@/shared/ui/badge'
import { ContentCard } from '@/shared/ui/content-section'
import { cn } from '@/shared/lib/utils'

const selectClass = 'flex h-9 rounded-md border border-input bg-background px-2 text-sm'

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function currentMonthKey(): string {
  const now = new Date()
  return `${now.getUTCFullYear()}-${pad2(now.getUTCMonth() + 1)}`
}

const DATE_TIME_FMT = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'UTC',
})

function formatDateTime(iso: string): string {
  return DATE_TIME_FMT.format(new Date(iso))
}

function yesNo(v: boolean): string {
  return v ? 'Yes' : 'No'
}

function csvEscape(value: string | number | boolean | null | undefined): string {
  const s = value == null ? '' : String(value)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

const CSV_HEADERS = [
  'Record ID',
  'Employee Name',
  'Absence Type',
  'From Date/Time',
  'To Date/Time',
  'Duration Days',
  'Duration Hours',
  'Month',
  'Year',
  'Month-Year',
  'Sickness Flag',
  'Last Minute Flag',
  'Notes',
  'Country Visited',
  'Tracker Status',
  'Return-to-Work Completed',
  'Evidence/Notes Received',
  'Manager Action / Follow-up',
  'Comments',
  'UKVI Sponsored Worker?',
  'CoS / Worker Ref',
  'Visa / RTW Expiry',
  'Absence Permission Status',
  'Evidence Type Required',
  'Evidence Held?',
  'Evidence Received Date',
  'Continuous Working Days Absent',
  'UKVI SMS Report Trigger',
  'SMS Report Deadline',
  'SMS Reported?',
  'SMS Report Date',
  'UKVI Risk Rating',
  'UKVI Action Required',
  'Responsible Person',
  'Next Review Date',
]

function exportCsv(rows: EmployeeAbsenceRow[], label: string) {
  const lines = rows.map(r =>
    [
      r.recordId,
      r.employeeName,
      r.absenceType,
      formatDateTime(r.fromDateTime),
      formatDateTime(r.toDateTime),
      r.durationDays,
      r.durationHours,
      r.month,
      r.year,
      r.monthYear,
      yesNo(r.sicknessFlag),
      yesNo(r.lastMinuteFlag),
      r.notes,
      r.countryVisited ?? 'No Recorded',
      r.trackerStatus ?? 'N/A',
      yesNo(r.returnToWorkCompleted),
      r.evidenceNotesStatus,
      r.managerAction,
      r.comments,
      yesNo(r.sponsored),
      r.cosWorkerRef ?? 'N/A',
      r.visaRtwExpiry,
      r.permissionStatus,
      r.evidenceTypeRequired,
      yesNo(r.evidenceHeld),
      r.evidenceReceivedDate,
      r.continuousWorkingDaysAbsent,
      r.smsTrigger,
      r.smsDeadline ?? 'N/A',
      r.smsReported == null ? 'N/A' : yesNo(r.smsReported),
      r.smsReportDate ?? 'N/A',
      r.riskRating,
      r.ukviActionRequired,
      r.responsiblePerson,
      r.nextReviewDate ?? 'N/A',
    ]
      .map(csvEscape)
      .join(','),
  )
  const blob = new Blob([[CSV_HEADERS.join(','), ...lines].join('\n')], {
    type: 'text/csv;charset=utf-8;',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `absence-tracker-${label}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function riskBadgeClass(risk: string): string {
  if (risk.startsWith('HIGH')) return 'border-destructive/40 bg-destructive/10 text-destructive'
  if (risk.startsWith('MEDIUM')) return 'border-warning/40 bg-warning/10 text-warning'
  if (risk.startsWith('LOW')) return 'border-success/40 bg-success/10 text-success'
  return ''
}

export default function EmployeeAbsencesPage() {
  const canRead = useAuthStore(
    s => s.can('employees.read') || s.can('employees.reports.read'),
  )
  const canManage = useAuthStore(s => s.can('employees.update') || s.can('employees.create'))

  const [month, setMonth] = React.useState(currentMonthKey)
  const [search, setSearch] = React.useState('')
  const [absenceType, setAbsenceType] = React.useState<AbsenceType | ''>('')
  const [permissionStatus, setPermissionStatus] = React.useState<AbsencePermissionStatus | ''>('')
  const [sponsoredOnly, setSponsoredOnly] = React.useState(false)
  const [sicknessOnly, setSicknessOnly] = React.useState(false)
  const [lastMinuteOnly, setLastMinuteOnly] = React.useState(false)
  const [smsTriggerOnly, setSmsTriggerOnly] = React.useState(false)

  const [formOpen, setFormOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<EmployeeAbsenceRow | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = React.useState<string | null>(null)

  const query = useEmployeeAbsences(
    {
      month: month || undefined,
      search: search.trim() || undefined,
      absenceType: absenceType || undefined,
      permissionStatus: permissionStatus || undefined,
      sponsoredOnly: sponsoredOnly || undefined,
      sicknessOnly: sicknessOnly || undefined,
      lastMinuteOnly: lastMinuteOnly || undefined,
      smsTriggerOnly: smsTriggerOnly || undefined,
    },
    canRead,
  )
  const deleteMutation = useDeleteEmployeeAbsence()

  const data = query.data
  const rows = data?.rows ?? []

  const hasFilters =
    Boolean(search || absenceType || permissionStatus) ||
    sponsoredOnly ||
    sicknessOnly ||
    lastMinuteOnly ||
    smsTriggerOnly

  if (!canRead) {
    return (
      <p className="text-sm text-muted-foreground">
        You do not have permission to view absence records.
      </p>
    )
  }

  const summaryCards = [
    { title: 'Records', value: String(data?.recordCount ?? 0), hint: 'Matching current filters' },
    {
      title: 'Total days',
      value: String(data?.totals.durationDays ?? 0),
      hint: `${data?.totals.durationHours ?? 0}h total duration`,
    },
    {
      title: 'Sickness',
      value: String(data?.totals.sicknessCount ?? 0),
      hint: `${data?.totals.lastMinuteCount ?? 0} last-minute`,
    },
    {
      title: 'Unauthorised',
      value: String(data?.totals.unauthorisedCount ?? 0),
      hint: 'Absence permission status',
    },
    {
      title: 'UKVI SMS triggers',
      value: String(data?.totals.smsTriggerCount ?? 0),
      hint: 'Sponsor reporting required',
    },
    {
      title: 'Sponsored workers',
      value: String(data?.totals.sponsoredCount ?? 0),
      hint: 'Rows for UKVI sponsored staff',
    },
  ]

  return (
    <div className="flex flex-col gap-4" data-testid="employee-absences-page">
      <PageHeader
        title="Absence tracker"
        description="UKVI-aware absence records — durations, evidence, sponsor (SMS) reporting triggers and review actions."
        icon={<CalendarOff className="h-4 w-4 text-muted-foreground" aria-hidden />}
        breadcrumb={[
          { label: 'Home', href: '/' },
          { label: 'Employee', href: '/employee/staff-list' },
          { label: 'Absences' },
        ]}
      />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="month"
          className={selectClass}
          value={month}
          aria-label="Month"
          onChange={e => setMonth(e.target.value)}
          data-testid="absences-month-picker"
        />
        {month ? (
          <Button type="button" size="sm" variant="ghost" onClick={() => setMonth('')}>
            All months
          </Button>
        ) : (
          <Button type="button" size="sm" variant="ghost" onClick={() => setMonth(currentMonthKey())}>
            This month
          </Button>
        )}

        <div className="relative min-w-[14rem] flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Search name, record ID, notes, CoS ref…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            data-testid="absences-search"
          />
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={rows.length === 0}
            onClick={() => exportCsv(rows, month || 'all')}
            data-testid="absences-export"
          >
            <Download className="mr-1.5 h-4 w-4" />
            Export CSV
          </Button>
          {canManage ? (
            <Button
              type="button"
              size="sm"
              onClick={() => {
                setEditing(null)
                setFormOpen(true)
              }}
              data-testid="absences-add"
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Record absence
            </Button>
          ) : null}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <select
          className={selectClass}
          value={absenceType}
          onChange={e => setAbsenceType(e.target.value as AbsenceType | '')}
          aria-label="Absence type"
          data-testid="absences-filter-type"
        >
          <option value="">Type: all</option>
          {ABSENCE_TYPES.map(t => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select
          className={selectClass}
          value={permissionStatus}
          onChange={e => setPermissionStatus(e.target.value as AbsencePermissionStatus | '')}
          aria-label="Permission status"
          data-testid="absences-filter-permission"
        >
          <option value="">Permission: all</option>
          {ABSENCE_PERMISSION_STATUSES.map(s => (
            <option key={s} value={s}>
              {s}
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
            <input
              type="checkbox"
              checked={sicknessOnly}
              onChange={e => setSicknessOnly(e.target.checked)}
            />
            Sickness only
          </label>
          <label className="flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={lastMinuteOnly}
              onChange={e => setLastMinuteOnly(e.target.checked)}
            />
            Last minute only
          </label>
          <label className="flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={smsTriggerOnly}
              onChange={e => setSmsTriggerOnly(e.target.checked)}
            />
            SMS triggers only
          </label>
          {hasFilters ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setSearch('')
                setAbsenceType('')
                setPermissionStatus('')
                setSponsoredOnly(false)
                setSicknessOnly(false)
                setLastMinuteOnly(false)
                setSmsTriggerOnly(false)
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

      <ContentCard className="overflow-hidden p-0">
        {query.isLoading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary" aria-hidden />
            <p className="text-sm text-muted-foreground">Loading absence records…</p>
          </div>
        ) : query.isError ? (
          <p className="p-4 text-sm text-destructive">Could not load absence records.</p>
        ) : rows.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">
            No absence records match the selected filters.
            {canManage ? ' Use “Record absence” to add the first one.' : ''}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[3200px] text-sm">
              <thead className="sticky top-0 z-10 bg-muted/95 backdrop-blur">
                <tr className="border-b border-border">
                  {[
                    'Record ID',
                    'Employee Name',
                    'Absence Type',
                    'From Date/Time',
                    'To Date/Time',
                    'Duration Days',
                    'Duration Hours',
                    'Month',
                    'Year',
                    'Month-Year',
                    'Sickness Flag',
                    'Last Minute Flag',
                    'Notes',
                    'Country Visited',
                    'Tracker Status',
                    'Return-to-Work Completed',
                    'Evidence/Notes Received',
                    'Manager Action / Follow-up',
                    'Comments',
                    'UKVI Sponsored Worker?',
                    'CoS / Worker Ref',
                    'Visa / RTW Expiry',
                    'Absence Permission Status',
                    'Evidence Type Required',
                    'Evidence Held?',
                    'Evidence Received Date',
                    'Continuous Working Days Absent',
                    'UKVI SMS Report Trigger',
                    'SMS Report Deadline',
                    'SMS Reported?',
                    'SMS Report Date',
                    'UKVI Risk Rating',
                    'UKVI Action Required',
                    'Responsible Person',
                    'Next Review Date',
                    'Actions',
                  ].map(label => (
                    <th
                      key={label}
                      className="whitespace-nowrap px-3 py-2.5 text-left font-medium text-muted-foreground"
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(row => (
                  <tr
                    key={row.id}
                    className="border-b border-border align-top last:border-0 hover:bg-muted/20"
                    data-testid={`absence-row-${row.recordId}`}
                  >
                    <td className="whitespace-nowrap px-3 py-2.5 font-mono text-xs">
                      {row.recordId}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 font-medium text-foreground">
                      {row.employeeName}
                      {!row.employeeActive ? (
                        <Badge variant="outline" className="ml-1.5 text-[10px]">
                          Inactive
                        </Badge>
                      ) : null}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5">
                      {row.absenceType}
                      {row.holidayId ? (
                        <Badge
                          variant="outline"
                          className="ml-1.5 border-primary/40 bg-primary/10 text-[10px] text-primary"
                          title="Auto-created from a holiday booking; dates follow the holiday record."
                        >
                          Booking
                        </Badge>
                      ) : null}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 tabular-nums">
                      {formatDateTime(row.fromDateTime)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 tabular-nums">
                      {formatDateTime(row.toDateTime)}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{row.durationDays}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      {row.durationHours.toFixed(2)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5">{row.month}</td>
                    <td className="px-3 py-2.5 tabular-nums">{row.year}</td>
                    <td className="whitespace-nowrap px-3 py-2.5">{row.monthYear}</td>
                    <td className="px-3 py-2.5">{yesNo(row.sicknessFlag)}</td>
                    <td className="px-3 py-2.5">{yesNo(row.lastMinuteFlag)}</td>
                    <td className="max-w-[12rem] px-3 py-2.5">
                      <span className="block truncate" title={row.notes ?? ''}>
                        {row.notes ?? '—'}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5">
                      {row.countryVisited ?? 'No Recorded'}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5">{row.trackerStatus ?? 'N/A'}</td>
                    <td className="px-3 py-2.5">{yesNo(row.returnToWorkCompleted)}</td>
                    <td className="whitespace-nowrap px-3 py-2.5">
                      {row.evidenceNotesStatus ?? '—'}
                    </td>
                    <td className="max-w-[12rem] px-3 py-2.5">
                      <span className="block truncate" title={row.managerAction ?? ''}>
                        {row.managerAction ?? '—'}
                      </span>
                    </td>
                    <td className="max-w-[12rem] px-3 py-2.5">
                      <span className="block truncate" title={row.comments ?? ''}>
                        {row.comments ?? '—'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge variant="outline">{yesNo(row.sponsored)}</Badge>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 font-mono text-xs">
                      {row.cosWorkerRef ?? 'N/A'}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5">{row.visaRtwExpiry ?? '—'}</td>
                    <td className="whitespace-nowrap px-3 py-2.5">
                      <Badge
                        variant="outline"
                        className={cn(
                          row.permissionStatus === 'Unauthorised'
                            ? 'border-destructive/40 bg-destructive/10 text-destructive'
                            : row.permissionStatus === 'Pending'
                              ? 'border-warning/40 bg-warning/10 text-warning'
                              : 'border-success/40 bg-success/10 text-success',
                        )}
                      >
                        {row.permissionStatus}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5">
                      {row.evidenceTypeRequired ?? '—'}
                    </td>
                    <td className="px-3 py-2.5">{yesNo(row.evidenceHeld)}</td>
                    <td className="whitespace-nowrap px-3 py-2.5">
                      {row.evidenceReceivedDate ?? '—'}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      {row.continuousWorkingDaysAbsent}
                      {row.continuousDaysOverridden ? ' *' : ''}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5">
                      <span className={cn(row.smsTriggered && 'font-medium text-destructive')}>
                        {row.smsTrigger}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5">{row.smsDeadline ?? 'N/A'}</td>
                    <td className="px-3 py-2.5">
                      {row.smsReported == null ? 'N/A' : yesNo(row.smsReported)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5">{row.smsReportDate ?? 'N/A'}</td>
                    <td className="whitespace-nowrap px-3 py-2.5">
                      <Badge variant="outline" className={riskBadgeClass(row.riskRating)}>
                        {row.riskRating}
                      </Badge>
                    </td>
                    <td className="max-w-[16rem] px-3 py-2.5">
                      <span className="block truncate" title={row.ukviActionRequired}>
                        {row.ukviActionRequired}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5">
                      {row.responsiblePerson ?? '—'}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5">{row.nextReviewDate ?? 'N/A'}</td>
                    <td className="whitespace-nowrap px-3 py-2.5">
                      {canManage ? (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditing(row)
                              setFormOpen(true)
                            }}
                            data-testid={`absence-edit-${row.recordId}`}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          {confirmDeleteId === row.id ? (
                            <Button
                              variant="destructive"
                              size="sm"
                              disabled={deleteMutation.isPending}
                              onClick={async () => {
                                await deleteMutation.mutateAsync(row.id)
                                setConfirmDeleteId(null)
                              }}
                            >
                              Confirm?
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setConfirmDeleteId(row.id)}
                              data-testid={`absence-delete-${row.recordId}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ContentCard>

      <p className="text-xs text-muted-foreground">
        * manually overridden continuous-days value. UKVI SMS triggers are derived for sponsored
        workers on unauthorised absence or 10+ continuous working days absent; the report deadline
        is 10 working days after the absence ends.
      </p>

      <EmployeeAbsenceFormDialog
        open={formOpen}
        onClose={() => {
          setFormOpen(false)
          setEditing(null)
        }}
        editing={editing}
      />
    </div>
  )
}
