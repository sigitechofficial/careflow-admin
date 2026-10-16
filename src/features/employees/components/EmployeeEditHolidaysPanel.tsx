import * as React from 'react'
import { CalendarDays, ClipboardList, ExternalLink, Loader2, PenLine, Plus, Trash2 } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { ApiError } from '@/shared/api/api-client'
import { getApiBaseUrl } from '@/shared/lib/api-base'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { useAuthStore } from '@/features/auth/store'
import { type EmployeeHolidayRow } from '@/features/employees/api/employees.api'
import { previewEmployeeScheduleImpact } from '@/features/employees/api/employees.api'
import {
  useCreateEmployeeHoliday,
  useDeleteEmployeeHoliday,
  useUpdateEmployeeHoliday,
} from '@/features/employees/hooks/useEmployeeMutations'
import { useEmployeeHolidays } from '@/features/employees/hooks/useEmployeeTabs'
import {
  useDeleteEmployeeAbsence,
  useEmployeeAbsences,
} from '@/features/employees/hooks/useEmployeeAbsences'
import type { EmployeeAbsenceRow } from '@/features/employees/api/employee-absences.api'
import { EmployeeAbsenceFormDialog } from '@/features/employees/components/EmployeeAbsenceFormDialog'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Checkbox } from '@/shared/ui/toggle-controls'
import { Label } from '@/shared/ui/form-field'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { Input } from '@/shared/ui/input'
import { cn } from '@/shared/lib/utils'

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function formatHolidayDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return `${pad2(d.getUTCDate())}-${pad2(d.getUTCMonth() + 1)}-${d.getUTCFullYear()}`
}

