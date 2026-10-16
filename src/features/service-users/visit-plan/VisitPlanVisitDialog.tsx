import * as React from 'react'
import { Eye, UserPlus } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/form-field'
import { Checkbox } from '@/shared/ui/toggle-controls'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import type { AcceptedCarePlanItem } from '@/features/service-users/initial-assessment/api'
import { VISIT_PLAN_DAY_LABELS, type VisitPlanSlot } from '@/features/service-users/visit-plan/types'
import { VisitPlanCarersCountInput } from '@/features/service-users/visit-plan/VisitPlanCarersCountInput'
import { VisitPlanSlotCarersDialog } from '@/features/service-users/visit-plan/VisitPlanSlotCarersDialog'
import { VisitPlanSlotCarePlansDialog } from '@/features/service-users/visit-plan/VisitPlanSlotCarePlansDialog'
import { VISIT_PLAN_MAX_DURATION_MINUTES } from '@/features/service-users/visit-plan/visit-plan-constants'
import {
  formatSlotAssignedCarersSummary,
  slotGlobalCarerIds,
} from '@/features/service-users/visit-plan/visit-plan-employee-names.util'
import {
  resolveVisitPlanNightDuty,
  slotTimesCrossMidnight,
  slotAllowsNightDuty,
  VISIT_PLAN_NIGHT_TYPE_OPTIONS,
} from '@/features/service-users/visit-plan/visit-plan-night-duty.util'
import {
  normalizeTimeForInput,
  durationKeepingEndTime,
  visitDurationMinutes,
  visitPlanEndTimeFromStartAndDuration,
} from '@/features/service-users/visit-plan/visit-plan-time.util'
import {
  describeVisitPlanVisitOverlap,
  findVisitPlanVisitOverlap,
} from '@/features/service-users/visit-plan/visit-plan-visit-overlap.util'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'add' | 'edit'
  /** The visit being added or edited; a private copy is edited until "Done". */
  visit: VisitPlanSlot | null
  /** Every other row of the plan, to stop two visits being planned at the same time. */
  otherSlots: VisitPlanSlot[]
  serviceUserId: string
  planEffectiveFrom?: string | null
  acceptedCarePlans: AcceptedCarePlanItem[]
  employeeNameById: Map<string, string>
  onDone: (visit: VisitPlanSlot) => void
}

const MONDAY_FIRST = [1, 2, 3, 4, 5, 6, 0]

