import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { useEmployees } from '@/features/employees/hooks/useEmployees'
import {
  useCreateEmployeeAbsence,
  useUpdateEmployeeAbsence,
} from '@/features/employees/hooks/useEmployeeAbsences'
import {
  ABSENCE_PERMISSION_STATUSES,
  ABSENCE_TYPES,
  type AbsencePermissionStatus,
  type AbsenceType,
  type EmployeeAbsenceRow,
} from '@/features/employees/api/employee-absences.api'
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

/** ISO string → value for <input type="datetime-local"> (interpreted as UTC). */
function isoToLocalInput(iso: string | null | undefined): string {
  return iso ? iso.slice(0, 16) : ''
}

/** datetime-local value (treated as UTC) → ISO string. */
function localInputToIso(value: string): string | null {
  return value ? `${value}:00.000Z` : null
}

type Draft = {
  employeeId: string
  absenceType: AbsenceType
  from: string
  to: string
  permissionStatus: AbsencePermissionStatus
  sicknessFlag: boolean
  lastMinuteFlag: boolean
  returnToWorkCompleted: boolean
  evidenceHeld: boolean
  notes: string
  countryVisited: string
  trackerStatus: string
  evidenceNotesStatus: string
  managerAction: string
  comments: string
  cosWorkerRef: string
  visaRtwExpiry: string
  evidenceTypeRequired: string
  evidenceReceivedDate: string
  continuousDays: string
  smsReported: 'na' | 'yes' | 'no'
  smsReportDate: string
  responsiblePerson: string
  nextReviewDate: string
}

const EMPTY_DRAFT: Draft = {
  employeeId: '',
  absenceType: 'Holiday',
  from: '',
  to: '',
  permissionStatus: 'Authorised',
  sicknessFlag: false,
  lastMinuteFlag: false,
  returnToWorkCompleted: false,
  evidenceHeld: false,
  notes: '',
  countryVisited: '',
  trackerStatus: '',
  evidenceNotesStatus: 'Notes Received',
  managerAction: 'No action unless required',
  comments: '',
  cosWorkerRef: '',
  visaRtwExpiry: '',
  evidenceTypeRequired: '',
  evidenceReceivedDate: '',
  continuousDays: '',
  smsReported: 'na',
  smsReportDate: '',
  responsiblePerson: 'HR / Compliance',
  nextReviewDate: '',
}

function draftFromRow(row: EmployeeAbsenceRow): Draft {
  return {
    employeeId: row.employeeId,
    absenceType: (ABSENCE_TYPES as readonly string[]).includes(row.absenceType)
      ? (row.absenceType as AbsenceType)
      : 'Other',
    from: isoToLocalInput(row.fromDateTime),
    to: isoToLocalInput(row.toDateTime),
    permissionStatus: (ABSENCE_PERMISSION_STATUSES as readonly string[]).includes(
      row.permissionStatus,
    )
      ? (row.permissionStatus as AbsencePermissionStatus)
      : 'Authorised',
    sicknessFlag: row.sicknessFlag,
    lastMinuteFlag: row.lastMinuteFlag,
    returnToWorkCompleted: row.returnToWorkCompleted,
    evidenceHeld: row.evidenceHeld,
    notes: row.notes ?? '',
    countryVisited: row.countryVisited ?? '',
    trackerStatus: row.trackerStatus ?? '',
    evidenceNotesStatus: row.evidenceNotesStatus ?? '',
    managerAction: row.managerAction ?? '',
    comments: row.comments ?? '',
    cosWorkerRef: row.cosWorkerRef ?? '',
    visaRtwExpiry: row.visaRtwExpiry ?? '',
    evidenceTypeRequired: row.evidenceTypeRequired ?? '',
    evidenceReceivedDate: row.evidenceReceivedDate ?? '',
    continuousDays: row.continuousDaysOverridden ? String(row.continuousWorkingDaysAbsent) : '',
    smsReported: row.smsReported == null ? 'na' : row.smsReported ? 'yes' : 'no',
    smsReportDate: row.smsReportDate ?? '',
    responsiblePerson: row.responsiblePerson ?? '',
    nextReviewDate: row.nextReviewDate ?? '',
  }
}

