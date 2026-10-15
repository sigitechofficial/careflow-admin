import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEmployees } from '@/features/employees/hooks/useEmployees'
import { createParentalLeave } from '@/features/parental-leave/api'
import {
  MAX_PARENTAL_LEAVE_WEEKS,
  PARENTAL_LEAVE_STATUSES,
  PARENTAL_LEAVE_TYPES,
  type ParentalLeaveStatus,
  type ParentalLeaveType,
} from '@/features/parental-leave/constants'
import { PARENTAL_LEAVE_QUERY_KEY } from '@/features/parental-leave/query-key'
import { Button } from '@/shared/ui/button'
import { Combobox, type ComboboxOption } from '@/shared/ui/combobox'
import { Input } from '@/shared/ui/input'
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

const selectClass = 'flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm'

/** datetime-local value (treated as UTC) → ISO string. */
function localInputToIso(value: string): string | null {
  return value ? `${value}:00.000Z` : null
}

type Draft = {
  employeeId: string
  absenceType: ParentalLeaveType
  from: string
  to: string
  permissionStatus: ParentalLeaveStatus
  notes: string
}

const EMPTY_DRAFT: Draft = {
  employeeId: '',
  absenceType: 'Maternity',
  from: '',
  to: '',
  permissionStatus: 'Authorised',
  notes: '',
}

export function ParentalLeaveFormDialog({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const qc = useQueryClient()
  const [draft, setDraft] = React.useState<Draft>(EMPTY_DRAFT)
  const [error, setError] = React.useState<string | null>(null)
  const [employeeSearch, setEmployeeSearch] = React.useState('')
  const [selectedEmployeeName, setSelectedEmployeeName] = React.useState('')

  const employeesQuery = useEmployees(
    { limit: 100, sortBy: 'name', sortOrder: 'asc', search: employeeSearch.trim() || undefined },
    open,
  )
  const createMutation = useMutation({
    mutationFn: createParentalLeave,
    onSuccess: () => void qc.invalidateQueries({ queryKey: PARENTAL_LEAVE_QUERY_KEY }),
  })

  React.useEffect(() => {
    if (open) {
      setDraft(EMPTY_DRAFT)
      setError(null)
      setEmployeeSearch('')
    }
  }, [open])

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft(d => ({ ...d, [key]: value }))

  const employeeOptions = React.useMemo<ComboboxOption[]>(() => {
    const options = (employeesQuery.data?.rows ?? []).map(emp => ({
      value: emp.id,
      label: emp.fullName ?? (`${emp.firstName ?? ''} ${emp.lastName ?? ''}`.trim() || 'Unknown'),
    }))
    if (draft.employeeId && !options.some(o => o.value === draft.employeeId)) {
      options.unshift({ value: draft.employeeId, label: selectedEmployeeName || 'Selected employee' })
    }
    return options
  }, [employeesQuery.data?.rows, draft.employeeId, selectedEmployeeName])

  const handleSave = async () => {
    setError(null)
    if (!draft.employeeId) {
      setError('Select an employee.')
      return
    }
    const fromIso = localInputToIso(draft.from)
    const toIso = localInputToIso(draft.to)
    if (!fromIso || !toIso) {
      setError('From and To date/time are required.')
      return
    }
    if (new Date(toIso).getTime() <= new Date(fromIso).getTime()) {
      setError('To date/time must be after From date/time.')
      return
    }
    const maxMs = MAX_PARENTAL_LEAVE_WEEKS * 7 * 86_400_000
    if (new Date(toIso).getTime() - new Date(fromIso).getTime() > maxMs) {
      setError(`${draft.absenceType} leave cannot exceed ${MAX_PARENTAL_LEAVE_WEEKS} weeks.`)
      return
    }

    try {
      await createMutation.mutateAsync({
        employeeId: draft.employeeId,
        absenceType: draft.absenceType,
        fromDateTime: fromIso,
        toDateTime: toIso,
        permissionStatus: draft.permissionStatus,
        notes: draft.notes.trim() || null,
      })
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the leave record.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent size="lg" className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Record parental leave</DialogTitle>
          <DialogDescription>
            Maternity or paternity leave, approved up to {MAX_PARENTAL_LEAVE_WEEKS} weeks.
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
          <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label>Employee</Label>
              <Combobox
                options={employeeOptions}
                value={draft.employeeId}
                onChange={value => {
                  set('employeeId', value)
                  setSelectedEmployeeName(employeeOptions.find(o => o.value === value)?.label ?? '')
                }}
                placeholder="Select employee…"
                searchPlaceholder="Search employees…"
                emptyText={employeesQuery.isError ? 'Could not load employees.' : 'No employees found.'}
                loading={employeesQuery.isLoading || employeesQuery.isFetching}
                onSearchChange={setEmployeeSearch}
                allowDeselect={false}
                aria-label="Employee"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Leave type</Label>
              <select
                className={selectClass}
                value={draft.absenceType}
                onChange={e => set('absenceType', e.target.value as ParentalLeaveType)}
              >
                {PARENTAL_LEAVE_TYPES.map(t => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Approval status</Label>
              <select
                className={selectClass}
                value={draft.permissionStatus}
                onChange={e => set('permissionStatus', e.target.value as ParentalLeaveStatus)}
              >
                {PARENTAL_LEAVE_STATUSES.map(s => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>From date/time</Label>
              <Input type="datetime-local" value={draft.from} onChange={e => set('from', e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>To date/time</Label>
              <Input type="datetime-local" value={draft.to} onChange={e => set('to', e.target.value)} />
            </div>

            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label>Notes</Label>
              <Textarea
                rows={3}
                value={draft.notes}
                onChange={e => set('notes', e.target.value)}
                placeholder="e.g. MATB1 received; expected return date…"
              />
            </div>
          </div>

          {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
        </DialogBody>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={createMutation.isPending}>
            {createMutation.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
            Record leave
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