/** Add or edit one visit of a time slot. Changes reach the plan form on "Done" and are saved with the plan. */
export function VisitPlanVisitDialog({
  open,
  onOpenChange,
  mode,
  visit,
  otherSlots,
  serviceUserId,
  planEffectiveFrom,
  acceptedCarePlans,
  employeeNameById,
  onDone,
}: Props) {
  const [draft, setDraft] = React.useState<VisitPlanSlot | null>(visit)
  const [error, setError] = React.useState<string | null>(null)
  const [carersOpen, setCarersOpen] = React.useState(false)
  const [carePlansOpen, setCarePlansOpen] = React.useState(false)

  React.useEffect(() => {
    if (!open) return
    setDraft(visit)
    setError(null)
    // Snapshot the visit only when the dialog opens (its identity changes on every parent render).
  }, [open])

  if (!draft) return null

  const patch = (changes: Partial<VisitPlanSlot>) => {
    setError(null)
    setDraft((prev) => {
      if (!prev) return prev
      const next = { ...prev, ...changes }
      return { ...next, nightDuty: resolveVisitPlanNightDuty(next) }
    })
  }

  const isOneOff = draft.slotKind === 'ONE_OFF'
  const daysLocked = draft.scheduleFrequency === 'MONTHLY' || draft.scheduleFrequency === 'WEEKLY'
  const startDateValue = isOneOff
    ? (draft.oneOffDate?.slice(0, 10) ?? '')
    : (draft.slotEffectiveFrom?.slice(0, 10) ?? planEffectiveFrom?.slice(0, 10) ?? '')
  const assignedIds = slotGlobalCarerIds(draft)
  const carePlanCount = draft.linkedCarePlanFormIds?.length ?? 0
  const isOvernight = slotAllowsNightDuty(draft)
  const nightType = VISIT_PLAN_NIGHT_TYPE_OPTIONS.find((o) => o.value === draft.nightDuty)

  const toggleDay = (day: number) => {
    const has = draft.daysOfWeek.includes(day)
    patch({ daysOfWeek: has ? draft.daysOfWeek.filter((d) => d !== day) : [...draft.daysOfWeek, day].sort() })
  }

  const handleDone = () => {
    if (!normalizeTimeForInput(draft.plannedStartTime) || !normalizeTimeForInput(draft.plannedEndTime)) {
      setError('Enter a start time and a duration.')
      return
    }
    if (!isOneOff && draft.scheduleFrequency === 'DAILY' && draft.daysOfWeek.length === 0) {
      setError('Choose at least one day of the week.')
      return
    }
    if (isOneOff && !draft.oneOffDate) {
      setError('Choose the date for this one-off visit.')
      return
    }
    const from = draft.slotEffectiveFrom?.slice(0, 10)
    const to = draft.slotEffectiveTo?.slice(0, 10)
    if (from && to && to < from) {
      setError('The end date is before the start date.')
      return
    }
    const overlap = findVisitPlanVisitOverlap(draft, otherSlots)
    if (overlap) {
      setError(describeVisitPlanVisitOverlap(overlap))
      return
    }
    onDone({ ...draft, isEnabled: true })
    onOpenChange(false)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>
              {mode === 'add' ? 'Add visit' : 'Edit visit'} — {draft.label}
            </DialogTitle>
            <DialogDescription>
              {mode === 'add'
                ? `A new ${draft.label.toLowerCase()} visit that repeats on the days you choose.`
                : 'Change when this visit happens and who attends.'}{' '}
              Saved with the visit plan.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-5">
            <section>
              <Label className="text-xs text-muted-foreground">Days of the week</Label>
              <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-2">
                {MONDAY_FIRST.map((day) => (
                  <label key={day} className="flex items-center gap-1.5 text-sm">
                    <Checkbox
                      checked={draft.daysOfWeek.includes(day)}
                      disabled={daysLocked || isOneOff}
                      onCheckedChange={() => toggleDay(day)}
                      aria-label={VISIT_PLAN_DAY_LABELS[day]}
                    />
                    {VISIT_PLAN_DAY_LABELS[day]}
                  </label>
                ))}
              </div>
              {daysLocked || isOneOff ? (
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {isOneOff
                    ? 'A one-off visit happens on its date only.'
                    : `${draft.scheduleFrequency === 'MONTHLY' ? 'Monthly' : 'Weekly'} visits pick their days under More options.`}
                </p>
              ) : null}
            </section>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="visit-start-date" className="text-xs text-muted-foreground">
                  {isOneOff ? 'Visit date' : 'Start date'}
                </Label>
                <Input
                  id="visit-start-date"
                  type="date"
                  className="mt-1"
                  value={startDateValue}
                  onChange={(e) =>
                    patch(isOneOff ? { oneOffDate: e.target.value || null } : { slotEffectiveFrom: e.target.value || null })
                  }
                />
                {!isOneOff && !startDateValue ? (
                  <p className="mt-1 text-xs text-muted-foreground">Leave empty to start when the visit plan starts.</p>
                ) : null}
              </div>
              {!isOneOff ? (
                <div>
                  <Label htmlFor="visit-end-date" className="text-xs text-muted-foreground">
                    End date (optional)
                  </Label>
                  <Input
                    id="visit-end-date"
                    type="date"
                    className="mt-1"
                    value={draft.slotEffectiveTo?.slice(0, 10) ?? ''}
                    onChange={(e) => patch({ slotEffectiveTo: e.target.value || null })}
                  />
                </div>
              ) : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-4">
              <div>
                <Label htmlFor="visit-start-time" className="text-xs text-muted-foreground">
                  Start time
                </Label>
                <Input
                  id="visit-start-time"
                  type="time"
                  className="mt-1"
                  value={normalizeTimeForInput(draft.plannedStartTime)}
                  onChange={(e) => {
                    const plannedStartTime = e.target.value
                    // Keep the end time and recalculate the duration; over 12 hours, keep the duration instead.
                    const keptLength = draft.plannedEndTime
                      ? durationKeepingEndTime(plannedStartTime, draft.plannedEndTime, VISIT_PLAN_MAX_DURATION_MINUTES)
                      : null
                    if (keptLength != null) {
                      patch({ plannedStartTime, durationMinutes: keptLength })
                      return
                    }
                    const end = visitPlanEndTimeFromStartAndDuration(plannedStartTime, draft.durationMinutes)
                    patch({ plannedStartTime, ...(end ? { plannedEndTime: end } : {}) })
                  }}
                />
              </div>
              <div>
                <Label htmlFor="visit-duration" className="text-xs text-muted-foreground">
                  Duration (mins)
                </Label>
                <Input
                  id="visit-duration"
                  type="text"
                  inputMode="numeric"
                  className="mt-1 tabular-nums"
                  value={draft.durationMinutes ?? ''}
                  onChange={(e) => {
                    const raw = e.target.value
                    if (raw !== '' && !/^\d*$/.test(raw)) return
                    const durationMinutes =
                      raw === '' ? null : Math.min(VISIT_PLAN_MAX_DURATION_MINUTES, Math.max(1, Number(raw)))
                    const end = visitPlanEndTimeFromStartAndDuration(draft.plannedStartTime, durationMinutes)
                    patch({ durationMinutes, ...(end ? { plannedEndTime: end } : {}) })
                  }}
                  onFocus={(e) => e.currentTarget.select()}
                />
              </div>
              <div>
                <Label htmlFor="visit-end-time" className="text-xs text-muted-foreground">
                  End time
                </Label>
                <Input
                  id="visit-end-time"
                  type="time"
                  className="mt-1"
                  value={normalizeTimeForInput(draft.plannedEndTime)}
                  onChange={(e) => {
                    const plannedEndTime = e.target.value
                    const start = normalizeTimeForInput(draft.plannedStartTime)
                    const end = normalizeTimeForInput(plannedEndTime)
                    const mins = start && end ? visitDurationMinutes(start, end) : null
                    patch({ plannedEndTime, ...(mins != null && mins > 0 ? { durationMinutes: mins } : {}) })
                  }}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Carers needed</Label>
                <VisitPlanCarersCountInput
                  className="mt-1 h-9 w-full"
                  value={draft.requiredCarers}
                  aria-label="Carers needed"
                  onCommit={(requiredCarers) => {
                    // Fewer carers needed trims the default carers only; day-specific rows keep theirs.
                    const globalIds = slotGlobalCarerIds(draft)
                    const assignedEmployeeIds =
                      globalIds.length > requiredCarers ? globalIds.slice(0, requiredCarers) : globalIds
                    const carerAssignments = (draft.carerAssignments ?? []).filter(
                      (a) => a.dayOfWeek != null || assignedEmployeeIds.includes(a.employeeId),
                    )
                    patch({ requiredCarers, assignedEmployeeIds, carerAssignments })
                  }}
                />
              </div>
            </div>

            {isOvernight ? (
              <section className="grid gap-x-4 gap-y-1.5 sm:grid-cols-2" data-testid="visit-dialog-night-type">
                <div>
                  <Label className="text-xs text-muted-foreground">Night type</Label>
                  <Select
                    value={draft.nightDuty}
                    onValueChange={(v) => patch({ nightDuty: v as VisitPlanSlot['nightDuty'] })}
                  >
                    <SelectTrigger className="mt-1" aria-label="Night type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {VISIT_PLAN_NIGHT_TYPE_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <p className="self-end pb-2 text-xs text-muted-foreground">
                  {slotTimesCrossMidnight(draft.plannedStartTime, draft.plannedEndTime) ? 'Ends the next morning. ' : ''}
                  {nightType?.hint}
                </p>
              </section>
            ) : null}

            <section className="grid gap-4 rounded-lg border border-border bg-muted/20 px-3.5 py-3 sm:grid-cols-2">
              <div>
                <Label className="text-xs text-muted-foreground">Assigned carers</Label>
                <p className="mt-1 text-sm" data-testid="visit-dialog-carers">
                  {formatSlotAssignedCarersSummary(draft, employeeNameById)}
                </p>
                <Button type="button" variant="outline" size="sm" className="mt-2 h-8" onClick={() => setCarersOpen(true)}>
                  <UserPlus className="mr-1 h-3.5 w-3.5" />
                  {assignedIds.length > 0 ? 'Change' : 'Assign'}
                </Button>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Care plans</Label>
                <p className="mt-1 text-sm">
                  {carePlanCount > 0 ? `${carePlanCount} linked` : 'None linked'}
                </p>
                <Button type="button" variant="outline" size="sm" className="mt-2 h-8" onClick={() => setCarePlansOpen(true)}>
                  <Eye className="mr-1 h-3.5 w-3.5" />
                  View
                </Button>
              </div>
            </section>

            <p className="text-xs text-muted-foreground">
              Frequency, different carers on different days and visit recording are under{' '}
              <strong className="font-medium text-foreground">More options</strong> below the visit list — tap the
              visit after you press Done.
            </p>

            {error ? (
              <p className="text-sm font-medium text-destructive" role="alert" data-testid="visit-dialog-error">
                {error}
              </p>
            ) : null}
          </DialogBody>
          <DialogFooter className="border-t border-border">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleDone} data-testid="visit-dialog-done">
              {mode === 'add' ? 'Add visit' : 'Done'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <VisitPlanSlotCarersDialog
        open={carersOpen}
        onOpenChange={setCarersOpen}
        serviceUserId={serviceUserId}
        slot={draft}
        onChange={(assignedEmployeeIds) => {
          // Replace only the default (all-days) carers; keep any day-specific rows.
          const daySpecific = (draft.carerAssignments ?? []).filter((a) => a.dayOfWeek != null)
          const globalRows = assignedEmployeeIds.map((employeeId, index) => ({
            dayOfWeek: null,
            employeeId,
            role: (index === 0 ? 'LEAD' : 'SECONDARY') as VisitPlanSlot['carerAssignments'][number]['role'],
            durationMinutes: null,
            plannedStartTime: null,
            plannedEndTime: null,
            sortOrder: index,
          }))
          patch({ assignedEmployeeIds, carerAssignments: [...globalRows, ...daySpecific] })
        }}
      />
      <VisitPlanSlotCarePlansDialog
        open={carePlansOpen}
        onOpenChange={setCarePlansOpen}
        serviceUserId={serviceUserId}
        slot={draft}
        acceptedCarePlans={acceptedCarePlans}
        onChange={(linkedCarePlanFormIds) => patch({ linkedCarePlanFormIds })}
      />
    </>
  )
}
