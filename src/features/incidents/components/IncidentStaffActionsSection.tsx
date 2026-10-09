import * as React from 'react'
import { Pencil, Trash2, UserCog } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Textarea } from '@/shared/ui/form-field'
import { Badge } from '@/shared/ui/badge'
import { Combobox, type ComboboxOption } from '@/shared/ui/combobox'
import { formatOrganisationIsoDateLong } from '@/shared/lib/organisation-display-format.store'
import { operationalTodayIso } from '@/shared/lib/operational-day.util'
import { useAuthStore } from '@/features/auth/store'
import { useEmployees } from '@/features/employees/hooks/useEmployees'
import { useEmployeeNameMap } from '@/features/employees/hooks/useEmployeeNameMap'
import {
  useCreateIncidentStaffAction,
  useRemoveIncidentStaffAction,
  useUpdateIncidentStaffAction,
} from '@/features/incidents/hooks/useIncidents'
import { IncidentSuspensionDecisions } from '@/features/incidents/components/IncidentSuspensionCard'
import {
  INCIDENT_ACTION_STATUS_BADGE,
  INCIDENT_ACTION_STATUS_LABELS,
  STAFF_ACTION_TYPE_OPTIONS,
  incidentMeasureTypeLabel,
  type IncidentAction,
  type IncidentDetail,
  type IncidentStaffAction,
  type IncidentStaffActionType,
} from '@/features/incidents/types'

const inputClass =
  'mt-1 h-9 w-full rounded-md border border-border bg-background px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring'

/** Corrective measures about named staff (shown here, managed in Corrective measures). */
const STAFF_MEASURE_TYPES = ['COURSE', 'SUPERVISION', 'COMPETENCY_CHECK']

export function isStaffMeasure(a: IncidentAction): boolean {
  return !!a.measureType && STAFF_MEASURE_TYPES.includes(a.measureType)
}

/** The staff a staff measure is about: a course names its carer first, then the course. */
function measureStaff(a: IncidentAction): { id: string; label: string }[] {
  const links = a.linkedRecords ?? []
  return a.measureType === 'COURSE' ? links.slice(0, 1) : links
}