function toDateInputValue(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`
}

function calendarDateToIso(date: string): string {
  return new Date(`${date}T12:00:00.000Z`).toISOString()
}

const ABSENCE_DATE_TIME_FMT = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'UTC',
})

function riskBadgeClass(risk: string): string {
  if (risk.startsWith('HIGH')) return 'border-destructive/40 bg-destructive/10 text-destructive'
  if (risk.startsWith('MEDIUM')) return 'border-warning/40 bg-warning/10 text-warning'
  if (risk.startsWith('LOW')) return 'border-success/40 bg-success/10 text-success'
  return ''
}

function SectionHeader({
  icon,
  iconClassName,
  title,
  description,
  action,
}: {
  icon: React.ReactNode
  iconClassName: string
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-3">
        <span
          className={cn(
            'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
            iconClassName,
          )}
        >
          {icon}
        </span>
        <div className="min-w-0 pt-0.5">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
        </div>
      </div>
      {action ? <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div> : null}
    </div>
  )
}

/** Compact labelled figure used for the absence totals strip. */
function StatChip({
  label,
  value,
  tone = 'default',
}: {
  label: string
  value: React.ReactNode
  tone?: 'default' | 'warning' | 'danger'
}) {
  return (
    <div
      className={cn(
        'rounded-lg border px-3 py-2',
        tone === 'danger'
          ? 'border-destructive/30 bg-destructive/5'
          : tone === 'warning'
            ? 'border-warning/30 bg-warning/5'
            : 'border-border bg-muted/30',
      )}
    >
      <div
        className={cn(
          'text-base font-semibold tabular-nums',
          tone === 'danger'
            ? 'text-destructive'
            : tone === 'warning'
              ? 'text-warning'
              : 'text-foreground',
        )}
      >
        {value}
      </div>
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  )
}

const TABLE_WRAP = 'overflow-x-auto rounded-lg border border-border'
const TH_BASE =
  'border-b border-border px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground'

function EmployeeAbsenceRecordsSection({
  employeeId,
  canUpdate,
  queryEnabled,
}: {
  employeeId: string
  canUpdate: boolean
  queryEnabled: boolean
}) {
  const absencesQuery = useEmployeeAbsences({ employeeId }, queryEnabled)
  const deleteMutation = useDeleteEmployeeAbsence()

  const [formOpen, setFormOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<EmployeeAbsenceRow | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = React.useState<string | null>(null)

  const rows = absencesQuery.data?.rows ?? []
  const totals = absencesQuery.data?.totals
  const employeeName = rows[0]?.employeeName

  const onDelete = async (row: EmployeeAbsenceRow) => {
    try {
      await deleteMutation.mutateAsync(row.id)
      toastSuccess('Absence removed', `${row.recordId} was deleted.`)
    } catch (e) {
      toastApiError(e, 'Delete failed.')
    } finally {
      setConfirmDeleteId(null)
    }
  }

  return (
    <div className="space-y-3" data-testid="employee-edit-absences-section">
      <SectionHeader
        icon={<ClipboardList className="h-4 w-4" aria-hidden />}
        iconClassName="bg-sky-500/10 text-sky-700 dark:text-sky-300"
        title="Absence records (UKVI tracker)"
        description="Sponsored-worker absences tracked for UKVI compliance."
        action={
          <>
            {canUpdate ? (
              <Button
                type="button"
                size="sm"
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={() => {
                  setEditing(null)
                  setFormOpen(true)
                }}
                data-testid="employee-edit-absences-add"
              >
                Record absence
              </Button>
            ) : null}
            <Link
              to="/employee/absences"
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
            >
              Open absence tracker
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </>
        }
      />

      {totals ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <StatChip label="Records" value={rows.length} />
          <StatChip label={totals.durationDays === 1 ? 'Day' : 'Days'} value={totals.durationDays} />
          <StatChip label="Hours" value={`${totals.durationHours}h`} />
          <StatChip label="Sickness" value={totals.sicknessCount} />
          <StatChip
            label="Unauthorised"
            value={totals.unauthorisedCount}
            tone={totals.unauthorisedCount > 0 ? 'danger' : 'default'}
          />
          <StatChip
            label="UKVI SMS"
            value={totals.smsTriggerCount}
            tone={totals.smsTriggerCount > 0 ? 'warning' : 'default'}
          />
        </div>
      ) : null}

      {absencesQuery.isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading…
        </div>
      ) : absencesQuery.isError ? (
        <p className="text-sm text-destructive">Could not load absence records.</p>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/20 px-4 py-8 text-center">
          <ClipboardList className="h-6 w-6 text-muted-foreground" aria-hidden />
          <p className="text-sm text-muted-foreground">
            No absence records yet.
            {canUpdate ? ' Use “Record absence” to add the first one.' : ''}
          </p>
        </div>
      ) : (
        <div className={TABLE_WRAP}>
          <table className="w-full min-w-[1100px] border-collapse text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className={cn(TH_BASE, 'text-left')}>Record ID</th>
                <th className={cn(TH_BASE, 'text-left')}>Type</th>
                <th className={cn(TH_BASE, 'text-left')}>From</th>
                <th className={cn(TH_BASE, 'text-left')}>To</th>
                <th className={cn(TH_BASE, 'text-right')}>Days</th>
                <th className={cn(TH_BASE, 'text-right')}>Hours</th>
                <th className={cn(TH_BASE, 'text-left')}>Permission</th>
                <th className={cn(TH_BASE, 'text-left')}>Flags</th>
                <th className={cn(TH_BASE, 'text-left')}>Evidence</th>
                <th className={cn(TH_BASE, 'text-left')}>UKVI risk</th>
                <th className={cn(TH_BASE, 'text-left')}>Notes</th>
                {canUpdate ? <th className={cn(TH_BASE, 'text-left')}>Actions</th> : null}
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr
                  key={row.id}
                  className="border-b border-border align-top transition-colors last:border-0 hover:bg-muted/30"
                >
                  <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">{row.recordId}</td>
                      <td className="whitespace-nowrap px-3 py-2">
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
                  <td className="whitespace-nowrap px-3 py-2 tabular-nums">
                    {ABSENCE_DATE_TIME_FMT.format(new Date(row.fromDateTime))}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 tabular-nums">
                    {ABSENCE_DATE_TIME_FMT.format(new Date(row.toDateTime))}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{row.durationDays}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {row.durationHours.toFixed(2)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
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
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">
                    {[
                      row.sicknessFlag ? 'Sickness' : null,
                      row.lastMinuteFlag ? 'Last minute' : null,
                      row.returnToWorkCompleted ? 'RTW done' : null,
                    ]
                      .filter(Boolean)
                      .join(' · ') || '—'}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">
                    {row.evidenceHeld
                      ? `Held${row.evidenceReceivedDate ? ` · ${row.evidenceReceivedDate}` : ''}`
                      : 'Not held'}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    <Badge variant="outline" className={riskBadgeClass(row.riskRating)}>
                      {row.riskRating}
                    </Badge>
                  </td>
                  <td className="max-w-[12rem] px-3 py-2 text-muted-foreground">
                    <span className="block truncate" title={row.notes ?? ''}>
                      {row.notes ?? '—'}
                    </span>
                  </td>
                  {canUpdate ? (
                    <td className="whitespace-nowrap px-3 py-2">
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setEditing(row)
                            setFormOpen(true)
                          }}
                        >
                          <PenLine className="h-4 w-4" />
                        </Button>
                        {confirmDeleteId === row.id ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            disabled={deleteMutation.isPending}
                            onClick={() => void onDelete(row)}
                          >
                            Confirm?
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() => setConfirmDeleteId(row.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <EmployeeAbsenceFormDialog
        open={formOpen}
        onClose={() => {
          setFormOpen(false)
          setEditing(null)
        }}
        editing={editing}
        fixedEmployeeId={employeeId}
        fixedEmployeeName={employeeName}
      />
    </div>
  )
}

export function EmployeeEditHolidaysPanel({ employeeId }: { employeeId: string }) {
  const apiConfigured = Boolean(getApiBaseUrl())
  const accessToken = useAuthStore((s) => s.accessToken)
  const jwtPresent = Boolean(accessToken?.includes('.'))
  const canUpdate = useAuthStore((s) => s.can('employees.update'))
  const queryEnabled = apiConfigured && jwtPresent && Boolean(employeeId)

  const holidaysQuery = useEmployeeHolidays(employeeId, queryEnabled)
  const createMutation = useCreateEmployeeHoliday(employeeId)
  const updateMutation = useUpdateEmployeeHoliday(employeeId)
  const deleteMutation = useDeleteEmployeeHoliday(employeeId)

  const rows = holidaysQuery.data ?? []
  const loading = holidaysQuery.isLoading
  const error =
    holidaysQuery.error instanceof ApiError
      ? holidaysQuery.error.message
      : holidaysQuery.error
        ? 'Could not load holidays.'
        : null

  const [modalOpen, setModalOpen] = React.useState(false)
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [formStartDate, setFormStartDate] = React.useState('')
  const [formEndDate, setFormEndDate] = React.useState('')
  const [formNotes, setFormNotes] = React.useState('')
  const [formApplyToSchedule, setFormApplyToSchedule] = React.useState(true)
  const [formError, setFormError] = React.useState<string | null>(null)
  const [impactPreview, setImpactPreview] = React.useState<number | null>(null)
  const [impactPreviewLoading, setImpactPreviewLoading] = React.useState(false)
  const saving = createMutation.isPending || updateMutation.isPending

  React.useEffect(() => {
    if (!modalOpen || editingId || !formApplyToSchedule || !formStartDate.trim() || !formEndDate.trim()) {
      setImpactPreview(null)
      return
    }
    const timer = window.setTimeout(() => {
      void (async () => {
        setImpactPreviewLoading(true)
        try {
          const result = await previewEmployeeScheduleImpact(employeeId, {
            startDate: formStartDate.trim(),
            endDate: formEndDate.trim(),
          })
          setImpactPreview(result.jobsUnallocated)
        } catch {
          setImpactPreview(null)
        } finally {
          setImpactPreviewLoading(false)
        }
      })()
    }, 400)
    return () => window.clearTimeout(timer)
  }, [modalOpen, editingId, formApplyToSchedule, formStartDate, formEndDate, employeeId])

  const openCreate = () => {
    setEditingId(null)
    setFormStartDate('')
    setFormEndDate('')
    setFormNotes('')
    setFormApplyToSchedule(true)
    setFormError(null)
    setModalOpen(true)
  }

  const openEdit = (row: EmployeeHolidayRow) => {
    setEditingId(row.id)
    setFormStartDate(toDateInputValue(row.startDate))
    setFormEndDate(toDateInputValue(row.endDate))
    setFormNotes(row.notes ?? '')
    setFormApplyToSchedule(true)
    setFormError(null)
    setModalOpen(true)
  }

  const onSave = async () => {
    if (!formStartDate.trim() || !formEndDate.trim()) {
      setFormError('Start and end dates are required.')
      return
    }
    const body = {
      startDate: calendarDateToIso(formStartDate.trim()),
      endDate: calendarDateToIso(formEndDate.trim()),
      notes: formNotes.trim() || undefined,
      applyToSchedule: formApplyToSchedule,
    }
    setFormError(null)
    try {
      if (editingId) {
        await updateMutation.mutateAsync({ holidayId: editingId, body })
        toastSuccess('Holiday updated', 'Leave record saved.')
      } else {
        const result = await createMutation.mutateAsync(body)
        const unallocated = result.scheduleImpact?.jobsUnallocated ?? 0
        toastSuccess(
          'Holiday recorded',
          unallocated > 0
            ? `${unallocated} scheduled visit${unallocated === 1 ? '' : 's'} unallocated on the rota.`
            : 'Leave record saved.',
        )
      }
      setModalOpen(false)
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : 'Save failed.')
    }
  }

  const onDelete = async (row: EmployeeHolidayRow) => {
    if (!window.confirm('Delete this holiday record?')) return
    try {
      await deleteMutation.mutateAsync(row.id)
      toastSuccess('Holiday removed', 'The leave record was deleted.')
    } catch (e) {
      toastApiError(e, 'Delete failed.')
    }
  }

  return (
    <div className="space-y-6" data-testid="employee-edit-holidays-panel">
      <div className="space-y-4">
      <SectionHeader
        icon={<CalendarDays className="h-4 w-4" aria-hidden />}
        iconClassName="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
        title="Holiday & leave records"
        description="Booked annual leave and time off for this carer."
        action={
          canUpdate ? (
            <Button
              type="button"
              size="sm"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={openCreate}
              data-testid="employee-edit-holidays-add"
            >
              Add holiday
            </Button>
          ) : null
        }
      />

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading…
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/20 px-4 py-8 text-center">
          <CalendarDays className="h-6 w-6 text-muted-foreground" aria-hidden />
          <p className="text-sm text-muted-foreground">No holiday records yet.</p>
          {canUpdate ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={openCreate}
            >
              Add holiday
            </Button>
          ) : null}
        </div>
      ) : (
        <div className={TABLE_WRAP}>
          <table className="w-full min-w-[480px] border-collapse text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className={cn(TH_BASE, 'text-left')}>Start</th>
                <th className={cn(TH_BASE, 'text-left')}>End</th>
                <th className={cn(TH_BASE, 'text-left')}>Notes</th>
                {canUpdate ? <th className={cn(TH_BASE, 'text-right')}>Actions</th> : null}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-border transition-colors last:border-0 hover:bg-muted/30"
                >
                  <td className="px-3 py-2.5 tabular-nums">{formatHolidayDate(row.startDate)}</td>
                  <td className="px-3 py-2.5 tabular-nums">{formatHolidayDate(row.endDate)}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{row.notes?.trim() || '—'}</td>
                  {canUpdate ? (
                    <td className="px-3 py-2.5 text-right">
                      <div className="flex justify-end gap-1">
                        <Button type="button" size="icon" variant="ghost" onClick={() => openEdit(row)}>
                          <PenLine className="h-4 w-4" />
                        </Button>
                        <Button type="button" size="icon" variant="ghost" onClick={() => void onDelete(row)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit holiday' : 'Add holiday'}</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4">
            {formError ? <p className="text-sm text-destructive">{formError}</p> : null}
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Start date</label>
                <Input type="date" value={formStartDate} onChange={(e) => setFormStartDate(e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">End date</label>
                <Input type="date" value={formEndDate} onChange={(e) => setFormEndDate(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Notes</label>
              <textarea
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                rows={3}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            {!editingId ? (
              <div className="flex items-start gap-2 rounded-md border border-border bg-muted/30 p-3">
                <Checkbox
                  id="holiday-apply-schedule"
                  checked={formApplyToSchedule}
                  onCheckedChange={(checked) => setFormApplyToSchedule(checked === true)}
                />
                <Label htmlFor="holiday-apply-schedule" className="cursor-pointer text-sm leading-snug">
                  Unallocate this carer from scheduled visits in this date range
                </Label>
              </div>
            ) : null}
            {!editingId && formApplyToSchedule && formStartDate.trim() && formEndDate.trim() ? (
              <p className="text-xs text-muted-foreground">
                {impactPreviewLoading
                  ? 'Checking rota impact…'
                  : impactPreview != null
                    ? impactPreview > 0
                      ? `${impactPreview} visit${impactPreview === 1 ? '' : 's'} would be unallocated and need cover.`
                      : 'No allocated visits found in this date range.'
                    : null}
              </p>
            ) : null}
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Close
            </Button>
            <Button type="button" disabled={saving || !canUpdate} onClick={() => void onSave()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>

      <EmployeeAbsenceRecordsSection
        employeeId={employeeId}
        canUpdate={canUpdate}
        queryEnabled={queryEnabled}
      />
    </div>
  )
}
