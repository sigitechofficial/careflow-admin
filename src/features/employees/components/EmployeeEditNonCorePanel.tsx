import * as React from 'react'
import { Filter, PenLine, Plus, Trash2 } from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import { getApiBaseUrl } from '@/shared/lib/api-base'
import { toastApiError, toastError, toastSuccess } from '@/shared/lib/toast'
import { useAuthStore } from '@/features/auth/store'
import { type EmployeeNonCoreActivityRow } from '@/features/employees/types'
import {
  useCreateEmployeeNonCoreActivity,
  useDeleteEmployeeNonCoreActivity,
  useUpdateEmployeeNonCoreActivity,
} from '@/features/employees/hooks/useEmployeeMutations'
import { useEmployeeLookups } from '@/features/employees/hooks/useEmployees'
import { useEmployeeNonCoreActivities } from '@/features/employees/hooks/useEmployeeTabs'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { Input } from '@/shared/ui/input'
import { Checkbox } from '@/shared/ui/toggle-controls'
import { Label } from '@/shared/ui/form-field'
import { isoToOrgDatetimeLocal, orgDatetimeLocalToIso } from '@/shared/lib/operational-day.util'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'

const REASON_NONE = '__none__'

/** DD-MM-YYYY HH:mm in the organisation timezone (not the device's). */
function formatActivityCell(iso: string): string {
  const local = isoToOrgDatetimeLocal(iso)
  if (!local) return '—'
  return `${local.slice(8, 10)}-${local.slice(5, 7)}-${local.slice(0, 4)} ${local.slice(11, 16)}`
}

function toDatetimeLocalValue(iso: string): string {
  return isoToOrgDatetimeLocal(iso)
}

function fromDatetimeLocalValue(local: string): string {
  return orgDatetimeLocalToIso(local)
}

function reasonBadgeVariant(name: string | null): 'destructive' | 'info' {
  if (!name) return 'info'
  return /sickness|sick|ill/i.test(name) ? 'destructive' : 'info'
}

/** Open the browser's calendar + time picker when the field is clicked, not only its icon. */
function openNativePicker(e: React.MouseEvent<HTMLInputElement>) {
  try {
    e.currentTarget.showPicker?.()
  } catch {
    // showPicker throws if the browser blocks it; the field still works by typing.
  }
}

