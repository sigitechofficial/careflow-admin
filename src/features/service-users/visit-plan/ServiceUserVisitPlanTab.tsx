import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { CalendarClock, Eye, Loader2, PanelRightOpen, Play, Save, Sparkles, UserPlus, Users } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/form-field'
import { Switch, Checkbox } from '@/shared/ui/toggle-controls'
import { cn } from '@/shared/lib/utils'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import {
  useActiveServiceUserVisitPlan,
  useServiceUserVisitPlanMutations,
  useServiceUserVisitPlans,
} from '@/features/service-users/visit-plan/hooks'
import type {
  ServiceUserVisitPlan,
  VisitPlanAmendment,
  VisitPlanSlot,
} from '@/features/service-users/visit-plan/types'
import { VISIT_PLAN_DAY_LABELS } from '@/features/service-users/visit-plan/types'
import { visitPlanSlotsFromMedicationRounds } from '@/features/service-users/visit-plan/visit-plan-time-slots.util'
import { useMedicationRounds } from '@/features/settings/hooks/useMedicationRounds'
import { VisitPlanSlotAdvancedPanel } from '@/features/service-users/visit-plan/VisitPlanSlotAdvancedPanel'
import { VisitPlanSlotAdditionalDetailsPanel } from '@/features/service-users/visit-plan/VisitPlanSlotAdditionalDetailsPanel'
import { VisitPlanSlotDetailsSheet } from '@/features/service-users/visit-plan/VisitPlanSlotDetailsSheet'
import { VisitPlanCarePathwayContextPanel } from '@/features/service-users/visit-plan/VisitPlanCarePathwayContextPanel'
import { VisitPlanSlotCarersDialog } from '@/features/service-users/visit-plan/VisitPlanSlotCarersDialog'
import { VisitPlanSlotViewCarersDialog } from '@/features/service-users/visit-plan/VisitPlanSlotViewCarersDialog'
import { VisitPlanSlotCarePlansDialog } from '@/features/service-users/visit-plan/VisitPlanSlotCarePlansDialog'
import { VisitPlanCarersCountInput } from '@/features/service-users/visit-plan/VisitPlanCarersCountInput'
import { VisitPlanWeeklyHoursPanel } from '@/features/service-users/visit-plan/VisitPlanWeeklyHoursPanel'
import { useVisitPlanCareContext } from '@/features/service-users/visit-plan/hooks/useVisitPlanCareContext'
import { normalizeTimeForInput } from '@/features/service-users/visit-plan/visit-plan-time.util'
import { assignedEmployeeIdsFromSlots } from '@/features/service-users/visit-plan/visit-plan-employee-names.util'
import { useEmployeeNameMap } from '@/features/employees/hooks/useEmployeeNameMap'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'

function statusBadge(status: ServiceUserVisitPlan['status']) {
  const styles: Record<ServiceUserVisitPlan['status'], string> = {
    DRAFT: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200',
    ACTIVE: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200',
    SUSPENDED: 'bg-orange-100 text-orange-900 dark:bg-orange-950 dark:text-orange-200',
    ENDED: 'bg-muted text-muted-foreground',
  }
  return (
    <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide', styles[status])}>
      {status}
    </span>
  )
}

function toSlotInput(slots: VisitPlanSlot[]) {
  return slots.map((s) => ({
    slotCode: s.slotCode,
    daysOfWeek: s.daysOfWeek,
    plannedStartTime: s.plannedStartTime,
    plannedEndTime: s.plannedEndTime,
    requiredCarers: s.requiredCarers,
    isEnabled: s.isEnabled,
    medicationRoundCode: s.medicationRoundCode,
    notes: s.notes,
    scheduleFrequency: s.scheduleFrequency,
    repeatEvery: s.repeatEvery,
    repeatUnit: s.repeatUnit,
    timeCritical: s.timeCritical,
    timeToleranceMinutes: s.timeToleranceMinutes,
    durationMinutes: s.durationMinutes,
    notesRequired: s.notesRequired,
    photoAllowed: s.photoAllowed,
    shareOutcomeWithFamily: s.shareOutcomeWithFamily,
    analysisArea: s.analysisArea,
    monthlyDayMode: s.monthlyDayMode,
    monthlyDaysOfMonth: s.monthlyDaysOfMonth,
    monthlyPatternOrdinal: s.monthlyPatternOrdinal,
    monthlyPatternWeekday: s.monthlyPatternWeekday,
    linkedCarePlanFormIds: s.linkedCarePlanFormIds,
    assignedEmployeeIds: s.assignedEmployeeIds,
  }))
}