function monthLabel(month: string): string {
  const [y = 0, m = 1] = month.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleString('en-GB', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

function fineText(a: Pick<IncidentStaffAction, 'fineAmount' | 'fineSalaryMonth'>): string | null {
  if (a.fineAmount == null || !a.fineSalaryMonth) return null
  return `£${a.fineAmount.toFixed(2)} from ${monthLabel(a.fineSalaryMonth)} salary`
}

const actionBadge = (t: IncidentStaffActionType) =>
  t === 'NO_ACTION' || t === 'INFORMAL_DISCUSSION'
    ? 'muted'
    : t === 'DISMISSAL' || t === 'FINAL_WRITTEN_WARNING' || t === 'FINE'
      ? 'destructive'
      : 'warning'

function Req() {
  return <span className="ml-0.5 text-destructive dark:text-red-400">*</span>
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="mt-1 text-xs text-destructive dark:text-red-400">{message}</p>
}

type FormState = {
  employeeId: string
  actionType: IncidentStaffActionType | ''
  reason: string
  toldOn: string
  fineAmount: string
  fineMonth: string
  confirmed: boolean
  changeReason: string
}

const blankForm = (employeeId = ''): FormState => ({
  employeeId,
  actionType: '',
  reason: '',
  toldOn: '',
  fineAmount: '',
  fineMonth: '',
  confirmed: false,
  changeReason: '',
})

/**
 * Add or change one staff action. Changing needs a reason; a fine needs an amount, a salary
 * month that is not past and confirmation that the contract (or written consent) allows it.
 */
function StaffActionForm({
  incidentId,
  existing,
  takenIds,
  suggestions,
  nameMap,
  canFine,
  onDone,
}: {
  incidentId: string
  existing?: IncidentStaffAction
  takenIds: Set<string>
  suggestions: { id: string; why: string }[]
  nameMap: Map<string, string>
  canFine: boolean
  onDone: () => void
}) {
  const create = useCreateIncidentStaffAction(incidentId)
  const update = useUpdateIncidentStaffAction(incidentId)
  const today = operationalTodayIso()
  const thisMonth = today.slice(0, 7)
  const [form, setForm] = React.useState<FormState>(() =>
    existing
      ? {
          employeeId: existing.employeeId,
          actionType: existing.actionType,
          reason: existing.reason,
          toldOn: existing.staffInformedOn ?? '',
          fineAmount: existing.fineAmount != null ? existing.fineAmount.toFixed(2) : '',
          fineMonth: existing.fineSalaryMonth ?? '',
          confirmed: existing.deductionAllowedConfirmed,
          changeReason: '',
        }
      : blankForm(suggestions.find((s) => !takenIds.has(s.id))?.id ?? ''),
  )
  const [tried, setTried] = React.useState(false)
  const [search, setSearch] = React.useState('')
  const employeesQuery = useEmployees({ limit: 50, search: search || undefined })
  const set = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }))

  const options: ComboboxOption[] = React.useMemo(() => {
    const seen = new Set<string>()
    const rows: ComboboxOption[] = []
    // People on this incident first, then everyone matching the search.
    for (const s of suggestions) {
      if (takenIds.has(s.id) || seen.has(s.id)) continue
      seen.add(s.id)
      rows.push({ value: s.id, label: nameMap.get(s.id) ?? 'Staff member', description: s.why })
    }
    for (const r of employeesQuery.data?.rows ?? []) {
      if (takenIds.has(r.id) || seen.has(r.id)) continue
      seen.add(r.id)
      rows.push({
        value: r.id,
        label: r.fullName || [r.firstName, r.lastName].filter(Boolean).join(' ') || 'Unnamed',
        description: r.jobTitle?.name ?? undefined,
      })
    }
    return rows
  }, [suggestions, takenIds, nameMap, employeesQuery.data])

  const isFine = form.actionType === 'FINE'
  const fineUnchanged =
    !!existing &&
    existing.actionType === 'FINE' &&
    Number(form.fineAmount) === existing.fineAmount &&
    form.fineMonth === existing.fineSalaryMonth
  const amount = Number(form.fineAmount)
  const errors: Partial<Record<keyof FormState, string>> = {}
  if (!existing && !form.employeeId) errors.employeeId = 'Select the staff member'
  if (!form.actionType) errors.actionType = 'Choose the action'
  if (form.reason.trim().length < 3) errors.reason = 'Say why (at least 3 characters)'
  if (form.toldOn && form.toldOn > today) errors.toldOn = 'Cannot be in the future'
  if (isFine) {
    if (!form.fineAmount || !Number.isFinite(amount) || amount <= 0) {
      errors.fineAmount = 'Enter an amount above £0'
    } else if (amount > 100000) errors.fineAmount = 'Too large'
    if (!form.fineMonth) errors.fineMonth = 'Choose the salary month'
    else if (form.fineMonth < thisMonth && !fineUnchanged) {
      errors.fineMonth = 'That salary month has already passed'
    }
    if (!form.confirmed) errors.confirmed = 'Confirm the deduction is allowed'
  }
  if (existing && form.changeReason.trim().length < 3) errors.changeReason = 'Say why it changed'
  const shown = tried ? errors : {}

  function submit() {
    setTried(true)
    if (Object.keys(errors).length || !form.actionType) return
    const body = {
      actionType: form.actionType,
      reason: form.reason.trim(),
      staffInformedOn: form.toldOn || null,
      ...(isFine
        ? {
            fineAmount: Math.round(amount * 100) / 100,
            fineSalaryMonth: form.fineMonth,
            deductionAllowedConfirmed: true,
          }
        : {}),
    }
    if (existing) {
      update.mutate(
        { ...body, staffActionId: existing.id, changeReason: form.changeReason.trim() },
        { onSuccess: onDone },
      )
    } else {
      create.mutate({ ...body, employeeId: form.employeeId }, { onSuccess: onDone })
    }
  }

  const typeOptions = STAFF_ACTION_TYPE_OPTIONS.filter(
    (o) => o.value !== 'FINE' || canFine || existing?.actionType === 'FINE',
  )

  return (
    <div className="space-y-3 rounded-md border border-border bg-background p-3">
      {existing ? (
        <p className="text-sm font-medium text-foreground">
          Change the action for {nameMap.get(existing.employeeId) ?? 'this staff member'}
        </p>
      ) : (
        <div>
          <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">
            Staff member
            <Req />
          </p>
          <Combobox
            value={form.employeeId}
            onChange={(v) => set({ employeeId: v })}
            options={options}
            onSearchChange={setSearch}
            loading={employeesQuery.isLoading}
            placeholder="Select staff member"
            searchPlaceholder="Search staff…"
            emptyText="No staff match your search."
            error={!!shown.employeeId}
          />
          <FieldError message={shown.employeeId} />
        </div>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="text-xs uppercase tracking-wide text-muted-foreground" htmlFor="staff-action-type">
            Action
            <Req />
          </label>
          <select
            id="staff-action-type"
            className={inputClass}
            value={form.actionType}
            onChange={(e) => set({ actionType: e.target.value as IncidentStaffActionType })}
          >
            <option value="">Choose…</option>
            {typeOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <FieldError message={shown.actionType} />
        </div>
        <div>
          <label className="text-xs uppercase tracking-wide text-muted-foreground" htmlFor="staff-action-told">
            Told the staff member on
          </label>
          <input
            id="staff-action-told"
            type="date"
            className={inputClass}
            max={today}
            value={form.toldOn}
            onChange={(e) => set({ toldOn: e.target.value })}
          />
          <p className="mt-1 text-xs text-muted-foreground">Leave empty if they have not been told yet.</p>
          <FieldError message={shown.toldOn} />
        </div>
      </div>

      {isFine && (
        <div className="space-y-3 rounded-md border border-destructive/30 bg-destructive/5 p-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs uppercase tracking-wide text-muted-foreground" htmlFor="staff-fine-amount">
                Amount (£)
                <Req />
              </label>
              <input
                id="staff-fine-amount"
                type="number"
                inputMode="decimal"
                min="0.01"
                step="0.01"
                className={inputClass}
                value={form.fineAmount}
                onChange={(e) => set({ fineAmount: e.target.value })}
              />
              <FieldError message={shown.fineAmount} />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wide text-muted-foreground" htmlFor="staff-fine-month">
                Deduct from salary month
                <Req />
              </label>
              <input
                id="staff-fine-month"
                type="month"
                className={inputClass}
                min={fineUnchanged ? undefined : thisMonth}
                value={form.fineMonth}
                onChange={(e) => set({ fineMonth: e.target.value })}
              />
              <FieldError message={shown.fineMonth} />
            </div>
          </div>
          <label className="flex items-start gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={form.confirmed}
              onChange={(e) => set({ confirmed: e.target.checked })}
            />
            <span>
              Their contract, or their written agreement given beforehand, allows this deduction from
              wages (Employment Rights Act 1996, section 13).
            </span>
          </label>
          <FieldError message={shown.confirmed} />
          <p className="text-xs text-muted-foreground">
            The fine is added to their Salary tab with this incident&apos;s reference. Change or remove
            it here, not on the Salary tab.
          </p>
        </div>
      )}

      <div>
        <label className="text-xs uppercase tracking-wide text-muted-foreground" htmlFor="staff-action-reason">
          Reason for this action
          <Req />
        </label>
        <Textarea
          id="staff-action-reason"
          className="mt-1"
          rows={2}
          value={form.reason}
          onChange={(e) => set({ reason: e.target.value })}
        />
        <FieldError message={shown.reason} />
      </div>
      {existing && (
        <div>
          <label className="text-xs uppercase tracking-wide text-muted-foreground" htmlFor="staff-action-change">
            Why is the decision changing?
            <Req />
          </label>
          <Textarea
            id="staff-action-change"
            className="mt-1"
            rows={2}
            value={form.changeReason}
            onChange={(e) => set({ changeReason: e.target.value })}
          />
          <FieldError message={shown.changeReason} />
        </div>
      )}
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button size="sm" loading={create.isPending || update.isPending} onClick={submit}>
          {existing ? 'Save change' : 'Record action'}
        </Button>
      </div>
    </div>
  )
}

function StaffActionRow({
  incidentId,
  a,
  name,
  canEdit,
  onChange,
}: {
  incidentId: string
  a: IncidentStaffAction
  name: string
  canEdit: boolean
  onChange: () => void
}) {
  const remove = useRemoveIncidentStaffAction(incidentId)
  const [removing, setRemoving] = React.useState(false)
  const [reason, setReason] = React.useState('')
  const fine = fineText(a)
  return (
    <li className="rounded-md border border-border px-3 py-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 text-sm font-medium text-foreground">
            {name}
            <Badge size="sm" variant={actionBadge(a.actionType)}>
              {a.actionLabel}
            </Badge>
          </div>
          {fine && (
            <p className="mt-1 text-sm text-foreground">
              {fine} <span className="text-xs text-muted-foreground">· on their Salary tab</span>
            </p>
          )}
          <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{a.reason}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {a.staffInformedOn
              ? `Told on ${formatOrganisationIsoDateLong(a.staffInformedOn)}`
              : 'Not told yet'}
          </p>
        </div>
        {canEdit && !removing && (
          <div className="flex shrink-0 gap-1.5">
            <Button size="sm" variant="outline" onClick={onChange}>
              <Pencil className="mr-1 h-4 w-4" /> Change
            </Button>
            <Button size="sm" variant="outline" onClick={() => setRemoving(true)}>
              <Trash2 className="mr-1 h-4 w-4" /> Remove
            </Button>
          </div>
        )}
      </div>
      {removing && (
        <div className="mt-2 space-y-2 border-t border-border pt-2">
          <label className="text-xs font-medium text-foreground" htmlFor={`remove-${a.id}`}>
            Why is this action removed?
            <Req />
          </label>
          {a.actionType === 'FINE' && (
            <p className="text-xs text-muted-foreground">The fine will also be taken off their salary.</p>
          )}
          <Textarea
            id={`remove-${a.id}`}
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setRemoving(false)
                setReason('')
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              variant="destructive"
              loading={remove.isPending}
              disabled={reason.trim().length < 3}
              onClick={() => remove.mutate({ staffActionId: a.id, reason: reason.trim() })}
            >
              Remove action
            </Button>
          </div>
        </div>
      )}
    </li>
  )
}

/**
 * Outcome & close → Staff actions: everything decided for staff on this incident in one place —
 * interim suspensions, training and supervision measures, and the HR decision (no action, warning,
 * fine, dismissal…).
 */
export function IncidentStaffActionsSection({
  incident,
  canEdit,
}: {
  incident: IncidentDetail
  /** Can edit the outcome and the incident is not closed. */
  canEdit: boolean
}) {
  const can = useAuthStore((s) => s.can)
  const canFine = can('billing.payroll_runs.manage') || can('employees.update')
  const suspensions = incident.carerSuspensions ?? []
  const staffActions = incident.staffActions ?? []
  const staffMeasures = (incident.actions ?? []).filter(isStaffMeasure)
  // Decided after the review or investigation (the API refuses other stages).
  const decisionStage =
    incident.status === 'ACTIONS_REQUIRED' || incident.status === 'AWAITING_CLOSURE'
  const editable = canEdit && decisionStage

  const suggestions = React.useMemo(() => {
    const out: { id: string; why: string }[] = []
    const add = (id: string | null | undefined, why: string) => {
      if (id && !out.some((s) => s.id === id)) out.push({ id, why })
    }
    for (const s of suspensions) add(s.employeeId, 'Suspended on this incident')
    add(incident.primaryEmployee?.id, 'Person affected')
    for (const e of incident.involvedEmployees ?? []) add(e.id, 'Involved')
    for (const m of staffMeasures) for (const p of measureStaff(m)) add(p.id, 'Named in a measure')
    return out
  }, [suspensions, incident.primaryEmployee, incident.involvedEmployees, staffMeasures])

  const nameMap = useEmployeeNameMap([
    ...suggestions.map((s) => s.id),
    ...staffActions.map((a) => a.employeeId),
  ])
  const takenIds = React.useMemo(() => new Set(staffActions.map((a) => a.employeeId)), [staffActions])
  const [editing, setEditing] = React.useState<string | 'new' | null>(null)

  const nothing = suspensions.length === 0 && staffMeasures.length === 0 && staffActions.length === 0

  return (
    <div className="rounded-lg border border-border p-3 sm:p-4">
      <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
        <UserCog className="h-4 w-4" /> Staff actions
      </h3>
      <p className="mb-3 mt-0.5 text-xs text-muted-foreground">
        Everything decided for staff on this incident: suspensions, training and supervision, and
        the outcome for each person (no action, a warning, a fine or dismissal).
      </p>

      <div className="space-y-4">
        <IncidentSuspensionDecisions
          incidentId={incident.id}
          suspensions={suspensions}
          canEdit={canEdit}
        />

        {staffMeasures.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Training and supervision ({staffMeasures.length})
            </p>
            <ul className="mt-1 space-y-1.5">
              {staffMeasures.map((m) => (
                <li key={m.id} className="rounded-md border border-border px-3 py-2 text-sm">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="info" size="sm">
                      {incidentMeasureTypeLabel(m.measureType)}
                    </Badge>
                    <span className="font-medium text-foreground">{m.title}</span>
                    <Badge variant={INCIDENT_ACTION_STATUS_BADGE[m.displayStatus]} size="sm">
                      {INCIDENT_ACTION_STATUS_LABELS[m.displayStatus]}
                    </Badge>
                  </div>
                  {measureStaff(m).length > 0 && (
                    <p className="mt-0.5 text-xs text-foreground">
                      For: {measureStaff(m).map((p) => p.label).join(', ')}
                    </p>
                  )}
                  {m.completionNotes && (
                    <p className="mt-0.5 text-xs text-muted-foreground">✓ {m.completionNotes}</p>
                  )}
                </li>
              ))}
            </ul>
            <p className="mt-1 text-xs text-muted-foreground">
              Add or change these in the Corrective measures tab.
            </p>
          </div>
        )}

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Outcome for each staff member ({staffActions.length})
          </p>
          {staffActions.length === 0 && editing !== 'new' && (
            <p className="mt-1 text-sm text-muted-foreground">
              {nothing ? 'No staff action recorded.' : 'No outcome recorded for any staff member yet.'}
            </p>
          )}
          {staffActions.length > 0 && (
            <ul className="mt-1 space-y-2">
              {staffActions.map((a) =>
                editing === a.id ? (
                  <li key={a.id}>
                    <StaffActionForm
                      incidentId={incident.id}
                      existing={a}
                      takenIds={takenIds}
                      suggestions={suggestions}
                      nameMap={nameMap}
                      canFine={canFine}
                      onDone={() => setEditing(null)}
                    />
                  </li>
                ) : (
                  <StaffActionRow
                    key={a.id}
                    incidentId={incident.id}
                    a={a}
                    name={nameMap.get(a.employeeId) ?? 'Staff member'}
                    canEdit={editable && editing === null}
                    onChange={() => setEditing(a.id)}
                  />
                ),
              )}
            </ul>
          )}
          {editing === 'new' && (
            <div className="mt-2">
              <StaffActionForm
                incidentId={incident.id}
                takenIds={takenIds}
                suggestions={suggestions}
                nameMap={nameMap}
                canFine={canFine}
                onDone={() => setEditing(null)}
              />
            </div>
          )}
          {editable && editing === null && (
            <Button size="sm" variant="outline" className="mt-2" onClick={() => setEditing('new')}>
              Add staff action
            </Button>
          )}
          {canEdit && !decisionStage && (
            <p className="mt-1 text-xs text-muted-foreground">
              Staff outcomes are recorded after the review or investigation (Actions required or
              Ready to close).
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
