import * as React from 'react'
import { Clock, Loader2, User, Users } from 'lucide-react'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label, Textarea } from '@/shared/ui/form-field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { toastApiError, toastSuccess, toastWarning } from '@/shared/lib/toast'
import { useEmployeeNameMap } from '@/features/employees/hooks/useEmployeeNameMap'
import { resolveEmployeeDisplayName } from '@/features/employees/lib/employee-display-name'
import type { AcceptedCarePlanItem } from '@/features/service-users/initial-assessment/api'
import { recordVisitPlanCalendarOutcome } from '@/features/service-users/visit-plan/api'
import {
  VISIT_PLAN_CALENDAR_OUTCOME_OPTIONS,
  visitPlanCalendarOutcomeMeta,
  type VisitPlanCalendarOutcomeStatus,
} from '@/features/service-users/visit-plan/visit-plan-calendar-outcome.constants'
import type { VisitPlanCalendarVisit } from '@/features/service-users/visit-plan/api'
import type { VisitPlanSlot } from '@/features/service-users/visit-plan/types'
import { resolveExplicitCarePlansForSlot } from '@/features/service-users/visit-plan/visit-plan-care-plan-links.util'
import {
  isoDateTimeToTimeInput,
  visitDurationMinutes,
} from '@/features/service-users/visit-plan/visit-plan-time.util'
import { cn } from '@/shared/lib/utils'

export type VisitPlanCalendarSelection = {
  iso: string
  month: string
  day: number
  slot: VisitPlanSlot
  start: string
  end: string
  carerNames: string[]
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  serviceUserId: string
  planId: string
  selection: VisitPlanCalendarSelection | null
  existing?: VisitPlanCalendarVisit | null
  acceptedCarePlans?: AcceptedCarePlanItem[]
  employeeNameById: Map<string, string>
  onSaved: (visit: VisitPlanCalendarVisit) => void
}