type Props = { serviceUserId: string }

export function ServiceUserVisitPlanTab({ serviceUserId }: Props) {
  const { data: plans, isLoading } = useServiceUserVisitPlans(serviceUserId)
  const { data: activePlan } = useActiveServiceUserVisitPlan(serviceUserId)
  const { create, update, activate, prefillDomCare, generateSchedule } =
    useServiceUserVisitPlanMutations(serviceUserId)
  const { data: medicationRounds = [], isLoading: medicationRoundsLoading } = useMedicationRounds()

  const workingPlan = React.useMemo(() => {
    if (activePlan?.id) return activePlan
    const drafts = (plans ?? []).filter(
      (p: ServiceUserVisitPlan) => p.status === 'DRAFT' && Boolean(p.id?.trim()),
    )
    return drafts[0] ?? null
  }, [activePlan, plans])

  const [slots, setSlots] = React.useState<VisitPlanSlot[]>([])
  const [weeklyHours, setWeeklyHours] = React.useState('')
  const [numberOfCarers, setNumberOfCarers] = React.useState(1)
  const [notes, setNotes] = React.useState('')
  const [amendmentReason, setAmendmentReason] = React.useState('')
  const [generateFrom, setGenerateFrom] = React.useState('')
  const [generateTo, setGenerateTo] = React.useState('')
  const [configSlotCode, setConfigSlotCode] = React.useState<VisitPlanSlot['slotCode']>('')
  const [detailsSlotCode, setDetailsSlotCode] = React.useState<VisitPlanSlot['slotCode'] | null>(null)
  const [carersModalSlotCode, setCarersModalSlotCode] = React.useState<VisitPlanSlot['slotCode'] | null>(null)
  const [viewCarersModalSlotCode, setViewCarersModalSlotCode] = React.useState<VisitPlanSlot['slotCode'] | null>(
    null,
  )
  const [carePlansModalSlotCode, setCarePlansModalSlotCode] = React.useState<VisitPlanSlot['slotCode'] | null>(
    null,
  )

  const configSlotIndex = React.useMemo(
    () => slots.findIndex((s) => s.slotCode === configSlotCode),
    [slots, configSlotCode],
  )
  const configSlot = configSlotIndex >= 0 ? slots[configSlotIndex] : null

  const detailsSlotIndex = React.useMemo(
    () => (detailsSlotCode ? slots.findIndex((s) => s.slotCode === detailsSlotCode) : -1),
    [slots, detailsSlotCode],
  )
  const detailsSlot = detailsSlotIndex >= 0 ? slots[detailsSlotIndex] : null

  const carersModalIndex = React.useMemo(
    () => (carersModalSlotCode ? slots.findIndex((s) => s.slotCode === carersModalSlotCode) : -1),
    [slots, carersModalSlotCode],
  )
  const carersModalSlot = carersModalIndex >= 0 ? slots[carersModalIndex] : null

  const viewCarersModalIndex = React.useMemo(
    () => (viewCarersModalSlotCode ? slots.findIndex((s) => s.slotCode === viewCarersModalSlotCode) : -1),
    [slots, viewCarersModalSlotCode],
  )
  const viewCarersModalSlot = viewCarersModalIndex >= 0 ? slots[viewCarersModalIndex] : null

  const carePlansModalIndex = React.useMemo(
    () => (carePlansModalSlotCode ? slots.findIndex((s) => s.slotCode === carePlansModalSlotCode) : -1),
    [slots, carePlansModalSlotCode],
  )
  const carePlansModalSlot = carePlansModalIndex >= 0 ? slots[carePlansModalIndex] : null

  const careContext = useVisitPlanCareContext(serviceUserId, workingPlan?.status ?? null)

  const assignedEmployeeIds = React.useMemo(() => assignedEmployeeIdsFromSlots(slots), [slots])
  const employeeNameById = useEmployeeNameMap(assignedEmployeeIds)

  React.useEffect(() => {
    if (!medicationRounds.length) return
    if (!workingPlan) {
      setSlots(visitPlanSlotsFromMedicationRounds(medicationRounds))
      return
    }
    setSlots(
      visitPlanSlotsFromMedicationRounds(
        medicationRounds,
        workingPlan.slots?.length ? workingPlan.slots : undefined,
      ),
    )
    setWeeklyHours(workingPlan.weeklyContractedHours ?? '')
    setNumberOfCarers(workingPlan.numberOfCarers)
    setNotes(workingPlan.notes ?? '')
  }, [workingPlan?.id, workingPlan?.updatedAt, medicationRounds])

  React.useEffect(() => {
    if (!slots.length) return
    if (!configSlotCode || !slots.some(s => s.slotCode === configSlotCode)) {
      setConfigSlotCode(slots[0]!.slotCode)
    }
  }, [slots, configSlotCode])

  const toggleDay = (slotIndex: number, day: number) => {
    setSlots((prev) =>
      prev.map((row, i) => {
        if (i !== slotIndex) return row
        const has = row.daysOfWeek.includes(day)
        const daysOfWeek = has ? row.daysOfWeek.filter((d) => d !== day) : [...row.daysOfWeek, day].sort()
        return { ...row, daysOfWeek }
      }),
    )
  }

  const updateSlot = (slotIndex: number, patch: Partial<VisitPlanSlot>) => {
    setSlots((prev) => prev.map((row, i) => (i === slotIndex ? { ...row, ...patch } : row)))
  }

  const handleCreate = async () => {
    try {
      await create.mutateAsync({
        weeklyContractedHours: weeklyHours || null,
        numberOfCarers,
        notes,
        slots: toSlotInput(slots),
      })
      toastSuccess('Visit plan created', 'Draft care package saved.')
    } catch (e) {
      toastApiError(e, 'Could not create visit plan')
    }
  }

  const handleSave = async () => {
    if (!workingPlan) return
    const planId = workingPlan.id?.trim()
    if (!planId) {
      toastApiError(
        new Error('Visit plan id missing'),
        'Could not save — reload the page. If this persists, recreate the draft visit plan.',
      )
      return
    }
    if (!amendmentReason.trim()) {
      toastApiError(new Error('Amendment reason required'), 'Enter why you are changing this plan')
      return
    }
    try {
      await update.mutateAsync({
        planId,
        amendmentReason: amendmentReason.trim(),
        weeklyContractedHours: weeklyHours || null,
        numberOfCarers,
        notes,
        slots: toSlotInput(slots),
      })
      setAmendmentReason('')
      toastSuccess(
        'Visit plan saved',
        'Carer assignments sync to future Schedule Jobs. Use Generate rota for new visit times.',
      )
    } catch (e) {
      toastApiError(e, 'Could not save visit plan')
    }
  }

  const handleActivate = async () => {
    if (!workingPlan?.id) return
    try {
      await activate.mutateAsync(workingPlan.id)
      toastSuccess('Visit plan activated', 'This is now the authorised care package.')
    } catch (e) {
      toastApiError(e, 'Could not activate visit plan')
    }
  }

  const handlePrefill = async () => {
    if (!workingPlan?.id) return
    try {
      await prefillDomCare.mutateAsync(workingPlan.id)
      toastSuccess('Prefilled from dom-care', 'Contract hours and carer count updated.')
    } catch (e) {
      toastApiError(e, 'Could not prefill from dom-care')
    }
  }

  const handleGenerate = async () => {
    if (!workingPlan || workingPlan.status !== 'ACTIVE' || !workingPlan.id) return
    if (!generateFrom || !generateTo) {
      toastApiError(new Error('Date range required'), 'Select from and to dates')
      return
    }
    try {
      const result = await generateSchedule.mutateAsync({
        planId: workingPlan.id,
        fromDate: generateFrom,
        toDate: generateTo,
      })
      toastSuccess(
        'Rota generated',
        `${result.visitsCreated} visits created (${result.visitsSkipped} already existed).`,
      )
    } catch (e) {
      toastApiError(e, 'Could not generate schedule')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading visit plan…
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <VisitPlanCarePathwayContextPanel
        serviceUserId={serviceUserId}
        isLoading={careContext.isLoading}
        pathwaySteps={careContext.pathwaySteps}
        acceptedCarePlans={careContext.acceptedCarePlans}
        slots={slots}
      />

      <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-sky-600 dark:text-sky-400">Visit plan (care package)</h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Authorised call pattern — when visits happen, how long, and how many carers. Separate from the clinical
              care plan. Changes are amendment-audited for CQC.
            </p>
          </div>
          {workingPlan ? statusBadge(workingPlan.status) : null}
        </div>

        {!workingPlan ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Configure the call pattern below, then save as a draft. You can also auto-create a plan when care package
            activation is approved on initial assessment.
          </p>
        ) : null}

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div>
            <Label className="text-xs text-muted-foreground">Weekly contracted hours</Label>
            <Input value={weeklyHours} onChange={(e) => setWeeklyHours(e.target.value)} placeholder="e.g. 14" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Carers per visit (default)</Label>
            <VisitPlanCarersCountInput
              value={numberOfCarers}
              onCommit={setNumberOfCarers}
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Review due</Label>
            <Input
              readOnly
              value={
                workingPlan?.reviewDueAt
                  ? new Date(workingPlan.reviewDueAt).toLocaleDateString('en-GB')
                  : '—'
              }
            />
          </div>
        </div>

        <VisitPlanWeeklyHoursPanel
          className="mt-4"
          slots={slots}
          weeklyContractedHours={weeklyHours}
          anchorIso={workingPlan?.effectiveFrom}
        />
      </section>

      <>
          <section className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Scheduling &amp; visit options</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Per call slot — daily, weekly, or monthly frequency, time rules, and recording requirements.
                </p>
              </div>
              <div className="min-w-[180px]">
                <Label className="text-xs text-muted-foreground">Edit slot</Label>
                <Select
                  value={configSlotCode}
                  onValueChange={(v) => setConfigSlotCode(v as VisitPlanSlot['slotCode'])}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {slots.map((s) => (
                      <SelectItem key={s.slotCode} value={s.slotCode}>
                        {s.label}
                        {!s.isEnabled ? ' (off)' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {configSlot ? (
              <VisitPlanSlotAdvancedPanel
                slotCode={configSlot.slotCode}
                slotLabel={configSlot.label}
                slot={configSlot}
                onChange={(patch) => {
                  if (configSlotIndex < 0) return
                  updateSlot(configSlotIndex, patch)
                }}
              />
            ) : null}
          </section>

          <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h3 className="mb-1 text-sm font-semibold text-foreground">Call pattern</h3>
            <p className="mb-4 text-xs text-muted-foreground">
              Call slots match Settings → Time slots (Morning, Midday, Afternoon, etc.). Set visit times,
              link care plans, and assign carers for each slot. Use <strong>Details</strong> for a quick
              summary. Configure daily, weekly, or monthly rules in <strong>Scheduling &amp; visit options</strong>{' '}
              above.
            </p>
            {medicationRoundsLoading ? (
              <p className="mb-3 text-xs text-muted-foreground">Loading time slots…</p>
            ) : medicationRounds.length === 0 ? (
              <p className="mb-3 text-xs text-amber-700 dark:text-amber-300">
                No time slots configured. Add them under Settings → Time slots.
              </p>
            ) : null}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="py-2 pr-3">Slot</th>
                    <th className="py-2 pr-3">On</th>
                    {VISIT_PLAN_DAY_LABELS.map((d) => (
                      <th key={d} className="px-1 py-2 text-center">
                        {d}
                      </th>
                    ))}
                    <th className="py-2 pl-2">Start</th>
                    <th className="py-2 pl-2">End</th>
                    <th className="py-2 pl-2">Required</th>
                    <th className="py-2 pl-3">Care plans</th>
                    <th className="py-2 pl-3">Assigned carers</th>
                    <th className="py-2 pl-3">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {slots.map((slot, rowIndex) => {
                    const assignedIds = slot.assignedEmployeeIds ?? []
                    return (
                      <tr key={slot.slotCode} className="border-b border-border/60">
                        <td className="py-2 pr-3 font-medium">{slot.label}</td>
                        <td className="py-2 pr-3">
                          <Switch
                            checked={slot.isEnabled}
                            onCheckedChange={(isEnabled) => updateSlot(rowIndex, { isEnabled })}
                            aria-label={`Enable ${slot.label}`}
                          />
                        </td>
                        {VISIT_PLAN_DAY_LABELS.map((_, dayIndex) => (
                          <td key={dayIndex} className="px-1 py-2 text-center">
                            <Checkbox
                              checked={slot.daysOfWeek.includes(dayIndex)}
                              disabled={
                                !slot.isEnabled ||
                                slot.scheduleFrequency === 'MONTHLY' ||
                                slot.scheduleFrequency === 'WEEKLY'
                              }
                              onCheckedChange={() => toggleDay(rowIndex, dayIndex)}
                              aria-label={`${slot.label} ${VISIT_PLAN_DAY_LABELS[dayIndex]}`}
                              title={
                                slot.scheduleFrequency === 'MONTHLY'
                                  ? 'Monthly visits use the day picker in Scheduling options'
                                  : slot.scheduleFrequency === 'WEEKLY'
                                    ? 'Weekly visits use the weekday picker in Scheduling options'
                                    : undefined
                              }
                            />
                          </td>
                        ))}
                        <td className="py-2 pl-2">
                          <Input
                            type="time"
                            className="h-8 w-[7.25rem]"
                            value={normalizeTimeForInput(slot.plannedStartTime)}
                            disabled={!slot.isEnabled}
                            onChange={(e) => updateSlot(rowIndex, { plannedStartTime: e.target.value })}
                          />
                        </td>
                        <td className="py-2 pl-2">
                          <Input
                            type="time"
                            className="h-8 w-[7.25rem]"
                            value={normalizeTimeForInput(slot.plannedEndTime)}
                            disabled={!slot.isEnabled}
                            onChange={(e) => updateSlot(rowIndex, { plannedEndTime: e.target.value })}
                          />
                        </td>
                        <td className="py-2 pl-2">
                          <VisitPlanCarersCountInput
                            className="h-8 w-16"
                            disabled={!slot.isEnabled}
                            value={slot.requiredCarers}
                            aria-label={`${slot.label} required carers`}
                            onCommit={(requiredCarers) => {
                              const assigned = slot.assignedEmployeeIds ?? []
                              const assignedEmployeeIds =
                                assigned.length > requiredCarers ? assigned.slice(0, requiredCarers) : assigned
                              updateSlot(rowIndex, { requiredCarers, assignedEmployeeIds })
                            }}
                          />
                        </td>
                        <td className="py-2 pl-3">
                          {slot.isEnabled ? (
                            <div className="flex min-w-[120px]">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-7 px-2 text-xs"
                                onClick={() => setCarePlansModalSlotCode(slot.slotCode)}
                              >
                                <Eye className="mr-1 h-3.5 w-3.5" />
                                View
                              </Button>
                            </div>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="py-2 pl-3">
                          {slot.isEnabled ? (
                            <div className="flex min-w-[148px] flex-wrap gap-1">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-7 px-2 text-xs"
                                  onClick={() => setViewCarersModalSlotCode(slot.slotCode)}
                                >
                                  <Users className="mr-1 h-3.5 w-3.5" />
                                  View
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-7 px-2 text-xs"
                                  onClick={() => setCarersModalSlotCode(slot.slotCode)}
                                >
                                  <UserPlus className="mr-1 h-3.5 w-3.5" />
                                  {assignedIds.length > 0 ? 'Change' : 'Assign'}
                                </Button>
                            </div>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="py-2 pl-3">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => {
                              setConfigSlotCode(slot.slotCode)
                              setDetailsSlotCode(slot.slotCode)
                            }}
                          >
                            <PanelRightOpen className="mr-1 h-3.5 w-3.5" />
                            Details
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Additional details</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Notes, photos, family sharing, and analysis reporting for the selected call slot.
                </p>
              </div>
              <div className="min-w-[180px]">
                <Label className="text-xs text-muted-foreground">Edit slot</Label>
                <Select
                  value={configSlotCode}
                  onValueChange={(v) => setConfigSlotCode(v as VisitPlanSlot['slotCode'])}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {slots.map((s) => (
                      <SelectItem key={s.slotCode} value={s.slotCode}>
                        {s.label}
                        {!s.isEnabled ? ' (off)' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {configSlot ? (
              <VisitPlanSlotAdditionalDetailsPanel
                slot={configSlot}
                onChange={(patch) => {
                  if (configSlotIndex < 0) return
                  updateSlot(configSlotIndex, patch)
                }}
              />
            ) : null}
          </section>

          {detailsSlot ? (
            <VisitPlanSlotDetailsSheet
              open={detailsSlotCode !== null}
              onOpenChange={(open) => {
                if (!open) setDetailsSlotCode(null)
              }}
              slot={detailsSlot}
              acceptedCarePlans={careContext.acceptedCarePlans}
              employeeNameById={employeeNameById}
            />
          ) : null}

          {carersModalSlot ? (
            <VisitPlanSlotCarersDialog
              open={carersModalSlotCode !== null}
              onOpenChange={(open) => {
                if (!open) setCarersModalSlotCode(null)
              }}
              serviceUserId={serviceUserId}
              slot={carersModalSlot}
              onChange={(assignedEmployeeIds) => {
                if (carersModalIndex < 0) return
                updateSlot(carersModalIndex, { assignedEmployeeIds })
              }}
            />
          ) : null}

          {viewCarersModalSlot ? (
            <VisitPlanSlotViewCarersDialog
              open={viewCarersModalSlotCode !== null}
              onOpenChange={(open) => {
                if (!open) setViewCarersModalSlotCode(null)
              }}
              slot={viewCarersModalSlot}
              employeeNameById={employeeNameById}
              onRemoveCarer={(employeeId) => {
                if (viewCarersModalIndex < 0) return
                const current = viewCarersModalSlot.assignedEmployeeIds ?? []
                updateSlot(viewCarersModalIndex, {
                  assignedEmployeeIds: current.filter((id) => id !== employeeId),
                })
              }}
              onAssign={() => {
                setViewCarersModalSlotCode(null)
                setCarersModalSlotCode(viewCarersModalSlot.slotCode)
              }}
            />
          ) : null}

          {carePlansModalSlot ? (
            <VisitPlanSlotCarePlansDialog
              open={carePlansModalSlotCode !== null}
              onOpenChange={(open) => {
                if (!open) setCarePlansModalSlotCode(null)
              }}
              serviceUserId={serviceUserId}
              slot={carePlansModalSlot}
              acceptedCarePlans={careContext.acceptedCarePlans}
              onChange={(linkedCarePlanFormIds) => {
                if (carePlansModalIndex < 0) return
                updateSlot(carePlansModalIndex, { linkedCarePlanFormIds })
              }}
            />
          ) : null}

          <section className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">Plan notes</Label>
              <textarea
                className="mt-1 min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            {workingPlan ? (
              <div>
                <Label className="text-xs text-muted-foreground">Amendment reason (required to save changes)</Label>
                <Input
                  value={amendmentReason}
                  onChange={(e) => setAmendmentReason(e.target.value)}
                  placeholder="e.g. Client requested later morning call after hospital discharge"
                />
              </div>
            ) : null}
            <div className="flex flex-wrap gap-2">
              {workingPlan ? (
                <>
                  <Button type="button" variant="default" onClick={() => void handleSave()} disabled={update.isPending}>
                    {update.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save changes
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void handlePrefill()}
                    disabled={prefillDomCare.isPending}
                  >
                    Prefill from DOM care
                  </Button>
                  {workingPlan.status === 'DRAFT' || workingPlan.status === 'SUSPENDED' ? (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => void handleActivate()}
                      disabled={activate.isPending}
                    >
                      {activate.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Play className="mr-2 h-4 w-4" />
                      )}
                      Activate plan
                    </Button>
                  ) : null}
                </>
              ) : (
                <Button type="button" variant="default" onClick={() => void handleCreate()} disabled={create.isPending}>
                  {create.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 h-4 w-4" />
                  )}
                  Create draft visit plan
                </Button>
              )}
            </div>
          </section>

          {workingPlan?.status === 'ACTIVE' ? (
            <section className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Generate rota</h3>
              <p className="text-sm text-muted-foreground">
                Creates <strong>new</strong> scheduled jobs from enabled call slots (max 31 days). Existing jobs at
                the same time are skipped — changing times or disabling slots does not remove old jobs. View results
                in{' '}
                <Link to="/scheduling/schedule-jobs" search={{ date: generateFrom }} className="text-sky-600 underline">
                  Schedule Jobs
                </Link>
                .
              </p>
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">From</Label>
                  <Input type="date" value={generateFrom} onChange={(e) => setGenerateFrom(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">To</Label>
                  <Input type="date" value={generateTo} onChange={(e) => setGenerateTo(e.target.value)} />
                </div>
                <Button
                  type="button"
                  onClick={() => void handleGenerate()}
                  disabled={generateSchedule.isPending}
                >
                  {generateSchedule.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CalendarClock className="mr-2 h-4 w-4" />
                  )}
                  Generate visits
                </Button>
              </div>
            </section>
          ) : null}

          {workingPlan && (workingPlan.amendments ?? []).length > 0 ? (
            <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold text-foreground">Amendment history</h3>
              <ul className="space-y-2 text-sm">
                {(workingPlan.amendments ?? []).map((a: VisitPlanAmendment) => (
                  <li key={a.id} className="rounded-md border border-border/60 bg-muted/20 px-3 py-2">
                    <span className="text-xs text-muted-foreground">
                      {new Date(a.amendedAt).toLocaleString('en-GB')}
                    </span>
                    <p className="mt-0.5">{a.reason}</p>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
      </>
    </div>
  )
}