export function EmployeeAbsenceFormDialog({
  open,
  onClose,
  editing,
  fixedEmployeeId,
  fixedEmployeeName,
}: {
  open: boolean
  onClose: () => void
  editing: EmployeeAbsenceRow | null
  /** When set, records are created for this employee and the picker is hidden. */
  fixedEmployeeId?: string
  fixedEmployeeName?: string
}) {
  const [draft, setDraft] = React.useState<Draft>(EMPTY_DRAFT)
  const [error, setError] = React.useState<string | null>(null)
  const [employeeSearch, setEmployeeSearch] = React.useState('')
  const [selectedEmployeeName, setSelectedEmployeeName] = React.useState('')

  const employeesQuery = useEmployees(
    {
      limit: 100,
      sortBy: 'name',
      sortOrder: 'asc',
      search: employeeSearch.trim() || undefined,
    },
    open && !editing && !fixedEmployeeId,
  )
  const createMutation = useCreateEmployeeAbsence()
  const updateMutation = useUpdateEmployeeAbsence()
  const pending = createMutation.isPending || updateMutation.isPending

  React.useEffect(() => {
    if (open) {
      setDraft(
        editing
          ? draftFromRow(editing)
          : { ...EMPTY_DRAFT, employeeId: fixedEmployeeId ?? '' },
      )
      setError(null)
      setEmployeeSearch('')
    }
  }, [open, editing, fixedEmployeeId])

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft(d => ({ ...d, [key]: value }))

  /** Holiday-linked records mirror the booking; span/type are edited on the holiday. */
  const spanLocked = Boolean(editing?.holidayId)

  const employeeOptions = React.useMemo<ComboboxOption[]>(() => {
    const options = (employeesQuery.data?.rows ?? []).map(emp => ({
      value: emp.id,
      label:
        emp.fullName ?? (`${emp.firstName ?? ''} ${emp.lastName ?? ''}`.trim() || 'Unknown'),
    }))
    // Keep the chosen employee visible even when the server-side search excludes them.
    if (draft.employeeId && !options.some(o => o.value === draft.employeeId)) {
      options.unshift({
        value: draft.employeeId,
        label: selectedEmployeeName || 'Selected employee',
      })
    }
    return options
  }, [employeesQuery.data?.rows, draft.employeeId, selectedEmployeeName])

  const handleSave = async () => {
    setError(null)
    if (!editing && !draft.employeeId) {
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
    const continuousDays =
      draft.continuousDays.trim() === '' ? null : Math.max(0, Number(draft.continuousDays))
    if (continuousDays != null && !Number.isFinite(continuousDays)) {
      setError('Continuous working days must be a number.')
      return
    }

    const body = {
      ...(spanLocked
        ? {}
        : { absenceType: draft.absenceType, fromDateTime: fromIso, toDateTime: toIso }),
      permissionStatus: draft.permissionStatus,
      sicknessFlag: draft.sicknessFlag,
      lastMinuteFlag: draft.lastMinuteFlag,
      returnToWorkCompleted: draft.returnToWorkCompleted,
      evidenceHeld: draft.evidenceHeld,
      notes: draft.notes.trim() || null,
      countryVisited: draft.countryVisited.trim() || null,
      trackerStatus: draft.trackerStatus.trim() || null,
      evidenceNotesStatus: draft.evidenceNotesStatus.trim() || null,
      managerAction: draft.managerAction.trim() || null,
      comments: draft.comments.trim() || null,
      cosWorkerRef: draft.cosWorkerRef.trim() || null,
      visaRtwExpiry: draft.visaRtwExpiry.trim() || null,
      evidenceTypeRequired: draft.evidenceTypeRequired.trim() || null,
      evidenceReceivedDate: draft.evidenceReceivedDate || null,
      continuousWorkingDaysAbsent: continuousDays,
      smsReported: draft.smsReported === 'na' ? null : draft.smsReported === 'yes',
      smsReportDate: draft.smsReportDate || null,
      responsiblePerson: draft.responsiblePerson.trim() || null,
      nextReviewDate: draft.nextReviewDate || null,
    }

    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, body })
      } else {
        await createMutation.mutateAsync({
          ...body,
          employeeId: draft.employeeId,
          absenceType: draft.absenceType,
          fromDateTime: fromIso,
          toDateTime: toIso,
        })
      }
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the absence record.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent size="xl" className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {editing ? `Edit absence — ${editing.recordId}` : 'Record absence'}
          </DialogTitle>
          <DialogDescription>
            {editing
              ? `${editing.employeeName} · duration, month and UKVI triggers are recalculated automatically.`
              : fixedEmployeeName
                ? `${fixedEmployeeName} · duration, month keys, sponsorship and UKVI SMS triggers are derived automatically.`
                : 'Duration, month keys, sponsorship and UKVI SMS triggers are derived automatically.'}
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
        <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
          {!editing && !fixedEmployeeId ? (
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label>Employee</Label>
              <Combobox
                options={employeeOptions}
                value={draft.employeeId}
                onChange={value => {
                  set('employeeId', value)
                  setSelectedEmployeeName(
                    employeeOptions.find(o => o.value === value)?.label ?? '',
                  )
                }}
                placeholder="Select employee…"
                searchPlaceholder="Search employees…"
                emptyText={
                  employeesQuery.isError ? 'Could not load employees.' : 'No employees found.'
                }
                loading={employeesQuery.isLoading || employeesQuery.isFetching}
                onSearchChange={setEmployeeSearch}
                allowDeselect={false}
                aria-label="Employee"
                data-testid="absence-form-employee"
              />
            </div>
          ) : null}

          {spanLocked ? (
            <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground sm:col-span-2">
              This record is linked to a holiday booking — the type and dates follow the holiday
              and are edited there. Compliance fields below can be edited freely.
            </p>
          ) : null}

          <div className="flex flex-col gap-1.5">
            <Label>Absence type</Label>
            <select
              className={selectClass}
              value={draft.absenceType}
              disabled={spanLocked}
              onChange={e => set('absenceType', e.target.value as AbsenceType)}
            >
              {ABSENCE_TYPES.map(t => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Absence permission status</Label>
            <select
              className={selectClass}
              value={draft.permissionStatus}
              onChange={e => set('permissionStatus', e.target.value as AbsencePermissionStatus)}
            >
              {ABSENCE_PERMISSION_STATUSES.map(s => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>From date/time</Label>
            <Input
              type="datetime-local"
              value={draft.from}
              disabled={spanLocked}
              onChange={e => set('from', e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>To date/time</Label>
            <Input
              type="datetime-local"
              value={draft.to}
              disabled={spanLocked}
              onChange={e => set('to', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5 rounded-lg border border-border bg-muted/30 p-4 sm:col-span-2 sm:grid-cols-4">
            {(
              [
                ['sicknessFlag', 'Sickness flag'],
                ['lastMinuteFlag', 'Last minute flag'],
                ['returnToWorkCompleted', 'Return-to-work completed'],
                ['evidenceHeld', 'Evidence held?'],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={draft[key]}
                  onChange={e => set(key, e.target.checked)}
                />
                {label}
              </label>
            ))}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Notes</Label>
            <Input
              value={draft.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="e.g. Eid day"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Country visited</Label>
            <Input
              value={draft.countryVisited}
              onChange={e => set('countryVisited', e.target.value)}
              placeholder="No Recorded"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Tracker status</Label>
            <Input
              value={draft.trackerStatus}
              onChange={e => set('trackerStatus', e.target.value)}
              placeholder="N/A"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Evidence/notes received</Label>
            <Input
              value={draft.evidenceNotesStatus}
              onChange={e => set('evidenceNotesStatus', e.target.value)}
              placeholder="Notes Received"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Manager action / follow-up</Label>
            <Input
              value={draft.managerAction}
              onChange={e => set('managerAction', e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Evidence type required</Label>
            <Input
              value={draft.evidenceTypeRequired}
              onChange={e => set('evidenceTypeRequired', e.target.value)}
              placeholder="e.g. Approved annual leave record"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Evidence received date</Label>
            <Input
              type="date"
              value={draft.evidenceReceivedDate}
              onChange={e => set('evidenceReceivedDate', e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Continuous working days absent</Label>
            <Input
              type="number"
              min={0}
              value={draft.continuousDays}
              onChange={e => set('continuousDays', e.target.value)}
              placeholder="Auto (derived)"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>CoS / worker ref</Label>
            <Input
              value={draft.cosWorkerRef}
              onChange={e => set('cosWorkerRef', e.target.value)}
              placeholder="e.g. C2G8N98265A"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Visa / RTW expiry</Label>
            <Input
              value={draft.visaRtwExpiry}
              onChange={e => set('visaRtwExpiry', e.target.value)}
              placeholder="Date or e.g. British Passport"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>SMS reported?</Label>
            <select
              className={selectClass}
              value={draft.smsReported}
              onChange={e => set('smsReported', e.target.value as Draft['smsReported'])}
            >
              <option value="na">N/A</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>SMS report date</Label>
            <Input
              type="date"
              value={draft.smsReportDate}
              onChange={e => set('smsReportDate', e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Responsible person</Label>
            <Input
              value={draft.responsiblePerson}
              onChange={e => set('responsiblePerson', e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Next review date</Label>
            <Input
              type="date"
              value={draft.nextReviewDate}
              onChange={e => set('nextReviewDate', e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label>Comments</Label>
            <Textarea
              rows={3}
              value={draft.comments}
              onChange={e => set('comments', e.target.value)}
              placeholder="Compliance comments for this absence…"
            />
          </div>
        </div>

        {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
        </DialogBody>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={pending}>
            {pending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
            {editing ? 'Save changes' : 'Record absence'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
