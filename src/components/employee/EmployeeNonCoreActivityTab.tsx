import * as React from 'react'
import { Filter, PenLine, Trash2 } from 'lucide-react'
import { ApiError } from '@/lib/api-client'
import { getApiBaseUrl } from '@/lib/api-base'
import { useAuthStore } from '@/store/auth.store'
import {
  createEmployeeNonCoreActivity,
  deleteEmployeeNonCoreActivity,
  fetchEmployeeLookups,
  fetchNonCoreActivitiesRegistry,
  listAllEmployees,
  updateEmployeeNonCoreActivity,
  type EmployeeListRow,
  type EmployeeLookupsBundle,
  type NonCoreActivityRegistryRow,
} from '@/lib/employees-api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Combobox, type ComboboxOption } from '@/components/ui/combobox'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

const REASON_NONE = '__none__'

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function formatActivityCell(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return `${pad2(d.getDate())}-${pad2(d.getMonth() + 1)}-${d.getFullYear()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

function toDatetimeLocalValue(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

function fromDatetimeLocalValue(local: string): string {
  return new Date(local).toISOString()
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

  const [lookups, setLookups] = React.useState<EmployeeLookupsBundle | null>(null)
  const [employees, setEmployees] = React.useState<EmployeeListRow[]>([])
  const [registry, setRegistry] = React.useState<NonCoreActivityRegistryRow[]>([])
  const [loading, setLoading] = React.useState(false)
  const [loadError, setLoadError] = React.useState<string | null>(null)

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
  const [formNotes, setFormNotes] = React.useState('')
  const [saving, setSaving] = React.useState(false)
  const [formError, setFormError] = React.useState<string | null>(null)
  const [banner, setBanner] = React.useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const reloadAll = React.useCallback(async () => {
    if (!apiConfigured || !jwtPresent) return
    setLoading(true)
    setLoadError(null)
    try {
      const [L, emps, rows] = await Promise.all([
        fetchEmployeeLookups(),
        listAllEmployees({ sortOrder: 'desc' }),
        fetchNonCoreActivitiesRegistry(),
      ])
      setLookups(L)
      setEmployees(emps)
      setRegistry(rows)
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Could not load non-core activities.'
      setLoadError(msg)
      setRegistry([])
      setEmployees([])
      setLookups(null)
    } finally {
      setLoading(false)
    }
  }, [apiConfigured, jwtPresent])

  React.useEffect(() => {
    if (!apiConfigured || !jwtPresent) {
      setLookups(null)
      setEmployees([])
      setRegistry([])
      setLoadError(
        apiConfigured ? 'Sign in with a real JWT to view records.' : 'Set VITE_API_BASE_URL and sign in to load data.',
      )
      return
    }
    void reloadAll()
  }, [apiConfigured, jwtPresent, reloadAll])

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
      includeInPayroll: formIncludePayroll,
      onCallForPeriod: formOnCall,
      notes: formNotes.trim() || undefined,
    }

    setSaving(true)
    setBanner(null)
    try {
      if (editingId) {
        await updateEmployeeNonCoreActivity(editingEmployeeId, editingId, body)
        setBanner({ type: 'success', text: 'Record updated.' })
      } else {
        await createEmployeeNonCoreActivity(formEmployeeId.trim(), body)
        setBanner({ type: 'success', text: 'Record added.' })
      }
      closeModal()
      await reloadAll()
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Save failed.'
      setFormError(msg)
    } finally {
      setSaving(false)
    }
  }

  const onDelete = async (row: NonCoreActivityRegistryRow) => {
    if (!canUpdate) return
    if (!window.confirm('Delete this non-core activity record?')) return
    setBanner(null)
    try {
      await deleteEmployeeNonCoreActivity(row.employeeId, row.id)
      setBanner({ type: 'success', text: 'Record deleted.' })
      await reloadAll()
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Delete failed.'
      setBanner({ type: 'error', text: msg })
    }
  }

  const reasons = lookups?.nonCoreActivityReasons ?? []

  return (
    <div className="space-y-4">
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
          <button type="button" onClick={openCreate} className="text-primary hover:underline font-medium">
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
                  <label
                    htmlFor="nca-payroll"
                    className="flex cursor-pointer items-start gap-3 rounded-md py-0.5 text-sm leading-snug text-foreground"
                  >
                    <input
                      id="nca-payroll"
                      type="checkbox"
                      checked={formIncludePayroll}
                      onChange={e => setFormIncludePayroll(e.target.checked)}
                      className="mt-0.5 h-4 w-4 shrink-0 rounded border-input accent-primary"
                    />
                    <span>Include in payroll</span>
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
