import * as React from 'react'
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import { toastApiError, toastError, toastSuccess } from '@/shared/lib/toast'
import {
  type ServiceUserAbsenceRow,
  type ServiceUserAbsenceType,
  type SuLookupRow,
} from '@/features/service-users/types'
import {
  useCreateServiceUserAbsence,
  useDeleteServiceUserAbsence,
  useUpdateServiceUserAbsence,
} from '@/features/service-users/hooks/useServiceUserMutations'
import { useServiceUserAbsences } from '@/features/service-users/hooks/useServiceUserTabs'
import { useAuthStore } from '@/features/auth/store'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { RadioGroup, RadioGroupItem } from '@/shared/ui/toggle-controls'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/ui/dialog'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'

const ABSENCE_TYPE_OPTIONS: { value: ServiceUserAbsenceType; label: string }[] = [
  { value: 'PLANNED', label: 'Planned Absence' },
  { value: 'UNPLANNED', label: 'Unplanned Absence' },
  { value: 'NOT_APPLICABLE', label: 'Not Applicable' },
]

function labelForAbsenceType(t: ServiceUserAbsenceType): string {
  return ABSENCE_TYPE_OPTIONS.find((o) => o.value === t)?.label ?? t
}

type FormState = {
  startDate: string
  endDate: string
  startTime: string
  endTime: string
  absenceType: ServiceUserAbsenceType
  absenceReasonCatalogId: string
  notes: string
  contactInformation: string
}

function emptyForm(): FormState {
  return {
    startDate: '',
    endDate: '',
    startTime: '',
    endTime: '',
    absenceType: 'NOT_APPLICABLE',
    absenceReasonCatalogId: '',
    notes: '',
    contactInformation: '',
  }
}

function rowToForm(row: ServiceUserAbsenceRow): FormState {
  return {
    startDate: row.startDate,
    endDate: row.endDate ?? '',
    startTime: row.startTime ?? '',
    endTime: row.endTime ?? '',
    absenceType: row.absenceType,
    absenceReasonCatalogId: row.absenceReasonCatalogId,
    notes: row.notes ?? '',
    contactInformation: row.contactInformation ?? '',
  }
}