export function EmployeeEditNonCorePanel({ employeeId }: { employeeId: string }) {
  const apiConfigured = Boolean(getApiBaseUrl())
  const accessToken = useAuthStore(s => s.accessToken)
  const jwtPresent = Boolean(accessToken?.includes('.'))
  const canUpdate = useAuthStore(s => s.can('employees.update'))
  const queryEnabled = apiConfigured && jwtPresent && Boolean(employeeId)

  const lookupsQuery = useEmployeeLookups(queryEnabled)
  const activitiesQuery = useEmployeeNonCoreActivities(employeeId, queryEnabled)
  const createMutation = useCreateEmployeeNonCoreActivity(employeeId)
  const updateMutation = useUpdateEmployeeNonCoreActivity(employeeId)
  const deleteMutation = useDeleteEmployeeNonCoreActivity(employeeId)

  const lookups = lookupsQuery.data ?? null
  const rows = activitiesQuery.data ?? []
  const loading = activitiesQuery.isLoading
  const error =
    activitiesQuery.error instanceof ApiError
      ? activitiesQuery.error.message
      : activitiesQuery.error
        ? 'Could not load records.'
        : null

  const [modalOpen, setModalOpen] = React.useState(false)
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [formReasonId, setFormReasonId] = React.useState(REASON_NONE)
  const [formDateFrom, setFormDateFrom] = React.useState('')
  const [formDateTo, setFormDateTo] = React.useState('')
  const [formNotes, setFormNotes] = React.useState('')
  const [formApplyToSchedule, setFormApplyToSchedule] = React.useState(true)
  const [formIncludePayroll, setFormIncludePayroll] = React.useState(false)
  const [formPayRemovedVisits, setFormPayRemovedVisits] = React.useState(false)
  const [formError, setFormError] = React.useState<string | null>(null)
  // Paying the removed visits replaces paying the activity, and needs the visits to be removed.
  const payRemovedVisits = !editingId && formApplyToSchedule && formPayRemovedVisits
  const saving = createMutation.isPending || updateMutation.isPending

  const openCreate = () => {
    setEditingId(null)
    setFormReasonId(REASON_NONE)
    setFormDateFrom('')
    setFormDateTo('')
    setFormNotes('')
    setFormApplyToSchedule(true)
    setFormIncludePayroll(false)
    setFormPayRemovedVisits(false)
    setFormError(null)
    setModalOpen(true)
  }

  const openEdit = (row: EmployeeNonCoreActivityRow) => {
    setEditingId(row.id)
    setFormReasonId(row.reasonId ?? REASON_NONE)
    setFormDateFrom(toDatetimeLocalValue(row.dateFrom))
    setFormDateTo(toDatetimeLocalValue(row.dateTo))
    setFormNotes(row.notes ?? '')
    setFormIncludePayroll(row.includeInPayroll)
    setFormError(null)
    setModalOpen(true)
  }

  const onSave = async () => {
    if (!formDateFrom.trim() || !formDateTo.trim()) {
      setFormError('Date from and date to are required.')
      return
    }
    let dateFromIso: string
    let dateToIso: string
    try {
      dateFromIso = fromDatetimeLocalValue(formDateFrom)
      dateToIso = fromDatetimeLocalValue(formDateTo)
    } catch {
      setFormError('Invalid dates.')
      return
    }
    const body = {
      reasonId: formReasonId === REASON_NONE ? undefined : formReasonId,
      dateFrom: dateFromIso,
      dateTo: dateToIso,
      notes: formNotes.trim() || undefined,
      includeInPayroll: payRemovedVisits ? false : formIncludePayroll,
    }
    setFormError(null)
    try {
      if (editingId) {
        await updateMutation.mutateAsync({ activityId: editingId, body })
        toastSuccess('Non-core activity updated', 'Record saved.')
      } else {
        // Unallocating visits applies on create only (the update endpoint does not take it).
        const result = await createMutation.mutateAsync({
          ...body,
          applyToSchedule: formApplyToSchedule,
          payRemovedVisits,
        })
        const unallocated = result.scheduleImpact?.jobsUnallocated ?? 0
        const paid = (result.removedVisitPay ?? []).filter(v => v.payItemId)
        const notPriced = (result.removedVisitPay ?? []).filter(v => !v.payItemId)
        toastSuccess(
          'Non-core activity recorded',
          [
            unallocated > 0
              ? `${unallocated} scheduled visit${unallocated === 1 ? '' : 's'} unallocated on the rota.`
              : 'Record saved.',
            paid.length
              ? `${paid.length} visit pay item${paid.length === 1 ? '' : 's'} (£${paid
                  .reduce((sum, v) => sum + (v.amount ?? 0), 0)
                  .toFixed(2)}) sent for approval in Pay items.`
              : null,
          ]
            .filter(Boolean)
            .join(' '),
        )
        if (notPriced.length) {
          toastError(
            'Some visits could not be priced',
            notPriced.map(v => `${v.jobName}: ${v.problem ?? 'no pay'}`).join('; ') +
              ' — add a pay item for these by hand.',
          )
        }
      }
      setModalOpen(false)
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : 'Save failed.')
    }
  }

  const onDelete = async (row: EmployeeNonCoreActivityRow) => {
    if (!window.confirm('Delete this record?')) return
    try {
      await deleteMutation.mutateAsync(row.id)
    } catch (e) {
      toastApiError(e, 'Delete failed.')
    }
  }

  const reasons = lookups?.nonCoreActivityReasons ?? []

  return (
    <div className="space-y-4" data-testid="employee-edit-non-core-panel">
      <div className="flex flex-wrap items-center gap-1.5 text-sm">
        <span className="font-semibold text-foreground">Non Core Activity Records</span>
        {canUpdate ? (
          <button type="button" onClick={openCreate} className="text-primary hover:underline font-medium">
            Add Non Core Activities
          </button>
        ) : null}
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              {['Date from', 'Date to', 'Non Core Activity Type', 'Notes', ...(canUpdate ? ['Actions'] : [])].map(
                label => (
                  <th
                    key={label}
                    className="whitespace-nowrap px-3 py-2.5 text-left font-medium text-muted-foreground"
                  >
                    <div className="flex items-center gap-1">
                      {label}
                      {label !== 'Notes' && label !== 'Actions' ? (
                        <Filter className="h-3 w-3 opacity-60" aria-hidden />
                      ) : null}
                    </div>
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={canUpdate ? 5 : 4} className="px-3 py-8 text-center text-muted-foreground">
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={canUpdate ? 5 : 4} className="px-3 py-8 text-center text-muted-foreground">
                  No records yet.
                </td>
              </tr>
            ) : (
              rows.map(row => (
                <tr key={row.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                  <td className="whitespace-nowrap px-3 py-2.5 text-muted-foreground">
                    {formatActivityCell(row.dateFrom)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-muted-foreground">
                    {formatActivityCell(row.dateTo)}
                  </td>
                  <td className="px-3 py-2.5">
                    <Badge variant={reasonBadgeVariant(row.reason?.name ?? null)} size="sm">
                      {row.reason?.name ?? '—'}
                    </Badge>
                  </td>
                  <td className="max-w-md px-3 py-2.5 text-muted-foreground">{row.notes?.trim() ?? ''}</td>
                  {canUpdate ? (
                    <td className="px-3 py-2.5">
                      <div className="flex gap-1">
                        <button
                          type="button"
                          className="rounded-md p-1.5 text-primary hover:bg-primary/10"
                          title="Edit"
                          onClick={() => openEdit(row)}
                        >
                          <PenLine className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          title="Delete"
                          onClick={() => void onDelete(row)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit record' : 'Add non-core activity'}</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-3">
            {formError ? <p className="text-sm text-destructive">{formError}</p> : null}
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Activity type</label>
              <Select value={formReasonId} onValueChange={setFormReasonId}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={REASON_NONE}>—</SelectItem>
                  {reasons.map(r => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Date from</label>
                <Input type="datetime-local" value={formDateFrom} onChange={e => setFormDateFrom(e.target.value)} onClick={openNativePicker} className="cursor-pointer" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Date to</label>
                <Input type="datetime-local" value={formDateTo} onChange={e => setFormDateTo(e.target.value)} onClick={openNativePicker} className="cursor-pointer" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Notes</label>
              <Input value={formNotes} onChange={e => setFormNotes(e.target.value)} />
            </div>
            <div className="flex items-start gap-2 rounded-md border border-border bg-muted/30 p-3">
              <Checkbox
                id="nca-include-payroll"
                checked={payRemovedVisits ? false : formIncludePayroll}
                disabled={payRemovedVisits}
                onCheckedChange={(checked) => setFormIncludePayroll(checked === true)}
              />
              <Label
                htmlFor="nca-include-payroll"
                className={`text-sm leading-snug ${payRemovedVisits ? 'text-muted-foreground' : 'cursor-pointer'}`}
              >
                Include in payroll (paid at the training rate on the carer's pay card)
                {payRemovedVisits ? (
                  <span className="mt-0.5 block text-xs">Not used — the removed visits are paid instead.</span>
                ) : null}
              </Label>
            </div>
            {!editingId ? (
              <div className="space-y-2 rounded-md border border-border bg-muted/30 p-3">
                <div className="flex items-start gap-2">
                  <Checkbox
                    id="nca-apply-schedule"
                    checked={formApplyToSchedule}
                    onCheckedChange={(checked) => setFormApplyToSchedule(checked === true)}
                  />
                  <Label htmlFor="nca-apply-schedule" className="cursor-pointer text-sm leading-snug">
                    Unallocate this carer from scheduled visits during this period
                  </Label>
                </div>
                {formApplyToSchedule ? (
                  <div className="flex items-start gap-2 pl-6">
                    <Checkbox
                      id="nca-pay-removed-visits"
                      checked={formPayRemovedVisits}
                      onCheckedChange={(checked) => setFormPayRemovedVisits(checked === true)}
                    />
                    <Label htmlFor="nca-pay-removed-visits" className="cursor-pointer text-sm leading-snug">
                      Pay carer for the removed visits
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        Each visit is paid at its visit rate through a pay item that needs approval.
                      </span>
                    </Label>
                  </div>
                ) : null}
              </div>
            ) : null}
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="button" disabled={saving} onClick={() => void onSave()}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
