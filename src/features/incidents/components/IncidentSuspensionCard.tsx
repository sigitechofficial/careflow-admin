import * as React from 'react'
import { CalendarPlus, UserCheck, UserX } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Textarea } from '@/shared/ui/form-field'
import { Badge } from '@/shared/ui/badge'
import { Combobox, type ComboboxOption } from '@/shared/ui/combobox'
import { formatOrganisationIsoDateLong } from '@/shared/lib/organisation-display-format.store'
import { operationalTodayIso } from '@/shared/lib/operational-day.util'
import { useEmployees } from '@/features/employees/hooks/useEmployees'
import { useEmployeeNameMap } from '@/features/employees/hooks/useEmployeeNameMap'
import {
  useContinueIncidentCarerSuspension,
  useExtendIncidentCarerSuspension,
  useLiftIncidentCarerSuspension,
} from '@/features/incidents/hooks/useIncidents'
import type { IncidentCarerSuspension } from '@/features/incidents/types'

const inputClass =
  'mt-1 h-9 w-full rounded-md border border-border bg-background px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring'

function addDays(day: string, n: number) {
  const d = new Date(`${day}T00:00:00.000Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

function StatusBadge({ s }: { s: IncidentCarerSuspension }) {
  if (s.status === 'LIFTED') return <Badge size="sm" variant="muted">Lifted</Badge>
  if (s.status === 'SCHEDULED') return <Badge size="sm" variant="info">Scheduled</Badge>
  if (s.reviewDue) return <Badge size="sm" variant="warning">Review due</Badge>
  return <Badge size="sm" variant="destructive">Active</Badge>
}

/**
 * One suspension. During the investigation it can be lifted or extended; at Outcome & close
 * (`decide`) it is lifted or continued beyond the incident. Every change needs a reason.
 */
function SuspensionRow({
  incidentId,
  s,
  name,
  canEdit,
  decide = false,
}: {
  incidentId: string
  s: IncidentCarerSuspension
  name: string
  canEdit: boolean
  decide?: boolean
}) {
  const lift = useLiftIncidentCarerSuspension(incidentId)
  const extend = useExtendIncidentCarerSuspension(incidentId)
  const continueMutation = useContinueIncidentCarerSuspension(incidentId)
  const [mode, setMode] = React.useState<'lift' | 'extend' | 'continue' | null>(null)
  const [reason, setReason] = React.useState('')
  const [newTo, setNewTo] = React.useState('')
  const today = operationalTodayIso()
  const dayAfterEnd = addDays(s.suspendTo, 1)
  const minNewTo =
    mode === 'continue'
      ? s.suspendFrom > today
        ? s.suspendFrom
        : today
      : dayAfterEnd > today
        ? dayAfterEnd
        : today
  const lifted = s.status === 'LIFTED'
  const close = () => {
    setMode(null)
    setReason('')
    setNewTo('')
  }

  return (
    <li
      className={
        lifted
          ? 'rounded-md border border-border px-3 py-2'
          : 'rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2'
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-1.5 text-sm font-medium text-foreground">
            <UserX className="h-4 w-4 text-destructive" /> {name}
            <StatusBadge s={s} />
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatOrganisationIsoDateLong(s.suspendFrom)} → {formatOrganisationIsoDateLong(s.suspendTo)}
          </p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{s.reason}</p>
          {s.reviewDue && (
            <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
              The end date has passed. Lift the suspension or extend it.
            </p>
          )}
          {lifted && s.liftReason && (
            <p className="mt-1 text-xs text-muted-foreground">Lifted: {s.liftReason}</p>
          )}
          {!lifted && s.continuedAt && (
            <p className="mt-1 text-xs font-medium text-foreground">
              Continues after the incident until {formatOrganisationIsoDateLong(s.suspendTo)}:{' '}
              <span className="font-normal">{s.continueReason}</span>
            </p>
          )}
          {decide && !lifted && !s.continuedAt && (
            <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
              Decision needed: lift the suspension, or continue it beyond the incident.
            </p>
          )}
        </div>
        {canEdit && !lifted && !mode && (
          <div className="flex shrink-0 gap-1.5">
            {decide ? (
              <Button size="sm" variant="outline" onClick={() => setMode('continue')}>
                <CalendarPlus className="mr-1 h-4 w-4" /> Continue
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setMode('extend')}>
                <CalendarPlus className="mr-1 h-4 w-4" /> Extend
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => setMode('lift')}>
              <UserCheck className="mr-1 h-4 w-4" /> Lift
            </Button>
          </div>
        )}
      </div>
      {mode && (
        <div className="mt-2 space-y-2 border-t border-border pt-2">
          {(mode === 'extend' || mode === 'continue') && (
            <div>
              <label className="text-xs font-medium text-foreground" htmlFor={`extend-${s.id}`}>
                {mode === 'continue' ? 'Continue until (review / end date)' : 'New end date'}
                <span className="ml-0.5 text-destructive dark:text-red-400">*</span>
              </label>
              <input
                id={`extend-${s.id}`}
                type="date"
                className={inputClass}
                min={minNewTo}
                value={newTo}
                onChange={(e) => setNewTo(e.target.value)}
              />
            </div>
          )}
          <div>
            <label className="text-xs font-medium text-foreground" htmlFor={`reason-${s.id}`}>
              {mode === 'lift'
                ? 'Why is the suspension lifted?'
                : mode === 'continue'
                  ? 'Why does it continue? (e.g. pending HR disciplinary hearing)'
                  : 'Why is it extended?'}
              <span className="ml-0.5 text-destructive dark:text-red-400">*</span>
            </label>
            <Textarea
              id={`reason-${s.id}`}
              className="mt-1"
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={close}>
              Cancel
            </Button>
            {mode === 'lift' ? (
              <Button
                size="sm"
                loading={lift.isPending}
                disabled={!reason.trim()}
                onClick={() =>
                  lift.mutate({ suspensionId: s.id, reason: reason.trim() }, { onSuccess: close })
                }
              >
                Lift suspension
              </Button>
            ) : mode === 'continue' ? (
              <Button
                size="sm"
                loading={continueMutation.isPending}
                disabled={!reason.trim() || !newTo || newTo < minNewTo}
                onClick={() =>
                  continueMutation.mutate(
                    { suspensionId: s.id, suspendTo: newTo, reason: reason.trim() },
                    { onSuccess: close },
                  )
                }
              >
                Continue suspension
              </Button>
            ) : (
              <Button
                size="sm"
                loading={extend.isPending}
                disabled={!reason.trim() || !newTo || newTo < minNewTo}
                onClick={() =>
                  extend.mutate(
                    { suspensionId: s.id, suspendTo: newTo, reason: reason.trim() },
                    { onSuccess: close },
                  )
                }
              >
                Extend suspension
              </Button>
            )}
          </div>
        </div>
      )}
    </li>
  )
}

export type NewSuspensionInput = {
  employeeId: string
  reason: string
  suspendFrom: string
  suspendTo: string
}

/** Lets the investigation's Save validate and read the new-suspension form. */
export type NewSuspensionHandle = {
  /** Shows any field errors; returns the input (and a confirmation message) when valid. */
  validate: () => { input: NewSuspensionInput; confirmText: string } | null
  reset: () => void
}

/**
 * Interim suspension of carers while the incident is investigated. A suspension stays until it
 * is lifted; what happens after the investigation is decided at Outcome & close. A new suspension
 * is saved by the investigation's own Save, through `formRef`.
 */
export function IncidentSuspensionCard({
  incidentId,
  suspensions,
  canEdit,
  showAddForm = false,
  primaryEmployeeId,
  formRef,
}: {
  incidentId: string
  suspensions: IncidentCarerSuspension[]
  canEdit: boolean
  /** The "suspend a carer" form (only while the investigation is open). */
  showAddForm?: boolean
  primaryEmployeeId?: string | null
  formRef?: React.Ref<NewSuspensionHandle>
}) {
  const openIds = React.useMemo(
    () => new Set(suspensions.filter((s) => s.status !== 'LIFTED').map((s) => s.employeeId)),
    [suspensions],
  )
  const today = operationalTodayIso()
  const defaultEmployeeId = primaryEmployeeId && !openIds.has(primaryEmployeeId) ? primaryEmployeeId : ''
  const [employeeId, setEmployeeId] = React.useState(defaultEmployeeId)
  const [reason, setReason] = React.useState('')
  const [from, setFrom] = React.useState(today)
  const [to, setTo] = React.useState('')
  const [search, setSearch] = React.useState('')
  // Errors show once Save is pressed, then update as the fields are filled.
  const [tried, setTried] = React.useState(false)
  const employeesQuery = useEmployees({ limit: 50, search: search || undefined })
  const nameMap = useEmployeeNameMap(
    [employeeId, ...suspensions.map((s) => s.employeeId)].filter((x): x is string => Boolean(x)),
  )

  const options: ComboboxOption[] = React.useMemo(() => {
    const rows = (employeesQuery.data?.rows ?? [])
      .filter((r) => !openIds.has(r.id))
      .map((r) => ({
        value: r.id,
        label: r.fullName || [r.firstName, r.lastName].filter(Boolean).join(' ') || 'Unnamed',
        description: r.jobTitle?.name ?? undefined,
      }))
    if (employeeId && !rows.some((r) => r.value === employeeId) && !openIds.has(employeeId)) {
      const name = nameMap.get(employeeId)
      if (name) rows.unshift({ value: employeeId, label: name, description: undefined })
    }
    return rows
  }, [employeesQuery.data, employeeId, nameMap, openIds])

  const errors: Record<string, string> = {}
  if (!employeeId) errors.employeeId = 'Select the carer to suspend'
  else if (openIds.has(employeeId)) errors.employeeId = 'This carer is already suspended'
  if (!from) errors.from = 'Required'
  else if (from < today) errors.from = 'Cannot be in the past'
  if (!to) errors.to = 'Required'
  else if (from && to < from) errors.to = 'Must be on or after the start date'
  if (!reason.trim()) errors.reason = 'Required'
  else if (reason.trim().length < 3) errors.reason = 'At least 3 characters'
  const shown = tried ? errors : {}

  React.useImperativeHandle(formRef, () => ({
    validate: () => {
      setTried(true)
      if (Object.keys(errors).length) return null
      return {
        input: { employeeId, reason: reason.trim(), suspendFrom: from, suspendTo: to },
        confirmText:
          from === today
            ? 'Suspend this carer now? They will be set inactive and removed from future rota allocations.'
            : `Schedule this suspension from ${formatOrganisationIsoDateLong(from)}? The carer will be set inactive on that day.`,
      }
    },
    reset: () => {
      setReason('')
      setTo('')
      setFrom(today)
      setEmployeeId('')
      setSearch('')
      setTried(false)
    },
  }))

  if (suspensions.length === 0 && !(canEdit && showAddForm)) return null

  return (
    <div className="rounded-lg border border-border bg-muted/20 p-3 sm:p-4">
      <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Interim measure — suspension
        {suspensions.length > 0 ? ` (${suspensions.length})` : ''}
      </h4>
      <p className="mb-3 text-xs text-muted-foreground">
        Suspend a carer while the incident is investigated. From the start date they are set
        inactive and removed from future rota. The suspension stays until it is lifted; the decision
        after the investigation is made at Outcome &amp; close.
      </p>
      {suspensions.length > 0 && (
        <ul className="mb-3 space-y-2">
          {suspensions.map((s) => (
            <SuspensionRow
              key={s.id}
              incidentId={incidentId}
              s={s}
              name={nameMap.get(s.employeeId) ?? 'Carer'}
              canEdit={canEdit}
            />
          ))}
        </ul>
      )}
      {canEdit && showAddForm && (
        <div className="space-y-2">
          <div>
            <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">
              Carer
              <Req />
            </p>
            <Combobox
              value={employeeId}
              onChange={setEmployeeId}
              options={options}
              onSearchChange={setSearch}
              loading={employeesQuery.isLoading}
              placeholder="Select carer to suspend"
              searchPlaceholder="Search staff…"
              emptyText="No staff match your search."
            />
            <FieldError message={shown.employeeId} />
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div>
              <label className="text-xs uppercase tracking-wide text-muted-foreground" htmlFor="suspend-from">
                Suspended from
                <Req />
              </label>
              <input
                id="suspend-from"
                type="date"
                className={inputClass}
                min={today}
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                aria-invalid={shown.from ? true : undefined}
              />
              <FieldError message={shown.from} />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wide text-muted-foreground" htmlFor="suspend-to">
                Suspended to
                <Req />
              </label>
              <input
                id="suspend-to"
                type="date"
                className={inputClass}
                value={to}
                min={from || today}
                onChange={(e) => setTo(e.target.value)}
                aria-invalid={shown.to ? true : undefined}
              />
              <FieldError message={shown.to} />
            </div>
          </div>
          {from > today && (
            <p className="text-xs text-muted-foreground">
              Starts on {formatOrganisationIsoDateLong(from)} — until then the carer stays active.
            </p>
          )}
          <div>
            <label className="text-xs uppercase tracking-wide text-muted-foreground">
              Suspension reason
              <Req />
            </label>
            <Textarea
              className="mt-1"
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why does this carer need to be suspended during the investigation?"
              aria-invalid={shown.reason ? true : undefined}
            />
            <FieldError message={shown.reason} />
          </div>
          <p className="text-xs text-muted-foreground">Saved with the investigation when you press “Save draft”.</p>
        </div>
      )}
    </div>
  )
}

function Req() {
  return <span className="ml-0.5 text-destructive dark:text-red-400" aria-hidden>*</span>
}

function FieldError({ message }: { message?: string }) {
  return message ? <p data-field-error className="mt-1 text-xs text-destructive dark:text-red-400">{message}</p> : null
}

/**
 * Outcome & close: every carer suspended during the investigation, and the decision for each
 * open one (lift, or continue beyond the incident). The incident can't close until all are decided.
 */
export function IncidentSuspensionDecisions({
  incidentId,
  suspensions,
  canEdit,
}: {
  incidentId: string
  suspensions: IncidentCarerSuspension[]
  canEdit: boolean
}) {
  const nameMap = useEmployeeNameMap(suspensions.map((s) => s.employeeId))
  if (suspensions.length === 0) return null
  const undecided = suspensions.filter((s) => s.status !== 'LIFTED' && !s.continuedAt).length
  return (
    <div className="rounded-lg border border-border bg-muted/20 p-3 sm:p-4">
      <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Interim suspensions ({suspensions.length})
      </h4>
      <p className="mb-3 text-xs text-muted-foreground">
        Carers suspended during the investigation. Decide for each open suspension: lift it, or
        continue it beyond the incident (for example while an HR process runs).
        {undecided > 0
          ? ` ${undecided} still need${undecided === 1 ? 's' : ''} a decision before the incident can close.`
          : ''}
      </p>
      <ul className="space-y-2">
        {suspensions.map((s) => (
          <SuspensionRow
            key={s.id}
            incidentId={incidentId}
            s={s}
            name={nameMap.get(s.employeeId) ?? 'Carer'}
            canEdit={canEdit}
            decide
          />
        ))}
      </ul>
    </div>
  )
}