export function ServiceUserAbsencesTab({
  serviceUserId,
  absenceReasons,
}: {
  serviceUserId: string
  absenceReasons: SuLookupRow[]
}) {
  const can = useAuthStore((s) => s.can)
  const canRead = can('service_users.absences.read') || can('service_users.read')
  const canCreate = can('service_users.absences.create') || can('service_users.update')
  const canUpdate = can('service_users.absences.update') || can('service_users.update')
  const canDelete = can('service_users.absences.delete') || can('service_users.delete')

  const absencesQuery = useServiceUserAbsences(serviceUserId, canRead)
  const createMutation = useCreateServiceUserAbsence(serviceUserId)
  const updateMutation = useUpdateServiceUserAbsence(serviceUserId)
  const deleteMutation = useDeleteServiceUserAbsence(serviceUserId)

  const rows = absencesQuery.data ?? []
  const loading = absencesQuery.isLoading
  const listError =
    absencesQuery.error instanceof ApiError
      ? absencesQuery.error.message
      : absencesQuery.error
        ? 'Failed to load absences'
        : null

  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [form, setForm] = React.useState<FormState>(() => emptyForm())
  const [formError, setFormError] = React.useState<string | null>(null)

  const [deleteId, setDeleteId] = React.useState<string | null>(null)

  const formSaving = createMutation.isPending || updateMutation.isPending
  const deleteSaving = deleteMutation.isPending

  function openAdd() {
    setEditingId(null)
    setForm(emptyForm())
    setFormError(null)
    setDialogOpen(true)
  }

  function openEdit(row: ServiceUserAbsenceRow) {
    setEditingId(row.id)
    setForm(rowToForm(row))
    setFormError(null)
    setDialogOpen(true)
  }

  async function saveForm() {
    if (!form.startDate.trim()) {
      setFormError('Absence start date is required.')
      toastError('Cannot save absence', 'Absence start date is required.')
      return
    }
    if (!form.absenceReasonCatalogId) {
      setFormError('Please select a reason for absence.')
      toastError('Cannot save absence', 'Please select a reason for absence.')
      return
    }
    setFormError(null)
    try {
      const body = {
        startDate: form.startDate.trim(),
        endDate: form.endDate.trim() || undefined,
        startTime: form.startTime.trim() || undefined,
        endTime: form.endTime.trim() || undefined,
        absenceType: form.absenceType,
        absenceReasonCatalogId: form.absenceReasonCatalogId,
        notes: form.notes.trim(),
        contactInformation: form.contactInformation.trim(),
      }
      if (editingId) {
        await updateMutation.mutateAsync({ absenceId: editingId, body })
      } else {
        await createMutation.mutateAsync(body)
      }
      setDialogOpen(false)
      toastSuccess(editingId ? 'Absence updated' : 'Absence recorded', 'Absences have been saved.')
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : 'Save failed')
      toastApiError(e, 'Save failed')
    }
  }

  async function confirmDelete() {
    if (!deleteId) return
    try {
      await deleteMutation.mutateAsync(deleteId)
      setDeleteId(null)
      toastSuccess('Absence removed', 'The absence record was deleted.')
    } catch (e) {
      toastApiError(e, 'Delete failed')
    }
  }

  if (!canRead) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/20 px-6 py-12 text-center text-sm text-muted-foreground">
        You do not have permission to view absences. Ask an administrator to grant{' '}
        <span className="font-mono text-xs">service_users.read</span> or{' '}
        <span className="font-mono text-xs">service_users.absences.read</span>.
      </div>
    )
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-sky-600 dark:text-sky-400">Record Absences</h2>
        {canCreate && (
          <Button type="button" size="sm" className="gap-1 bg-sky-600 text-white hover:bg-sky-700" onClick={openAdd}>
            <Plus className="h-4 w-4" />
            Add Absence
          </Button>
        )}
      </div>

      {listError && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {listError}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No absences recorded yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b border-border bg-muted/40">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Start</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">End</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Times</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Type</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Reason</th>
                <th className="px-3 py-2 text-right font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-border last:border-0">
                  <td className="whitespace-nowrap px-3 py-2 align-top">{row.startDate}</td>
                  <td className="whitespace-nowrap px-3 py-2 align-top">{row.endDate ?? '—'}</td>
                  <td className="px-3 py-2 align-top text-muted-foreground">
                    {[row.startTime, row.endTime].filter(Boolean).join(' – ') || '—'}
                  </td>
                  <td className="px-3 py-2 align-top">{labelForAbsenceType(row.absenceType)}</td>
                  <td className="max-w-[14rem] px-3 py-2 align-top">{row.reason.name}</td>
                  <td className="px-3 py-2 text-right align-top">
                    <div className="inline-flex gap-1">
                      {canUpdate && (
                        <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => openEdit(row)}>
                          <Pencil className="h-3.5 w-3.5" />
                          <span className="sr-only">Edit</span>
                        </Button>
                      )}
                      {canDelete && (
                        <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => setDeleteId(row.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                          <span className="sr-only">Delete</span>
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent size="lg" className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sky-600">{editingId ? 'Edit Absence' : 'Add Absence'}</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4">
            {formError && <p className="text-sm text-destructive">{formError}</p>}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Absence Start Date <span className="text-destructive">*</span>
                  </label>
                  <Input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Absence End Date</label>
                  <Input type="date" value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} />
                </div>
                <div>
                  <p className="mb-2 text-xs font-medium text-muted-foreground">
                    Absence Type <span className="text-destructive">*</span>
                  </p>
                  <RadioGroup
                    value={form.absenceType}
                    onValueChange={(v) => setForm((f) => ({ ...f, absenceType: v as ServiceUserAbsenceType }))}
                    className="flex flex-col gap-2"
                  >
                    {ABSENCE_TYPE_OPTIONS.map((opt) => (
                      <label key={opt.value} className="flex cursor-pointer items-center gap-2 text-sm text-rose-600 dark:text-rose-400">
                        <RadioGroupItem value={opt.value} id={`abs-type-${opt.value}`} />
                        <span>{opt.label}</span>
                      </label>
                    ))}
                  </RadioGroup>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Absence Start Time</label>
                  <Input type="time" value={form.startTime} onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Absence End Time</label>
                  <Input type="time" value={form.endTime} onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Reason for Absence <span className="text-destructive">*</span>
                  </label>
                  <Select
                    value={form.absenceReasonCatalogId || undefined}
                    onValueChange={(v) => setForm((f) => ({ ...f, absenceReasonCatalogId: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Please select Reason" />
                    </SelectTrigger>
                    <SelectContent>
                      {absenceReasons.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {absenceReasons.length === 0 && (
                    <p className="mt-1 text-xs text-muted-foreground">No reasons configured. Run database seed after migration.</p>
                  )}
                </div>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                rows={3}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Contact Information</label>
              <textarea
                value={form.contactInformation}
                onChange={(e) => setForm((f) => ({ ...f, contactInformation: e.target.value }))}
                rows={3}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Close
            </Button>
            <Button
              type="button"
              className="bg-sky-600 text-white hover:bg-sky-700"
              disabled={formSaving || (editingId ? !canUpdate : !canCreate)}
              onClick={() => void saveForm()}
            >
              {formSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteId)} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this absence?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteSaving}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmDelete()} disabled={deleteSaving}>
              {deleteSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
