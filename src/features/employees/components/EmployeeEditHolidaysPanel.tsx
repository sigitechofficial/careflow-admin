import * as React from 'react'
import { Loader2, PenLine, Plus, Trash2 } from 'lucide-react'
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
    <div className="space-y-4" data-testid="employee-edit-holidays-panel">
      <div className="flex flex-wrap items-center gap-1.5 text-sm">
        <span className="font-semibold text-foreground">Holiday &amp; leave records</span>
        {canUpdate ? (
          <button type="button" onClick={openCreate} className="font-medium text-primary hover:underline">
            Add holiday
          </button>
        ) : null}
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading…
        </div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No holiday records yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full min-w-[480px] text-sm">
            <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Start</th>
                <th className="px-3 py-2 font-medium">End</th>
                <th className="px-3 py-2 font-medium">Notes</th>
                {canUpdate ? <th className="px-3 py-2 font-medium">Actions</th> : null}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-border">
                  <td className="px-3 py-2">{formatHolidayDate(row.startDate)}</td>
                  <td className="px-3 py-2">{formatHolidayDate(row.endDate)}</td>
                  <td className="px-3 py-2 text-muted-foreground">{row.notes?.trim() || '—'}</td>
                  {canUpdate ? (
                    <td className="px-3 py-2">
                      <div className="flex gap-1">
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
  )
}
