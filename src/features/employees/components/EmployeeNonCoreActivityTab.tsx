import * as React from 'react'
import { Filter, PenLine, Trash2 } from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import { getApiBaseUrl } from '@/shared/lib/api-base'
import { useAuthStore } from '@/features/auth/store'
import { type EmployeeListRow, type NonCoreActivityRegistryRow } from '@/features/employees/types'
import {
  useCreateEmployeeNonCoreActivityMutation,
  useDeleteEmployeeNonCoreActivityMutation,
  useUpdateEmployeeNonCoreActivityMutation,
} from '@/features/employees/hooks/useEmployeeMutations'
import { useEmployeeLookups } from '@/features/employees/hooks/useEmployees'
import { useAllEmployees, useNonCoreActivitiesRegistry } from '@/features/employees/hooks/useEmployeeTabs'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Combobox, type ComboboxOption } from '@/shared/ui/combobox'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { Input } from '@/shared/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { cn } from '@/shared/lib/utils'
import { isoToOrgDatetimeLocal, orgDatetimeLocalToIso } from '@/shared/lib/operational-day.util'

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

function employeeDisplayName(emp: EmployeeListRow): string {
  return emp.fullName?.trim() || [emp.firstName, emp.lastName].filter(Boolean).join(' ').trim() || '—'
}

function reasonBadgeVariant(name: string | null): 'destructive' | 'info' {
  if (!name) return 'info'
  return /sickness|sick|ill/i.test(name) ? 'destructive' : 'info'
}

