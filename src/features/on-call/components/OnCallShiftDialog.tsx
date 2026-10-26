import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { useEmployees } from '@/features/employees/hooks/useEmployees'
import { useSaveOnCallShift } from '@/features/on-call/hooks/useOnCall'
import { TIER_LABEL, type OnCallShiftRow, type OnCallTier } from '@/features/on-call/types'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
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
import { Label, Textarea } from '@/shared/ui/form-field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { isoToOrgDatetimeLocal, orgDatetimeLocalToIso } from '@/shared/lib/operational-day.util'

const ALL_BRANCHES = '__all__'

type Draft = { employeeId: string; tier: OnCallTier; locationId: string; start: string; end: string; notes: string }

export function OnCallShiftDialog({
  open,
  onClose,
  shift,
  defaultDay,
  branchOptions,
}: {
  open: boolean
  onClose: () => void
  /** Shift to edit; null to add. */
  shift: OnCallShiftRow | null
  /** 'YYYY-MM-DD' used for a new shift's default 17:00 → 09:00 times. */
  defaultDay: string
  branchOptions: { value: string; label: string }[]
}) {
  const [draft, setDraft] = React.useState<Draft>(() => emptyDraft(defaultDay))
  const [error, setError] = React.useState<string | null>(null)
  const [employeeSearch, setEmployeeSearch] = React.useState('')
  const [employeeName, setEmployeeName] = React.useState('')

  React.useEffect(() => {
    if (!open) return
    setError(null)
    setEmployeeSearch('')
    if (shift) {
      setDraft({
        employeeId: shift.employeeId,
        tier: shift.tier,
        locationId: shift.locationId ?? ALL_BRANCHES,
        start: isoToOrgDatetimeLocal(shift.startsAt),
        end: isoToOrgDatetimeLocal(shift.endsAt),
        notes: shift.notes ?? '',
      })
      setEmployeeName(shift.employeeName ?? '')
    } else {
      setDraft(emptyDraft(defaultDay))
      setEmployeeName('')
    }
  }, [open, shift, defaultDay])

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft(d => ({ ...d, [key]: value }))

  const employeesQuery = useEmployees(
    { limit: 50, sortBy: 'name', sortOrder: 'asc', search: employeeSearch.trim() || undefined },
    open,
  )
  const employeeOptions = React.useMemo<ComboboxOption[]>(() => {
    const options = (employeesQuery.data?.rows ?? []).map(emp => ({
      value: emp.id,
      label: emp.fullName ?? (`${emp.firstName ?? ''} ${emp.lastName ?? ''}`.trim() || 'Unknown'),
    }))
    if (draft.employeeId && !options.some(o => o.value === draft.employeeId)) {
      options.unshift({ value: draft.employeeId, label: employeeName || 'Selected staff member' })
    }
    return options
  }, [employeesQuery.data?.rows, draft.employeeId, employeeName])

  const mutation = useSaveOnCallShift()

  const save = () => {
    setError(null)
    if (!draft.employeeId) return setError('Choose who is on call.')
    const startIso = orgDatetimeLocalToIso(draft.start)
    const endIso = orgDatetimeLocalToIso(draft.end)
    if (!startIso || !endIso) return setError('Enter the start and end.')
    if (new Date(endIso) <= new Date(startIso)) return setError('The shift must end after it starts.')
    mutation.mutate(
      {
        id: shift?.id,
        body: {
          employeeId: draft.employeeId,
          tier: draft.tier,
          // null on change = covers every branch; omitted for a new shift.
          locationId: draft.locationId === ALL_BRANCHES ? (shift ? null : undefined) : draft.locationId,
          startsAt: startIso,
          endsAt: endIso,
          notes: draft.notes.trim() || undefined,
        },
      },
      {
        onSuccess: () => {
          toastSuccess(shift ? 'On-call shift updated' : 'On-call shift added')
          onClose()
        },
        onError: e => toastApiError(e, 'Could not save the on-call shift'),
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>{shift ? 'Change on-call shift' : 'Add on-call shift'}</DialogTitle>
          <DialogDescription>Who covers calls while the office is closed.</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label required>Staff member</Label>
              <Combobox
                options={employeeOptions}
                value={draft.employeeId}
                onChange={value => {
                  set('employeeId', value)
                  setEmployeeName(employeeOptions.find(o => o.value === value)?.label ?? '')
                }}
                placeholder="Choose who is on call…"
                searchPlaceholder="Search staff…"
                emptyText={employeesQuery.isError ? 'Could not load staff.' : 'No staff found.'}
                loading={employeesQuery.isLoading || employeesQuery.isFetching}
                onSearchChange={setEmployeeSearch}
                allowDeselect={false}
                aria-label="Staff member"
                data-testid="on-call-shift-employee"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label required>Line</Label>
              <Select value={draft.tier} onValueChange={v => set('tier', v as OnCallTier)}>
                <SelectTrigger data-testid="on-call-shift-tier">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(TIER_LABEL) as OnCallTier[]).map(t => (
                    <SelectItem key={t} value={t}>
                      {TIER_LABEL[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Branch</Label>
              <Select value={draft.locationId} onValueChange={v => set('locationId', v)}>
                <SelectTrigger data-testid="on-call-shift-branch">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_BRANCHES}>All branches</SelectItem>
                  {branchOptions.map(b => (
                    <SelectItem key={b.value} value={b.value}>
                      {b.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label required>Starts</Label>
              <Input type="datetime-local" value={draft.start} onChange={e => set('start', e.target.value)} data-testid="on-call-shift-start" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label required>Ends</Label>
              <Input type="datetime-local" value={draft.end} onChange={e => set('end', e.target.value)} data-testid="on-call-shift-end" />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label>Notes</Label>
              <Textarea
                rows={2}
                maxLength={500}
                value={draft.notes}
                onChange={e => set('notes', e.target.value)}
                placeholder="e.g. contact number for this shift"
              />
            </div>
          </div>
          {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={save} disabled={mutation.isPending} data-testid="on-call-shift-save">
            {mutation.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function emptyDraft(day: string): Draft {
  const next = new Date(`${day}T12:00:00Z`)
  next.setUTCDate(next.getUTCDate() + 1)
  return {
    employeeId: '',
    tier: 'FIRST_LINE',
    locationId: ALL_BRANCHES,
    start: `${day}T17:00`,
    end: `${next.toISOString().slice(0, 10)}T09:00`,
    notes: '',
  }
}