function formatIsoTime(iso: string | null | undefined): string | null {
  if (!iso) return null
  return new Date(iso).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

function formatVisitDate(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

function DetailRow({ label, value, className }: { label: string; value: React.ReactNode; className?: string }) {
  return (
    <div className={cn('grid gap-1 sm:grid-cols-[minmax(0,9rem)_1fr] sm:gap-3', className)}>
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground">{value}</dd>
    </div>
  )
}

function uniqueEmployeeIds(...lists: (string[] | undefined)[]): string[] {
  const ids = new Set<string>()
  for (const list of lists) {
    for (const id of list ?? []) {
      if (id.trim()) ids.add(id)
    }
  }
  return [...ids]
}

function sortedEmployeeIds(nameById: Map<string, string>, priorityIds: string[] = []): string[] {
  const priority = new Set(priorityIds.filter(Boolean))
  const all = [...nameById.keys()].sort((a, b) =>
    resolveEmployeeDisplayName(nameById, a).localeCompare(resolveEmployeeDisplayName(nameById, b), 'en'),
  )
  const head = priorityIds.filter((id) => nameById.has(id))
  const tail = all.filter((id) => !priority.has(id))
  return [...head, ...tail]
}

export function VisitPlanCalendarOutcomeDialog({
  open,
  onOpenChange,
  serviceUserId,
  planId,
  selection,
  existing,
  acceptedCarePlans = [],
  employeeNameById,
  onSaved,
}: Props) {
  const [status, setStatus] = React.useState<VisitPlanCalendarOutcomeStatus>('PLANNED')
  const [notes, setNotes] = React.useState('')
  const [employeeId, setEmployeeId] = React.useState('')
  const [actualStartTime, setActualStartTime] = React.useState('')
  const [actualEndTime, setActualEndTime] = React.useState('')
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    if (!open || !selection) return
    const displayStatus = (existing?.displayStatus ?? existing?.status) as VisitPlanCalendarOutcomeStatus | undefined
    setStatus(displayStatus && displayStatus !== 'NOT_GENERATED' ? displayStatus : 'PLANNED')
    setNotes(existing?.notes ?? '')

    const allocatedIds = existing?.allocatedEmployeeIds ?? []
    const planIds = selection.slot.assignedEmployeeIds ?? []
    const defaultEmployee =
      existing?.attendingEmployeeId ?? allocatedIds[0] ?? planIds[0] ?? ''
    setEmployeeId(defaultEmployee)
    setActualStartTime(isoDateTimeToTimeInput(existing?.actualStartDateTime) || selection.start)
    setActualEndTime(isoDateTimeToTimeInput(existing?.actualEndDateTime) || selection.end)
  }, [open, selection, existing])

  const handleSave = async () => {
    if (!selection?.slot.id) return

    const needsCompletion = status === 'COMPLETED'
    if (needsCompletion) {
      if (!employeeId) {
        toastWarning('Select carer', 'Choose which employee attended this visit.')
        return
      }
      if (!actualStartTime || !actualEndTime) {
        toastWarning('Enter visit times', 'Actual start and end times are required to complete a visit.')
        return
      }
    }

    setSaving(true)
    try {
      const saved = await recordVisitPlanCalendarOutcome(serviceUserId, planId, {
        visitPlanSlotId: selection.slot.id,
        date: selection.iso,
        status,
        notes: notes.trim() || undefined,
        employeeId: employeeId || undefined,
        actualStartTime: actualStartTime || undefined,
        actualEndTime: actualEndTime || undefined,
      })
      toastSuccess('Visit saved', needsCompletion ? 'Visit marked as completed.' : 'Visit details have been recorded.')
      onSaved(saved)
      onOpenChange(false)
    } catch (e) {
      toastApiError(e, 'Could not save visit details')
    } finally {
      setSaving(false)
    }
  }

  const handleCompleteVisit = () => {
    setStatus('COMPLETED')
    if (!actualStartTime && selection) setActualStartTime(selection.start)
    if (!actualEndTime && selection) setActualEndTime(selection.end)
  }

  const allocatedIds = existing?.allocatedEmployeeIds ?? []
  const planAssignedIds = selection?.slot.assignedEmployeeIds ?? []
  const priorityEmployeeIds = uniqueEmployeeIds(
    allocatedIds,
    planAssignedIds,
    existing?.attendingEmployeeId ? [existing.attendingEmployeeId] : [],
    employeeId ? [employeeId] : [],
  )
  const allEmployeeNameById = useEmployeeNameMap(priorityEmployeeIds)
  const employeeNameMap = React.useMemo(() => {
    const map = new Map(allEmployeeNameById)
    for (const [id, name] of employeeNameById) map.set(id, name)
    return map
  }, [allEmployeeNameById, employeeNameById])
  const employeeOptions = React.useMemo(
    () => sortedEmployeeIds(employeeNameMap, priorityEmployeeIds),
    [employeeNameMap, priorityEmployeeIds],
  )

  if (!selection) return null

  const slot = selection.slot
  const onRota = Boolean(existing?.id)
  const outcomeMeta = visitPlanCalendarOutcomeMeta(
    existing?.displayStatus ?? existing?.status ?? (onRota ? 'PLANNED' : 'NOT_GENERATED'),
  )

  const scheduledStart = formatIsoTime(existing?.scheduledStartDateTime) ?? selection.start
  const scheduledEnd = formatIsoTime(existing?.scheduledEndDateTime) ?? selection.end

  const durationMins = visitDurationMinutes(actualStartTime, actualEndTime)

  const linkedPlans = resolveExplicitCarePlansForSlot(slot, acceptedCarePlans)
  const requiredCarers = existing?.requiredCarers ?? slot.requiredCarers

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" className="overflow-hidden p-0">
        <DialogHeader>
          <DialogTitle>Visit details</DialogTitle>
          <DialogDescription>
            {slot.label} · {formatVisitDate(selection.iso)} · scheduled {scheduledStart}–{scheduledEnd}
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-5">
          <section className="rounded-lg border border-border bg-muted/20 px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold', outcomeMeta.className)}>
                {outcomeMeta.label}
              </span>
              {!onRota ? (
                <span className="rounded-full border border-dashed border-border px-2.5 py-0.5 text-xs text-muted-foreground">
                  Planned — not yet on rota
                </span>
              ) : existing?.jobStatus ? (
                <span className="text-xs text-muted-foreground">Job: {existing.jobStatus.replace(/_/g, ' ')}</span>
              ) : null}
            </div>
            <dl className="mt-4 space-y-2">
              <DetailRow
                label="Carers required"
                value={
                  <span className="inline-flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-teal-600" aria-hidden />
                    {requiredCarers}
                  </span>
                }
              />
              {linkedPlans.length > 0 ? (
                <DetailRow
                  label="Care plans"
                  value={linkedPlans.map((p) => p.formName).join(', ')}
                />
              ) : null}
              {slot.notes?.trim() ? <DetailRow label="Slot notes" value={slot.notes.trim()} /> : null}
            </dl>
          </section>

          {!slot.id ? (
            <p className="text-sm text-amber-700 dark:text-amber-300">
              Save the visit plan before recording outcomes for this slot.
            </p>
          ) : (
            <>
              <section className="space-y-4 rounded-lg border border-teal-200/80 bg-teal-50/40 px-4 py-4 dark:border-teal-900/50 dark:bg-teal-950/20">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Record visit attendance</h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Who attended, and the actual start and end times for this visit.
                    </p>
                  </div>
                  {status !== 'COMPLETED' ? (
                    <Button type="button" size="sm" variant="outline" onClick={handleCompleteVisit}>
                      Mark completed
                    </Button>
                  ) : null}
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Carer who attended</Label>
                  {employeeOptions.length > 0 ? (
                    <Select value={employeeId || undefined} onValueChange={setEmployeeId}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select carer" />
                      </SelectTrigger>
                      <SelectContent className="max-h-72">
                        {employeeOptions.map((id) => (
                          <SelectItem key={id} value={id}>
                            {resolveEmployeeDisplayName(employeeNameMap, id)}
                            {planAssignedIds.includes(id) ? ' · assigned to slot' : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
                      No employees found — add staff in Employees first.
                    </p>
                  )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="visit-actual-start" className="text-xs text-muted-foreground">
                      Actual start time
                    </Label>
                    <Input
                      id="visit-actual-start"
                      type="time"
                      className="mt-1"
                      value={actualStartTime}
                      onChange={(e) => setActualStartTime(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="visit-actual-end" className="text-xs text-muted-foreground">
                      Actual end time
                    </Label>
                    <Input
                      id="visit-actual-end"
                      type="time"
                      className="mt-1"
                      value={actualEndTime}
                      onChange={(e) => setActualEndTime(e.target.value)}
                    />
                  </div>
                </div>

                {durationMins != null && actualStartTime && actualEndTime ? (
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" aria-hidden />
                    Duration: {durationMins} min
                    {scheduledStart && scheduledEnd ? (
                      <span>
                        · scheduled window {scheduledStart}–{scheduledEnd}
                      </span>
                    ) : null}
                  </p>
                ) : null}

                {employeeId ? (
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <User className="h-3.5 w-3.5" aria-hidden />
                    Attending: {resolveEmployeeDisplayName(employeeNameMap, employeeId)}
                  </p>
                ) : null}
              </section>

              <div>
                <Label className="text-xs text-muted-foreground">Visit status</Label>
                <Select
                  value={status}
                  onValueChange={(v) => setStatus(v as VisitPlanCalendarOutcomeStatus)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VISIT_PLAN_CALENDAR_OUTCOME_OPTIONS.filter((o) => o.value !== 'NOT_GENERATED').map(
                      (option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {VISIT_PLAN_CALENDAR_OUTCOME_OPTIONS.find((o) => o.value === status)?.description}
                </p>
              </div>

              <div>
                <Label htmlFor="visit-outcome-notes" className="text-xs text-muted-foreground">
                  Visit notes / handover
                </Label>
                <Textarea
                  id="visit-outcome-notes"
                  className="mt-1 min-h-[100px]"
                  placeholder="Tasks completed, concerns, reasons for non-attendance, etc."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              {!onRota ? (
                <p className="text-xs text-muted-foreground">
                  Saving will add this visit to the rota and record attendance for {formatVisitDate(selection.iso)}.
                </p>
              ) : null}
            </>
          )}
        </DialogBody>
        <DialogFooter className="border-t border-border">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Close
          </Button>
          <Button type="button" onClick={() => void handleSave()} disabled={saving || !slot.id}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save visit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