export function EmployeeNonCoreActivityTab() {
  const apiConfigured = Boolean(getApiBaseUrl())
  const accessToken = useAuthStore(s => s.accessToken)
  const jwtPresent = Boolean(accessToken?.includes('.'))
  const canUpdate = useAuthStore(s => s.can('employees.update'))
  const queryEnabled = apiConfigured && jwtPresent

  const lookupsQuery = useEmployeeLookups(queryEnabled)
  const employeesQuery = useAllEmployees({ sortOrder: 'desc' }, queryEnabled)
  const registryQuery = useNonCoreActivitiesRegistry(queryEnabled)
  const createMutation = useCreateEmployeeNonCoreActivityMutation()
  const updateMutation = useUpdateEmployeeNonCoreActivityMutation()
  const deleteMutation = useDeleteEmployeeNonCoreActivityMutation()

  const lookups = lookupsQuery.data ?? null
  const employees = employeesQuery.data ?? []
  const registry = registryQuery.data ?? []
  const loading = employeesQuery.isLoading || lookupsQuery.isLoading || registryQuery.isLoading
  const loadError =
    !queryEnabled
      ? apiConfigured
        ? 'Sign in with a real JWT to view records.'
        : 'Set VITE_API_BASE_URL and sign in to load data.'
      : registryQuery.error instanceof ApiError
        ? registryQuery.error.message
        : employeesQuery.error instanceof ApiError
          ? employeesQuery.error.message
          : lookupsQuery.error instanceof ApiError
            ? lookupsQuery.error.message
            : registryQuery.error || employeesQuery.error || lookupsQuery.error
              ? 'Could not load non-core activities.'
              : null

  const [filterEmployeeName, setFilterEmployeeName] = React.useState('')
  const [filterReasonId, setFilterReasonId] = React.useState<string>(REASON_NONE)
  const [filterDateFrom, setFilterDateFrom] = React.useState('')

  const [modalOpen, setModalOpen] = React.useState(false)
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [editingEmployeeId, setEditingEmployeeId] = React.useState<string>('')
  const [editingEmployeeDisplayName, setEditingEmployeeDisplayName] = React.useState('')
  const [formEmployeeId, setFormEmployeeId] = React.useState('')
  const [formReasonId, setFormReasonId] = React.useState(REASON_NONE)
  const [formDateFrom, setFormDateFrom] = React.useState('')
  const [formDateTo, setFormDateTo] = React.useState('')
  const [formIncludePayroll, setFormIncludePayroll] = React.useState(false)
  const [formOnCall, setFormOnCall] = React.useState(false)
  // New records always take the carer off overlapping visits; this pays those visits instead.
  const [formPayRemovedVisits, setFormPayRemovedVisits] = React.useState(false)
  const [formNotes, setFormNotes] = React.useState('')
  const [formError, setFormError] = React.useState<string | null>(null)
  const [banner, setBanner] = React.useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const saving = createMutation.isPending || updateMutation.isPending
  const payRemovedVisits = !editingId && formPayRemovedVisits

  const employeeOptions = React.useMemo<ComboboxOption[]>(
    () =>
      employees.map(emp => ({
        value: emp.id,
        label: employeeDisplayName(emp),
      })),
    [employees],
  )

  const filteredRows = React.useMemo(() => {
    const nameQ = filterEmployeeName.trim().toLowerCase()
    const fromDayStr = filterDateFrom.trim()
    const fromDayMs = fromDayStr
      ? new Date(`${fromDayStr}T00:00:00`).getTime()
      : null

    return registry.filter(row => {
      if (nameQ && !row.employeeDisplayName.toLowerCase().includes(nameQ)) return false
      if (filterReasonId !== REASON_NONE) {
        if (row.reasonId !== filterReasonId) return false
      }
      if (fromDayMs != null && !Number.isNaN(fromDayMs)) {
        if (new Date(row.dateFrom).getTime() < fromDayMs) return false
      }
      return true
    })
  }, [registry, filterEmployeeName, filterReasonId, filterDateFrom])

  const openCreate = () => {
    setEditingId(null)
    setEditingEmployeeId('')
    setEditingEmployeeDisplayName('')
    setFormEmployeeId('')
    setFormReasonId(REASON_NONE)
    setFormDateFrom('')
    setFormDateTo('')
    setFormIncludePayroll(false)
    setFormOnCall(false)
    setFormPayRemovedVisits(false)
    setFormNotes('')
    setFormError(null)
    setModalOpen(true)
  }

  const openEdit = (row: NonCoreActivityRegistryRow) => {
    setEditingId(row.id)
    setEditingEmployeeId(row.employeeId)
    setEditingEmployeeDisplayName(row.employeeDisplayName)
    setFormEmployeeId(row.employeeId)
    setFormReasonId(row.reasonId ?? REASON_NONE)
    setFormDateFrom(toDatetimeLocalValue(row.dateFrom))
    setFormDateTo(toDatetimeLocalValue(row.dateTo))
    setFormIncludePayroll(row.includeInPayroll)
    setFormOnCall(row.onCallForPeriod)
    setFormNotes(row.notes ?? '')
    setFormError(null)
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setFormError(null)
  }

  const onSave = async () => {
    setFormError(null)
    if (!editingId && !formEmployeeId.trim()) {
      setFormError('Select an employee.')
      return
    }
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
    if (new Date(dateToIso).getTime() <= new Date(dateFromIso).getTime()) {
      setFormError('Date to must be after date from.')
      return
    }

    const reasonId = formReasonId === REASON_NONE ? undefined : formReasonId
    const body = {
      reasonId,
      dateFrom: dateFromIso,
      dateTo: dateToIso,
      includeInPayroll: payRemovedVisits ? false : formIncludePayroll,
      onCallForPeriod: formOnCall,
      notes: formNotes.trim() || undefined,
    }

    setBanner(null)
    try {
      if (editingId) {
        await updateMutation.mutateAsync({
          employeeId: editingEmployeeId,
          activityId: editingId,
          body,
        })
        setBanner({ type: 'success', text: 'Record updated.' })
      } else {
        const result = await createMutation.mutateAsync({
          employeeId: formEmployeeId.trim(),
          body: { ...body, payRemovedVisits },
        })
        const unallocated = result.scheduleImpact?.jobsUnallocated ?? 0
        const paid = (result.removedVisitPay ?? []).filter(v => v.payItemId)
        const notPriced = (result.removedVisitPay ?? []).filter(v => !v.payItemId)
        setBanner({
          type: notPriced.length ? 'error' : 'success',
          text: [
            'Record added.',
            unallocated > 0 ? `${unallocated} scheduled visit${unallocated === 1 ? '' : 's'} unallocated.` : null,
            paid.length
              ? `${paid.length} visit pay item${paid.length === 1 ? '' : 's'} (£${paid
                  .reduce((sum, v) => sum + (v.amount ?? 0), 0)
                  .toFixed(2)}) sent for approval in Pay items.`
              : null,
            notPriced.length
              ? `Not priced — add a pay item by hand: ${notPriced.map(v => `${v.jobName} (${v.problem ?? 'no pay'})`).join('; ')}.`
              : null,
          ]
            .filter(Boolean)
            .join(' '),
        })
      }
      closeModal()
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Save failed.'
      setFormError(msg)
    }
  }

  const onDelete = async (row: NonCoreActivityRegistryRow) => {
    if (!canUpdate) return
    if (!window.confirm('Delete this non-core activity record?')) return
    setBanner(null)
    try {
      await deleteMutation.mutateAsync({ employeeId: row.employeeId, activityId: row.id })
      setBanner({ type: 'success', text: 'Record deleted.' })
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Delete failed.'
      setBanner({ type: 'error', text: msg })
    }
  }

  const reasons = lookups?.nonCoreActivityReasons ?? []

  return (
    <div className="space-y-4" data-testid="employee-non-core-activity-panel">
      {banner ? (
        <div
          role="status"
          className={cn(
            'rounded-lg border px-4 py-3 text-sm',
            banner.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100'
              : 'border-destructive/40 bg-destructive/10 text-destructive',
          )}
        >
          {banner.text}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-1.5 text-sm">
        <span className="font-medium">Non Core Activity Records</span>
        {canUpdate ? (
          <button
            type="button"
            data-testid="employee-non-core-add"
            onClick={openCreate}
            className="text-primary hover:underline font-medium"
          >
            Add non-core activity
          </button>
        ) : null}
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-muted/20 p-3">
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
            <Filter className="h-3 w-3 opacity-70" aria-hidden />
            Employee name
          </div>
          <Input
            placeholder="Contains…"
            value={filterEmployeeName}
            onChange={e => setFilterEmployeeName(e.target.value)}
            className="h-9 w-44"
            aria-label="Filter by employee name"
          />
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
            <Filter className="h-3 w-3 opacity-70" aria-hidden />
            Activity type
          </div>
          <Select value={filterReasonId} onValueChange={setFilterReasonId}>
            <SelectTrigger className="h-9 w-48" aria-label="Filter by reason">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={REASON_NONE}>All types</SelectItem>
              {reasons.map(r => (
                <SelectItem key={r.id} value={r.id}>
                  {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
            <Filter className="h-3 w-3 opacity-70" aria-hidden />
            Date from (on or after)
          </div>
          <Input
            type="date"
            value={filterDateFrom}
            onChange={e => setFilterDateFrom(e.target.value)}
            className="h-9 w-40"
            aria-label="Filter by date from"
          />
        </div>
      </div>

      {loadError && !loading ? (
        <p className="text-sm text-amber-800 dark:text-amber-200">{loadError}</p>
      ) : null}

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              {[
                { label: 'Date from', filter: true },
                { label: 'Date to', filter: false },
                { label: 'Non Core Activity Type', filter: true },
                { label: 'Employee Name', filter: true },
                { label: 'Notes', filter: false },
                ...(canUpdate ? [{ label: 'Actions', filter: false as const }] : []),
              ].map(col => (
                <th key={col.label} className="whitespace-nowrap px-3 py-2.5 text-left font-medium text-muted-foreground">
                  <div className="flex items-center gap-1">
                    {col.label}
                    {col.filter ? <Filter className="h-3 w-3 opacity-60" aria-hidden /> : null}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={canUpdate ? 6 : 5} className="px-3 py-8 text-center text-muted-foreground">
                  Loading…
                </td>
              </tr>
            ) : filteredRows.length === 0 ? (
              <tr>
                <td colSpan={canUpdate ? 6 : 5} className="px-3 py-8 text-center text-muted-foreground">
                  No records match.
                </td>
              </tr>
            ) : (
              filteredRows.map(row => (
                <tr key={row.id} className="border-b border-border transition-colors last:border-0 hover:bg-muted/20">
                  <td className="whitespace-nowrap px-3 py-2.5 text-muted-foreground">{formatActivityCell(row.dateFrom)}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-muted-foreground">{formatActivityCell(row.dateTo)}</td>
                  <td className="px-3 py-2.5">
                    <Badge variant={reasonBadgeVariant(row.reasonName)} size="sm">
                      {row.reasonName ?? '—'}
                    </Badge>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 font-medium">{row.employeeDisplayName}</td>
                  <td className="max-w-md px-3 py-2.5 text-muted-foreground">{row.notes?.trim() ? row.notes : ''}</td>
                  {canUpdate ? (
                    <td className="whitespace-nowrap px-3 py-2.5">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          title="Edit"
                          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          onClick={() => openEdit(row)}
                        >
                          <PenLine className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          title="Delete"
                          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
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

      <Dialog open={modalOpen} onOpenChange={v => { if (!v) closeModal() }}>
        <DialogContent
          size="lg"
          className="flex max-h-[min(90vh,720px)] flex-col gap-0 overflow-hidden p-0"
        >
          <DialogHeader className="shrink-0 space-y-1 border-b border-border px-6 py-5 pr-12">
            <DialogTitle className="text-lg">
              {editingId ? 'Edit non-core activity' : 'Add non-core activity'}
            </DialogTitle>
            <DialogDescription className="text-sm font-normal text-muted-foreground">
              {editingId
                ? 'Update dates, reason, or notes for this record.'
                : 'Choose an employee, optional reason, and the period away from core duties.'}
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-6">
            {formError ? (
              <div
                role="alert"
                className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
              >
                {formError}
              </div>
            ) : null}

            <div className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="nca-employee" className="text-sm font-medium leading-none text-foreground">
                  Employee <span className="text-destructive">*</span>
                </label>
                {editingId ? (
                  <Input
                    id="nca-employee"
                    readOnly
                    value={editingEmployeeDisplayName || '—'}
                    className="h-10 bg-muted/50 text-foreground"
                  />
                ) : (
                  <Combobox
                    options={employeeOptions}
                    value={formEmployeeId}
                    onChange={v => setFormEmployeeId(v)}
                    placeholder="Search and select employee…"
                    searchPlaceholder="Search by name…"
                    disabled={!employeeOptions.length}
                    className="w-full"
                  />
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="nca-reason" className="text-sm font-medium leading-none text-foreground">
                  Reason <span className="font-normal text-muted-foreground">(optional)</span>
                </label>
                <Select value={formReasonId} onValueChange={setFormReasonId}>
                  <SelectTrigger id="nca-reason" className="h-10 w-full">
                    <SelectValue placeholder="Not specified" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={REASON_NONE}>Not specified</SelectItem>
                    {reasons.map(r => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="nca-date-from" className="text-sm font-medium leading-none text-foreground">
                    Date from <span className="text-destructive">*</span>
                  </label>
                  <Input
                    id="nca-date-from"
                    type="datetime-local"
                    value={formDateFrom}
                    onChange={e => setFormDateFrom(e.target.value)}
                    className="h-10 font-mono text-sm tabular-nums"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="nca-date-to" className="text-sm font-medium leading-none text-foreground">
                    Date to <span className="text-destructive">*</span>
                  </label>
                  <Input
                    id="nca-date-to"
                    type="datetime-local"
                    value={formDateTo}
                    onChange={e => setFormDateTo(e.target.value)}
                    className="h-10 font-mono text-sm tabular-nums"
                  />
                </div>
              </div>

              <div className="rounded-lg border border-border bg-muted/25 p-4">
                <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">Payroll &amp; on-call</p>
                <div className="space-y-3">
                  {!editingId ? (
                    <label
                      htmlFor="nca-pay-removed-visits"
                      className="flex cursor-pointer items-start gap-3 rounded-md py-0.5 text-sm leading-snug text-foreground"
                    >
                      <input
                        id="nca-pay-removed-visits"
                        type="checkbox"
                        checked={formPayRemovedVisits}
                        onChange={e => setFormPayRemovedVisits(e.target.checked)}
                        className="mt-0.5 h-4 w-4 shrink-0 rounded border-input accent-primary"
                      />
                      <span>
                        Pay carer for the visits they are taken off
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          Each visit is paid at its visit rate through a pay item that needs approval.
                        </span>
                      </span>
                    </label>
                  ) : null}
                  <label
                    htmlFor="nca-payroll"
                    className="flex cursor-pointer items-start gap-3 rounded-md py-0.5 text-sm leading-snug text-foreground"
                  >
                    <input
                      id="nca-payroll"
                      type="checkbox"
                      checked={payRemovedVisits ? false : formIncludePayroll}
                      disabled={payRemovedVisits}
                      onChange={e => setFormIncludePayroll(e.target.checked)}
                      className="mt-0.5 h-4 w-4 shrink-0 rounded border-input accent-primary"
                    />
                    <span className={payRemovedVisits ? 'text-muted-foreground' : undefined}>
                      Include in payroll
                      {payRemovedVisits ? (
                        <span className="mt-0.5 block text-xs">Not used — the removed visits are paid instead.</span>
                      ) : null}
                    </span>
                  </label>
                  <label
                    htmlFor="nca-oncall"
                    className="flex cursor-pointer items-start gap-3 rounded-md py-0.5 text-sm leading-snug text-foreground"
                  >
                    <input
                      id="nca-oncall"
                      type="checkbox"
                      checked={formOnCall}
                      onChange={e => setFormOnCall(e.target.checked)}
                      className="mt-0.5 h-4 w-4 shrink-0 rounded border-input accent-primary"
                    />
                    <span>On call for period</span>
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="nca-notes" className="text-sm font-medium leading-none text-foreground">
                  Notes <span className="font-normal text-muted-foreground">(optional)</span>
                </label>
                <textarea
                  id="nca-notes"
                  rows={4}
                  value={formNotes}
                  onChange={e => setFormNotes(e.target.value)}
                  placeholder="e.g. Approved by manager, half day…"
                  className="flex min-h-[100px] w-full resize-y rounded-md border border-input bg-background px-3 py-2.5 text-sm shadow-sm transition-colors placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0 focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
            </div>
          </DialogBody>

          <DialogFooter className="shrink-0 gap-3 px-6 py-4 sm:gap-3">
            <Button type="button" variant="outline" className="min-w-[88px]" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="button" className="min-w-[88px]" disabled={saving} onClick={() => void onSave()}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
