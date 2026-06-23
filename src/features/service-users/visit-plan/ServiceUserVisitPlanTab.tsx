import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { CalendarOff, CalendarClock, Eye, Loader2, PanelRightOpen, Pause, Play, Save, Sparkles, StopCircle, UserPlus, Users } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/form-field'
import { Switch, Checkbox } from '@/shared/ui/toggle-controls'
import { cn, formatDate, formatDateTime } from '@/shared/lib/utils'
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
import { VisitPlanSlotLifecyclePanel } from '@/features/service-users/visit-plan/VisitPlanSlotLifecyclePanel'
import { VisitPlanSlotCarerByDayPanel } from '@/features/service-users/visit-plan/VisitPlanSlotCarerByDayPanel'
import { VisitPlanSlotExceptionsPanel } from '@/features/service-users/visit-plan/VisitPlanSlotExceptionsPanel'
import { VisitPlanWeeklyHoursPanel } from '@/features/service-users/visit-plan/VisitPlanWeeklyHoursPanel'
import { VisitPlanSetupGuide } from '@/features/service-users/visit-plan/VisitPlanSetupGuide'
import { useScheduleAreas } from '@/features/scheduling/hooks/useScheduling'
import { VisitPlanSlotAdditionalDetailsPanel } from '@/features/service-users/visit-plan/VisitPlanSlotAdditionalDetailsPanel'
import { VisitPlanSlotDetailsSheet } from '@/features/service-users/visit-plan/VisitPlanSlotDetailsSheet'
import { VisitPlanCarePathwayContextPanel } from '@/features/service-users/visit-plan/VisitPlanCarePathwayContextPanel'
import { VisitPlanSlotCarersDialog } from '@/features/service-users/visit-plan/VisitPlanSlotCarersDialog'
import { VisitPlanSlotViewCarersDialog } from '@/features/service-users/visit-plan/VisitPlanSlotViewCarersDialog'
import { VisitPlanSlotCarePlansDialog } from '@/features/service-users/visit-plan/VisitPlanSlotCarePlansDialog'
import { VisitPlanCarersCountInput } from '@/features/service-users/visit-plan/VisitPlanCarersCountInput'
import { useVisitPlanCareContext } from '@/features/service-users/visit-plan/hooks/useVisitPlanCareContext'
import { normalizeTimeForInput } from '@/features/service-users/visit-plan/visit-plan-time.util'
import {
  assignedEmployeeIdsFromSlots,
  formatSlotAssignedCarersSummary,
  normalizeSlotCarerFields,
  slotAssignedEmployeeIds,
} from '@/features/service-users/visit-plan/visit-plan-employee-names.util'
import {
  buildCarerByDayAssignSlot,
  formatCarerAssignmentGroupDaysLabel,
  groupCarerAssignments,
  replaceGroupField,
} from '@/features/service-users/visit-plan/visit-plan-carer-by-day.util'
import { shouldShowVisitPlanCarePathwayPanel } from '@/features/service-users/visit-plan/visit-plan-care-plan-links.util'
import {
  resolveEditableVisitPlan,
  sortVisitPlanVersions,
  editableVisitPlans,
} from '@/features/service-users/visit-plan/visit-plan-version.util'
import { useServiceUserLookups } from '@/features/service-users/hooks/useServiceUserLookups'
import { VisitPlanSuspendDialog } from '@/features/service-users/visit-plan/VisitPlanSuspendDialog'
import { VisitPlanEndDialog } from '@/features/service-users/visit-plan/VisitPlanEndDialog'
import { VisitPlanReactivateDialog } from '@/features/service-users/visit-plan/VisitPlanReactivateDialog'
import { VisitPlanActivateDialog } from '@/features/service-users/visit-plan/VisitPlanActivateDialog'
import { VisitPlanGeneratePreviewDialog } from '@/features/service-users/visit-plan/VisitPlanGeneratePreviewDialog'
import { VisitPlanWorkingPatternSyncDialog } from '@/features/service-users/visit-plan/VisitPlanWorkingPatternSyncDialog'
import { VisitPlanConfirmGate } from '@/features/service-users/visit-plan/components/VisitPlanConfirmGate'
import {
  previewVisitPlanAmendmentImpact,
  previewVisitPlanCarerSyncPattern,
  previewVisitPlanGenerateSchedule,
} from '@/features/service-users/visit-plan/api'
import type {
  AmendmentImpactPreview,
  GenerateSchedulePreview,
  VisitPlanCarerSyncPatternPreview,
} from '@/features/service-users/visit-plan/types'
import {
  resolveGenerateRotaToDate,
  todayIsoDate,
} from '@/features/service-users/visit-plan/visit-plan-generate-rota.util'
import {
  visitPlanRespectWorkingPatternOnSync,
} from '@/features/service-users/visit-plan/visit-plan-pattern-sync-preference.util'
import { parseWeeklyContractedHours } from '@/features/service-users/visit-plan/visit-plan-weekly-hours.util'
import { useEmployeeNameMap } from '@/features/employees/hooks/useEmployeeNameMap'
import { useServiceUserDomCare } from '@/features/service-users/hooks/useServiceUserTabs'
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

type Props = {
  serviceUserId: string
  planId?: string
  onSelectPlan?: (planId: string) => void
}

const DRAFT_SAVE_DEFAULT_REASON = 'Draft visit plan updated'
const SUSPENDED_SAVE_DEFAULT_REASON = 'Suspended visit plan updated before re-activation'

function toSlotInput(slots: VisitPlanSlot[]) {
  return slots.map((s) => {
    const carers = normalizeSlotCarerFields(s)
    return {
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
      ...carers,
      slotKind: s.slotKind,
      slotEffectiveFrom: s.slotEffectiveFrom,
      slotEffectiveTo: s.slotEffectiveTo,
      oneOffDate: s.oneOffDate,
      allowBackfillDays: s.allowBackfillDays,
      exceptions: (s.exceptions ?? []).map(({ id: _id, ...exception }) => exception),
    }
  })
}

export function ServiceUserVisitPlanTab({ serviceUserId, planId, onSelectPlan }: Props) {
  const { data: plans, isLoading } = useServiceUserVisitPlans(serviceUserId)
  const { data: activePlan } = useActiveServiceUserVisitPlan(serviceUserId)
  const { create, update, activate, suspend, end, generateSchedule } =
    useServiceUserVisitPlanMutations(serviceUserId)
  const { data: medicationRounds = [], isLoading: medicationRoundsLoading } = useMedicationRounds()
  const scheduleAreasQuery = useScheduleAreas()
  const domCareQuery = useServiceUserDomCare(serviceUserId)
  const lookupsQuery = useServiceUserLookups()
  const pauseReasons = lookupsQuery.data?.visitPlanPauseReasons ?? []

  const sortedPlans = React.useMemo(() => sortVisitPlanVersions(plans ?? []), [plans])
  const editablePlans = React.useMemo(() => editableVisitPlans(sortedPlans), [sortedPlans])

  const workingPlan = React.useMemo(
    () => resolveEditableVisitPlan(sortedPlans, activePlan, planId, !isLoading),
    [sortedPlans, activePlan, planId, isLoading],
  )

  const [slots, setSlots] = React.useState<VisitPlanSlot[]>([])
  const [weeklyHours, setWeeklyHours] = React.useState('')
  const [numberOfCarers, setNumberOfCarers] = React.useState(1)
  const [notes, setNotes] = React.useState('')
  const [amendmentReason, setAmendmentReason] = React.useState('')
  const [generateFrom, setGenerateFrom] = React.useState(todayIsoDate)
  const [generateTo, setGenerateTo] = React.useState('')
  const [backfillDays, setBackfillDays] = React.useState(0)
  const [scheduleAreaId, setScheduleAreaId] = React.useState<string>('')
  const [configSlotCode, setConfigSlotCode] = React.useState<VisitPlanSlot['slotCode']>('')
  const [detailsSlotCode, setDetailsSlotCode] = React.useState<VisitPlanSlot['slotCode'] | null>(null)
  const [carersModalSlotCode, setCarersModalSlotCode] = React.useState<VisitPlanSlot['slotCode'] | null>(null)
  const [viewCarersModalSlotCode, setViewCarersModalSlotCode] = React.useState<VisitPlanSlot['slotCode'] | null>(
    null,
  )
  const [carePlansModalSlotCode, setCarePlansModalSlotCode] = React.useState<VisitPlanSlot['slotCode'] | null>(
    null,
  )
  const [carerByDayAssignTarget, setCarerByDayAssignTarget] = React.useState<{
    slotCode: VisitPlanSlot['slotCode']
    groupId: string
  } | null>(null)
  const [exceptionsSectionOpen, setExceptionsSectionOpen] = React.useState(false)
  const exceptionsSectionRef = React.useRef<HTMLDetailsElement>(null)
  const [suspendDialogOpen, setSuspendDialogOpen] = React.useState(false)
  const [endDialogOpen, setEndDialogOpen] = React.useState(false)
  const [reactivateDialogOpen, setReactivateDialogOpen] = React.useState(false)
  const [activateDialogOpen, setActivateDialogOpen] = React.useState(false)
  const [generatePreviewOpen, setGeneratePreviewOpen] = React.useState(false)
  const [generatePreview, setGeneratePreview] = React.useState<GenerateSchedulePreview | null>(null)
  const [generatePreviewLoading, setGeneratePreviewLoading] = React.useState(false)
  const [amendmentConfirmOpen, setAmendmentConfirmOpen] = React.useState(false)
  const [pendingAmendmentPreview, setPendingAmendmentPreview] = React.useState<AmendmentImpactPreview | null>(null)
  const [pendingAmendmentReason, setPendingAmendmentReason] = React.useState('')
  const [pendingRespectWorkingPattern, setPendingRespectWorkingPattern] = React.useState(true)
  const [patternSyncOpen, setPatternSyncOpen] = React.useState(false)
  const [patternSyncPreview, setPatternSyncPreview] = React.useState<VisitPlanCarerSyncPatternPreview | null>(null)
  const [patternSyncConfirmHandler, setPatternSyncConfirmHandler] = React.useState<
    ((respectWorkingPatternOnSync: boolean) => Promise<void>) | null
  >(null)
  const [postReactivateGenerateOpen, setPostReactivateGenerateOpen] = React.useState(false)

  const openExceptionsForSlot = React.useCallback((slotCode: VisitPlanSlot['slotCode']) => {
    setConfigSlotCode(slotCode)
    setExceptionsSectionOpen(true)
    requestAnimationFrame(() => {
      exceptionsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    })
  }, [])

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

  const carerByDayAssignContext = React.useMemo(() => {
    if (!carerByDayAssignTarget) return null
    const slotIndex = slots.findIndex((s) => s.slotCode === carerByDayAssignTarget.slotCode)
    if (slotIndex < 0) return null
    const slot = slots[slotIndex]!
    const group = groupCarerAssignments(slot.carerAssignments).find(
      (entry) => entry.groupId === carerByDayAssignTarget.groupId,
    )
    if (!group) return null
    return { slotIndex, slot, group, assignSlot: buildCarerByDayAssignSlot(slot, group) }
  }, [carerByDayAssignTarget, slots])

  const careContext = useVisitPlanCareContext(serviceUserId, workingPlan?.status ?? null)

  const showCarePathwayPanel = React.useMemo(
    () =>
      shouldShowVisitPlanCarePathwayPanel(
        careContext.pathwaySteps,
        slots,
        careContext.acceptedCarePlans,
      ),
    [careContext.pathwaySteps, careContext.acceptedCarePlans, slots],
  )

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
    if (parseWeeklyContractedHours(weeklyHours) === null) {
      toastApiError(
        new Error('Weekly contracted hours required'),
        'Enter weekly contracted hours before creating a visit plan',
      )
      return
    }
    try {
      await create.mutateAsync({
        weeklyContractedHours: weeklyHours.trim(),
        numberOfCarers,
        notes,
        slots: toSlotInput(slots),
      })
      toastSuccess('Visit plan created', 'Draft care package saved.')
    } catch (e) {
      toastApiError(e, 'Could not create visit plan')
    }
  }

  const resolveSaveReason = (status: ServiceUserVisitPlan['status'], explicitReason?: string) => {
    const trimmed = (explicitReason ?? amendmentReason).trim()
    if (trimmed) return trimmed
    if (status === 'DRAFT') return DRAFT_SAVE_DEFAULT_REASON
    if (status === 'SUSPENDED') return SUSPENDED_SAVE_DEFAULT_REASON
    return null
  }

  const persistWorkingPlan = async (
    reason: string,
    applyScheduleImpact?: boolean,
    respectWorkingPatternOnSync?: boolean,
  ) => {
    if (!workingPlan) return
    const planId = workingPlan.id?.trim()
    if (!planId) {
      toastApiError(
        new Error('Visit plan id missing'),
        'Could not save — reload the page. If this persists, recreate the draft visit plan.',
      )
      return
    }
    await update.mutateAsync({
      planId,
      amendmentReason: reason,
      weeklyContractedHours: weeklyHours || null,
      numberOfCarers,
      notes,
      slots: toSlotInput(slots),
      applyScheduleImpact,
      respectWorkingPatternOnSync,
    })
  }

  const runPatternGate = async (
    onConfirm: (respectWorkingPatternOnSync: boolean) => Promise<void>,
  ) => {
    if (!workingPlan?.id) return
    const preview = await previewVisitPlanCarerSyncPattern(serviceUserId, workingPlan.id, {
      slots: toSlotInput(slots),
    })
    const shouldPrompt =
      preview.conflicts.length > 0 || (preview.visitsSkippedIfRespecting ?? 0) > 0
    if (!shouldPrompt) {
      const respect = visitPlanRespectWorkingPatternOnSync(workingPlan)
      await onConfirm(respect)
      return
    }
    setPatternSyncPreview(preview)
    setPatternSyncConfirmHandler(() => onConfirm)
    setPatternSyncOpen(true)
  }

  const handlePatternSyncChoice = async (respectWorkingPatternOnSync: boolean) => {
    if (!patternSyncConfirmHandler) return
    try {
      await patternSyncConfirmHandler(respectWorkingPatternOnSync)
      setPatternSyncOpen(false)
      setPatternSyncPreview(null)
      setPatternSyncConfirmHandler(null)
    } catch (e) {
      toastApiError(e, 'Could not apply changes')
    }
  }

  const openActivateDialog = () => {
    if (!workingPlan?.id) return
    setActivateDialogOpen(true)
  }

  const buildAmendmentPayload = (reason: string) => ({
    amendmentReason: reason,
    weeklyContractedHours: weeklyHours || null,
    numberOfCarers,
    notes,
    slots: toSlotInput(slots),
  })

  const handleSave = async () => {
    if (!workingPlan) return
    const reason = resolveSaveReason(workingPlan.status)
    if (!reason) {
      toastApiError(
        new Error('Amendment reason required'),
        'Enter why you are changing this authorised package',
      )
      return
    }
    try {
      if (workingPlan.status === 'ACTIVE' && workingPlan.id) {
        await runPatternGate(async (respect) => {
          setPendingRespectWorkingPattern(respect)
          const preview = await previewVisitPlanAmendmentImpact(
            serviceUserId,
            workingPlan.id,
            buildAmendmentPayload(reason),
          )
          const impactTotal =
            (preview.scheduleImpact.jobsCancelled ?? 0) + (preview.scheduleImpact.jobsRescheduled ?? 0)
          if (impactTotal > 0) {
            setPendingAmendmentPreview(preview)
            setPendingAmendmentReason(reason)
            setAmendmentConfirmOpen(true)
            return
          }
          await persistWorkingPlan(reason, false, respect)
          toastSuccess(
            'Amendment recorded',
            'Call pattern saved. Assigned carers are synced onto the rota from today — refresh Schedule Jobs to see updates.',
          )
        })
      } else {
        await runPatternGate(async (respect) => {
          await persistWorkingPlan(reason, undefined, respect)
          if (workingPlan.status === 'DRAFT') {
            toastSuccess('Draft saved', 'You can keep editing or activate when the package is agreed.')
          } else if (workingPlan.status === 'SUSPENDED') {
            toastSuccess('Visit plan saved', 'Changes saved on the suspended plan.')
          }
        })
      }
      setAmendmentReason('')
    } catch (e) {
      toastApiError(e, 'Could not save visit plan')
    }
  }

  const handleConfirmAmendmentImpact = async () => {
    if (!pendingAmendmentReason.trim()) return
    try {
      const result = await update.mutateAsync({
        planId: workingPlan!.id,
        ...buildAmendmentPayload(pendingAmendmentReason),
        applyScheduleImpact: true,
        respectWorkingPatternOnSync: pendingRespectWorkingPattern,
      })
      setAmendmentConfirmOpen(false)
      setPendingAmendmentPreview(null)
      setPendingAmendmentReason('')
      setAmendmentReason('')
      const impact = result.scheduleImpact
      const parts: string[] = []
      if (impact?.jobsCancelled) parts.push(`${impact.jobsCancelled} cancelled`)
      if (impact?.jobsRescheduled) parts.push(`${impact.jobsRescheduled} rescheduled`)
      toastSuccess(
        'Amendment recorded',
        parts.length ? `Rota updated: ${parts.join(', ')}.` : 'Change saved for CQC audit.',
      )
    } catch (e) {
      toastApiError(e, 'Could not apply amendment')
    }
  }

  const handleConfirmActivate = async (options: {
    cancelEndedPlanJobs: boolean
    reactivationReason?: string
    respectWorkingPatternOnSync: boolean
  }) => {
    if (!workingPlan?.id) return
    const saveReason = resolveSaveReason(workingPlan.status)
    if (!saveReason) return
    try {
      await persistWorkingPlan(saveReason, undefined, options.respectWorkingPatternOnSync)
      const result = await activate.mutateAsync({
        planId: workingPlan.id,
        reactivationReason: options.reactivationReason,
        cancelEndedPlanJobs: options.cancelEndedPlanJobs,
      })
      setActivateDialogOpen(false)
      setAmendmentReason('')
      const cancelled = result.scheduleImpact?.jobsCancelled ?? 0
      toastSuccess(
        workingPlan.status === 'SUSPENDED' ? 'Authorised package re-activated' : 'Authorised package activated',
        cancelled > 0
          ? `${cancelled} visit${cancelled === 1 ? '' : 's'} cancelled from ended package. Generate rota when ready.`
          : 'Generate the rota below when you are ready.',
      )
      if (workingPlan.status === 'SUSPENDED') {
        setPostReactivateGenerateOpen(true)
      }
    } catch (e) {
      toastApiError(e, 'Could not activate visit plan')
    }
  }

  const handleSaveAndActivate = async () => {
    if (!workingPlan?.id) return
    if (workingPlan.status === 'SUSPENDED') {
      setReactivateDialogOpen(true)
      return
    }
    if (workingPlan.status === 'DRAFT') {
      const reason = resolveSaveReason('DRAFT')
      if (!reason) return
      try {
        await openActivateDialog()
      } catch (e) {
        toastApiError(e, 'Could not continue to activation')
      }
    }
  }

  const handleConfirmSuspend = async (
    payload: import('@/features/service-users/visit-plan/api').SuspendVisitPlanPayload,
  ) => {
    if (!workingPlan?.id) return
    try {
      const result = await suspend.mutateAsync({ planId: workingPlan.id, ...payload })
      const cancelled = result.scheduleImpact?.jobsCancelled ?? 0
      toastSuccess(
        'Visit plan suspended',
        cancelled > 0
          ? `${cancelled} future visit${cancelled === 1 ? '' : 's'} cancelled on the rota.`
          : 'Rota generation is blocked until you re-activate.',
      )
    } catch (e) {
      toastApiError(e, 'Could not suspend visit plan')
    }
  }

  const handleConfirmEnd = async (
    payload: import('@/features/service-users/visit-plan/api').EndVisitPlanPayload,
  ) => {
    if (!workingPlan?.id) return
    try {
      const result = await end.mutateAsync({ planId: workingPlan.id, ...payload })
      const cancelled = result.scheduleImpact?.jobsCancelled ?? 0
      const scheduled =
        payload.effectiveTo &&
        payload.effectiveTo > todayIsoDate()
      toastSuccess(
        scheduled ? 'Closure scheduled' : 'Visit plan ended',
        cancelled > 0
          ? `${cancelled} visit${cancelled === 1 ? '' : 's'} cancelled on the rota.`
          : scheduled
            ? 'Package remains active until the end date — rota will not generate beyond it.'
            : 'Package closed — create a new plan if care continues.',
      )
    } catch (e) {
      toastApiError(e, 'Could not end visit plan')
    }
  }

  const contractProfile = domCareQuery.data
  const differsFromContract = contractProfile
    ? weeklyHours !== (contractProfile.weeklyContractedHours ?? '') ||
      numberOfCarers !== contractProfile.numberOfCarers
    : false

  const applyContractValues = () => {
    if (!contractProfile) return
    setWeeklyHours(contractProfile.weeklyContractedHours ?? '')
    setNumberOfCarers(contractProfile.numberOfCarers)
    toastSuccess('Contract values applied', 'Save or activate the plan to persist these figures.')
  }

  const isPublishing = update.isPending || activate.isPending
  const planIsLive = workingPlan?.status === 'ACTIVE'
  const hasWeeklyContractedHours = parseWeeklyContractedHours(weeklyHours) !== null

  const handleGenerate = async () => {
    if (!workingPlan || workingPlan.status !== 'ACTIVE' || !workingPlan.id) return
    if (!generateFrom) {
      toastApiError(new Error('From date required'), 'Select a from date')
      return
    }
    const toDate = resolveGenerateRotaToDate(generateFrom, generateTo)
    setGeneratePreviewLoading(true)
    setGeneratePreviewOpen(true)
    try {
      const preview = await previewVisitPlanGenerateSchedule(serviceUserId, workingPlan.id, {
        fromDate: generateFrom,
        toDate,
        backfillDays: backfillDays > 0 ? backfillDays : undefined,
      })
      setGeneratePreview(preview)
    } catch (e) {
      setGeneratePreviewOpen(false)
      toastApiError(e, 'Could not preview generate schedule')
    } finally {
      setGeneratePreviewLoading(false)
    }
  }

  const runGenerateSchedule = async () => {
    if (!workingPlan?.id || !generateFrom) return
    const toDate = resolveGenerateRotaToDate(generateFrom, generateTo)
    const respect = visitPlanRespectWorkingPatternOnSync(workingPlan)
    try {
      const result = await generateSchedule.mutateAsync({
        planId: workingPlan.id,
        fromDate: generateFrom,
        toDate,
        backfillDays: backfillDays > 0 ? backfillDays : undefined,
        scheduleAreaId: scheduleAreaId || undefined,
        respectWorkingPatternOnSync: respect,
      })
      setGeneratePreviewOpen(false)
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
      {editablePlans.length > 1 && workingPlan ? (
        <section className="rounded-lg border border-border bg-muted/20 px-4 py-3">
          <p className="text-xs font-medium text-foreground">Which package are you editing?</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Only live, suspended, or draft packages appear here. To compare ended versions or visit outcomes, use{' '}
            <strong className="font-medium text-foreground">Call pattern</strong> or{' '}
            <strong className="font-medium text-foreground">Visit calendar</strong>.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {editablePlans.map((plan) => (
              <Button
                key={plan.id}
                type="button"
                size="sm"
                variant={plan.id === workingPlan.id ? 'default' : 'outline'}
                onClick={() => onSelectPlan?.(plan.id)}
              >
                {plan.status === 'DRAFT' ? 'Draft' : plan.status === 'SUSPENDED' ? 'Suspended' : 'Active'}
              </Button>
            ))}
          </div>
        </section>
      ) : null}

      <VisitPlanSetupGuide
        slots={slots}
        planStatus={workingPlan?.status ?? null}
        hasPlan={Boolean(workingPlan?.id)}
      />

      {showCarePathwayPanel ? (
        <VisitPlanCarePathwayContextPanel
          serviceUserId={serviceUserId}
          isLoading={careContext.isLoading}
          pathwaySteps={careContext.pathwaySteps}
          acceptedCarePlans={careContext.acceptedCarePlans}
          slots={slots}
        />
      ) : null}

      <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-sky-600 dark:text-sky-400">Visit plan (care package)</h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Authorised call pattern — when visits happen, how long, and how many carers. Separate from the clinical
              care plan. Changes are amendment-audited for CQC. Use{' '}
              <strong className="font-medium text-foreground">Call pattern</strong> or{' '}
              <strong className="font-medium text-foreground">Visit calendar</strong> at the top of this page to
              review without editing.
            </p>
          </div>
          {workingPlan ? statusBadge(workingPlan.status) : null}
        </div>

        {!workingPlan ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Enter weekly contracted hours above, configure the call pattern below, then create a draft. You can also
            auto-create a plan when care package activation is approved on initial assessment (hours must be on the DOM
            Care profile).
          </p>
        ) : null}

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div>
            <Label className="text-xs text-muted-foreground">
              Weekly contracted hours
              {!workingPlan ? <span className="text-destructive"> *</span> : null}
            </Label>
            <Input
              value={weeklyHours}
              onChange={(e) => setWeeklyHours(e.target.value)}
              placeholder="e.g. 14"
              required={!workingPlan}
            />
            {!workingPlan && !hasWeeklyContractedHours ? (
              <p className="mt-1 text-xs text-destructive">Required before you can create a visit plan.</p>
            ) : null}
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
              value={formatDate(workingPlan?.reviewDueAt)}
            />
          </div>
        </div>
        {contractProfile ? (
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-md border border-border bg-muted/20 px-3 py-2 text-sm">
            <span className="text-muted-foreground">
              Contract profile (
              <Link
                to="/service-users/$serviceUserId"
                params={{ serviceUserId }}
                search={{ tab: 'dom' }}
                className="font-medium text-sky-700 underline underline-offset-2 dark:text-sky-400"
              >
                DOM Care tab
              </Link>
              ):{' '}
              <span className="font-medium text-foreground">
                {contractProfile.weeklyContractedHours ?? '—'}h weekly
              </span>
              ,{' '}
              <span className="font-medium text-foreground">
                {contractProfile.numberOfCarers} carer{contractProfile.numberOfCarers === 1 ? '' : 's'}
              </span>{' '}
              per visit
            </span>
            {differsFromContract ? (
              <Button type="button" variant="outline" size="sm" onClick={applyContractValues}>
                Use contract values
              </Button>
            ) : (
              <span className="text-xs text-muted-foreground">Matches this plan</span>
            )}
          </div>
        ) : domCareQuery.isLoading ? (
          <p className="mt-3 text-xs text-muted-foreground">Loading contract profile…</p>
        ) : null}
        <VisitPlanWeeklyHoursPanel
          className="mt-4"
          slots={slots}
          weeklyContractedHours={weeklyHours}
          anchorIso={workingPlan?.effectiveFrom}
        />
      </section>

      <section className="rounded-xl border-2 border-teal-200 bg-card p-6 shadow-sm dark:border-teal-900">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-teal-700 dark:text-teal-300">
              Step 1–3
            </p>
            <h3 className="text-base font-semibold text-foreground">Visit schedule</h3>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              One row per call type (Morning, Evening, …). Turn visits on, pick days, set times, then{' '}
              <strong>Assign</strong> carers. Use <strong>Skip date</strong> to miss this visit on one day only.
            </p>
          </div>
        </div>
            {medicationRoundsLoading ? (
              <p className="mb-3 text-xs text-muted-foreground">Loading time slots…</p>
            ) : medicationRounds.length === 0 ? (
              <p className="mb-3 text-xs text-amber-700 dark:text-amber-300">
                No time slots configured. Add them under Settings → Time slots.
              </p>
            ) : null}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] border-collapse text-sm">
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
                    <th className="py-2 pl-3">Exceptions</th>
                    <th className="py-2 pl-3">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {slots.map((slot, rowIndex) => {
                    const assignedIds = slotAssignedEmployeeIds(slot)
                    const carerSummary = formatSlotAssignedCarersSummary(slot, employeeNameById)
                    return (
                      <tr
                        key={slot.slotCode}
                        className={cn(
                          'border-b border-border/60',
                          slot.isEnabled && 'cursor-pointer hover:bg-muted/40',
                          configSlotCode === slot.slotCode && slot.isEnabled && 'bg-teal-50/90 dark:bg-teal-950/30',
                        )}
                        onClick={() => {
                          if (slot.isEnabled) setConfigSlotCode(slot.slotCode)
                        }}
                      >
                        <td className="py-2 pr-3 font-medium">{slot.label}</td>
                        <td className="py-2 pr-3" onClick={(e) => e.stopPropagation()}>
                          <Switch
                            checked={slot.isEnabled}
                            onCheckedChange={(isEnabled) => updateSlot(rowIndex, { isEnabled })}
                            aria-label={`Enable ${slot.label}`}
                          />
                        </td>
                        {VISIT_PLAN_DAY_LABELS.map((_, dayIndex) => (
                          <td key={dayIndex} className="px-1 py-2 text-center" onClick={(e) => e.stopPropagation()}>
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
                        <td className="py-2 pl-2" onClick={(e) => e.stopPropagation()}>
                          <Input
                            type="time"
                            className="h-8 w-[7.25rem]"
                            value={normalizeTimeForInput(slot.plannedStartTime)}
                            disabled={!slot.isEnabled}
                            onChange={(e) => updateSlot(rowIndex, { plannedStartTime: e.target.value })}
                          />
                        </td>
                        <td className="py-2 pl-2" onClick={(e) => e.stopPropagation()}>
                          <Input
                            type="time"
                            className="h-8 w-[7.25rem]"
                            value={normalizeTimeForInput(slot.plannedEndTime)}
                            disabled={!slot.isEnabled}
                            onChange={(e) => updateSlot(rowIndex, { plannedEndTime: e.target.value })}
                          />
                        </td>
                        <td className="py-2 pl-2" onClick={(e) => e.stopPropagation()}>
                          <VisitPlanCarersCountInput
                            className="h-8 w-16"
                            disabled={!slot.isEnabled}
                            value={slot.requiredCarers}
                            aria-label={`${slot.label} required carers`}
                            onCommit={(requiredCarers) => {
                              const assigned = slotAssignedEmployeeIds(slot)
                              const assignedEmployeeIds =
                                assigned.length > requiredCarers ? assigned.slice(0, requiredCarers) : assigned
                              const carerAssignments = (slot.carerAssignments ?? []).filter((a) =>
                                assignedEmployeeIds.includes(a.employeeId),
                              )
                              updateSlot(rowIndex, { requiredCarers, assignedEmployeeIds, carerAssignments })
                            }}
                          />
                        </td>
                        <td className="py-2 pl-3" onClick={(e) => e.stopPropagation()}>
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
                        <td className="py-2 pl-3" onClick={(e) => e.stopPropagation()}>
                          {slot.isEnabled ? (
                            <div className="flex min-w-[180px] flex-col gap-1">
                              <p
                                className={cn(
                                  'text-xs leading-snug',
                                  assignedIds.length ? 'text-foreground' : 'text-muted-foreground',
                                )}
                                title={carerSummary}
                              >
                                {carerSummary}
                              </p>
                              <div className="flex flex-wrap gap-1">
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
                            </div>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="py-2 pl-3" onClick={(e) => e.stopPropagation()}>
                          {slot.isEnabled ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-7 px-2 text-xs"
                              onClick={() => openExceptionsForSlot(slot.slotCode)}
                            >
                              <CalendarOff className="mr-1 h-3.5 w-3.5" />
                              {slot.exceptions.length > 0 ? `${slot.exceptions.length} set` : 'Skip date'}
                            </Button>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="py-2 pl-3" onClick={(e) => e.stopPropagation()}>
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

        {configSlot && configSlot.isEnabled ? (
          <div className="mt-6 space-y-3 border-t border-border pt-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">
                Optional settings for <strong className="text-foreground">{configSlot.label}</strong> — click a row
                above to switch slot.
              </p>
              <Button
                type="button"
                size="sm"
                onClick={() => setCarersModalSlotCode(configSlot.slotCode)}
              >
                <UserPlus className="mr-1 h-3.5 w-3.5" />
                Assign carers to {configSlot.label}
              </Button>
            </div>
            <details
              ref={exceptionsSectionRef}
              open={exceptionsSectionOpen}
              onToggle={(event) => setExceptionsSectionOpen(event.currentTarget.open)}
              className="rounded-lg border border-amber-200 bg-amber-50/40 px-4 py-3 dark:border-amber-900 dark:bg-amber-950/20"
            >
              <summary className="cursor-pointer text-sm font-medium text-foreground">
                Skip or extra visit on a specific date
                {configSlot.exceptions.length > 0 ? (
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    ({configSlot.exceptions.length} for {configSlot.label})
                  </span>
                ) : null}
              </summary>
              <div className="mt-4">
                <VisitPlanSlotExceptionsPanel
                  slot={configSlot}
                  onChange={(patch) => {
                    if (configSlotIndex < 0) return
                    updateSlot(configSlotIndex, patch)
                  }}
                />
              </div>
            </details>
            <details className="rounded-lg border border-border bg-muted/20 px-4 py-3">
              <summary className="cursor-pointer text-sm font-medium text-foreground">
                Frequency &amp; schedule rules
              </summary>
              <div className="mt-4 space-y-4">
                <VisitPlanSlotAdvancedPanel
                  slotCode={configSlot.slotCode}
                  slotLabel={configSlot.label}
                  slot={configSlot}
                  onChange={(patch) => {
                    if (configSlotIndex < 0) return
                    updateSlot(configSlotIndex, patch)
                  }}
                />
                <VisitPlanSlotLifecyclePanel
                  slot={configSlot}
                  onChange={(patch) => {
                    if (configSlotIndex < 0) return
                    updateSlot(configSlotIndex, patch)
                  }}
                />
              </div>
            </details>
            <details className="rounded-lg border border-border bg-muted/20 px-4 py-3">
              <summary className="cursor-pointer text-sm font-medium text-foreground">
                Different carers on different days (advanced)
              </summary>
              <div className="mt-4">
                <VisitPlanSlotCarerByDayPanel
                  slot={configSlot}
                  onChange={(carerAssignments) => {
                    if (configSlotIndex < 0) return
                    updateSlot(configSlotIndex, { carerAssignments })
                  }}
                  onOpenAssign={(group) => {
                    if (group) {
                      setCarerByDayAssignTarget({ slotCode: configSlot.slotCode, groupId: group.groupId })
                      return
                    }
                    setCarersModalSlotCode(configSlot.slotCode)
                  }}
                />
              </div>
            </details>
            <details className="rounded-lg border border-border bg-muted/20 px-4 py-3">
              <summary className="cursor-pointer text-sm font-medium text-foreground">
                Visit recording (notes, photos, family sharing)
              </summary>
              <div className="mt-4">
                <VisitPlanSlotAdditionalDetailsPanel
                  slot={configSlot}
                  onChange={(patch) => {
                    if (configSlotIndex < 0) return
                    updateSlot(configSlotIndex, patch)
                  }}
                />
              </div>
            </details>
          </div>
        ) : (
          <p className="mt-4 border-t border-border pt-4 text-xs text-muted-foreground">
            Click an enabled visit row above to see optional settings for that slot.
          </p>
        )}
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
                const carerAssignments = assignedEmployeeIds.map((employeeId, index) => ({
                  dayOfWeek: null,
                  employeeId,
                  role: (index === 0 ? 'LEAD' : 'SECONDARY') as VisitPlanSlot['carerAssignments'][number]['role'],
                  durationMinutes: null,
                  plannedStartTime: null,
                  plannedEndTime: null,
                  sortOrder: index,
                }))
                updateSlot(carersModalIndex, { assignedEmployeeIds, carerAssignments })
              }}
            />
          ) : null}

          {carerByDayAssignContext ? (
            <VisitPlanSlotCarersDialog
              open={carerByDayAssignTarget !== null}
              onOpenChange={(open) => {
                if (!open) setCarerByDayAssignTarget(null)
              }}
              serviceUserId={serviceUserId}
              slot={carerByDayAssignContext.assignSlot}
              dialogTitle={`${
                carerByDayAssignContext.group.template.employeeId ? 'Change carer' : 'Assign carer'
              } — ${carerByDayAssignContext.slot.label}`}
              dialogDescription={`Pick a carer for ${formatCarerAssignmentGroupDaysLabel(
                carerByDayAssignContext.group.days,
              )} (${carerByDayAssignContext.slot.plannedStartTime}–${carerByDayAssignContext.slot.plannedEndTime}).`}
              onChange={(assignedEmployeeIds) => {
                const ctx = carerByDayAssignContext
                if (!ctx) return
                const employeeId = assignedEmployeeIds[0] ?? ''
                const carerAssignments = replaceGroupField(ctx.slot.carerAssignments, ctx.group, {
                  employeeId,
                })
                updateSlot(
                  ctx.slotIndex,
                  employeeId
                    ? normalizeSlotCarerFields({ ...ctx.slot, carerAssignments })
                    : { carerAssignments },
                )
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
                const current = slotAssignedEmployeeIds(viewCarersModalSlot)
                const assignedEmployeeIds = current.filter((id) => id !== employeeId)
                const carerAssignments = (viewCarersModalSlot.carerAssignments ?? []).filter(
                  (a) => a.employeeId !== employeeId,
                )
                updateSlot(viewCarersModalIndex, { assignedEmployeeIds, carerAssignments })
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

      <section
        className={cn(
          'rounded-xl bg-card p-6 shadow-sm space-y-4',
          workingPlan?.status === 'SUSPENDED'
            ? 'border-2 border-orange-300 dark:border-orange-800'
            : 'border border-border',
        )}
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Step 4</p>
          <h3 className="text-base font-semibold text-foreground">
            {planIsLive ? 'Amend live package' : 'Save or activate'}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {planIsLive
              ? 'Changes to an active package need an amendment reason and are recorded for CQC audit.'
              : workingPlan?.status === 'SUSPENDED'
                ? 'Save updates the suspended plan. Re-activate when visits should resume — your latest schedule is saved first.'
                : 'Save draft keeps work on file without going live. Activate makes this the authorised care package and enables rota generation (always saves your latest schedule first).'}
          </p>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Plan notes (optional)</Label>
          <textarea
            className="mt-1 min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
        {workingPlan ? (
          <div>
            <Label className="text-xs text-muted-foreground">
              {planIsLive
                ? 'Amendment reason (required to save changes to the live package)'
                : 'Reason (optional for draft saves)'}
            </Label>
            <Input
              value={amendmentReason}
              onChange={(e) => setAmendmentReason(e.target.value)}
              placeholder={
                planIsLive
                  ? 'e.g. Client requested later morning call after hospital discharge'
                  : 'e.g. Package agreed with family — optional while still in draft'
              }
            />
          </div>
        ) : null}
        <div className="flex flex-wrap gap-2">
          {workingPlan ? (
            <>
                  {workingPlan.status === 'DRAFT' ? (
                    <Button
                      type="button"
                      variant="default"
                      onClick={() => void handleSaveAndActivate()}
                      disabled={isPublishing}
                    >
                      {isPublishing ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Play className="mr-2 h-4 w-4" />
                      )}
                      Activate authorised package
                    </Button>
                  ) : null}
                  {workingPlan.status === 'SUSPENDED' ? (
                    <Button
                      type="button"
                      variant="default"
                      onClick={() => openActivateDialog()}
                      disabled={isPublishing}
                    >
                      {isPublishing ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Play className="mr-2 h-4 w-4" />
                      )}
                      Re-activate package
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant={planIsLive ? 'default' : 'outline'}
                    onClick={() => void handleSave()}
                    disabled={update.isPending}
                  >
                    {update.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    {planIsLive ? 'Record amendment' : 'Save draft'}
                  </Button>
                  {workingPlan.status === 'ACTIVE' ? (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setSuspendDialogOpen(true)}
                        disabled={suspend.isPending}
                      >
                        {suspend.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Pause className="mr-2 h-4 w-4" />
                        )}
                        Suspend
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={() => setEndDialogOpen(true)}
                        disabled={end.isPending}
                      >
                        {end.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <StopCircle className="mr-2 h-4 w-4" />
                        )}
                        End plan
                      </Button>
                    </>
                  ) : null}
                </>
              ) : (
                <Button
                  type="button"
                  variant="default"
                  onClick={() => void handleCreate()}
                  disabled={create.isPending || !hasWeeklyContractedHours}
                >
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
        <section className="rounded-xl border-2 border-sky-200 bg-card p-6 shadow-sm dark:border-sky-900 space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-sky-700 dark:text-sky-300">Step 5</p>
            <h3 className="text-base font-semibold text-foreground">Generate rota</h3>
            <p className="text-sm text-muted-foreground">
              Create scheduled visits from this plan (max 31 days). Leave To empty for the next 14 days. View results
              in{' '}
              <Link to="/scheduling/view" search={{ date: generateFrom }} className="text-sky-600 underline">
                Scheduling
              </Link>
              .
            </p>
          </div>
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">From</Label>
                  <Input type="date" value={generateFrom} onChange={(e) => setGenerateFrom(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">To (optional)</Label>
                  <Input
                    type="date"
                    value={generateTo}
                    placeholder="Next 14 days"
                    onChange={(e) => setGenerateTo(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Backfill days</Label>
                  <Input
                    type="number"
                    min={0}
                    max={14}
                    value={backfillDays}
                    onChange={(e) => setBackfillDays(Number(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Schedule area</Label>
                  <Select
                    value={scheduleAreaId || '__none__'}
                    onValueChange={(v) => setScheduleAreaId(v === '__none__' ? '' : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Optional" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Default</SelectItem>
                      {(scheduleAreasQuery.data ?? []).map((area) => (
                        <SelectItem key={area.id} value={area.id}>
                          {area.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                    <span className="text-xs text-muted-foreground">{formatDateTime(a.amendedAt)}</span>
                    <p className="mt-0.5">{a.reason}</p>
                  </li>
                ))}
              </ul>
        </section>
      ) : null}

      <VisitPlanSuspendDialog
        open={suspendDialogOpen}
        onOpenChange={setSuspendDialogOpen}
        serviceUserId={serviceUserId}
        planId={workingPlan?.id ?? ''}
        pauseReasons={pauseReasons}
        isPending={suspend.isPending}
        onConfirm={handleConfirmSuspend}
      />

      <VisitPlanEndDialog
        open={endDialogOpen}
        onOpenChange={setEndDialogOpen}
        serviceUserId={serviceUserId}
        planId={workingPlan?.id ?? ''}
        isPending={end.isPending}
        onConfirm={handleConfirmEnd}
      />

      <VisitPlanReactivateDialog
        open={reactivateDialogOpen}
        onOpenChange={setReactivateDialogOpen}
        isPending={isPublishing}
        onConfirm={async (note) => {
          setReactivateDialogOpen(false)
          try {
            await openActivateDialog()
          } catch (e) {
            toastApiError(e, 'Could not continue to activation')
          }
        }}
      />

      <VisitPlanActivateDialog
        open={activateDialogOpen}
        onOpenChange={setActivateDialogOpen}
        serviceUserId={serviceUserId}
        planId={workingPlan?.id ?? ''}
        slots={toSlotInput(slots)}
        defaultRespectWorkingPatternOnSync={
          workingPlan ? visitPlanRespectWorkingPatternOnSync(workingPlan) : true
        }
        isReactivation={workingPlan?.status === 'SUSPENDED'}
        willSaveOnConfirm={workingPlan?.status === 'DRAFT'}
        isPending={isPublishing}
        onConfirm={handleConfirmActivate}
      />

      <VisitPlanGeneratePreviewDialog
        open={generatePreviewOpen}
        onOpenChange={setGeneratePreviewOpen}
        preview={generatePreview}
        loading={generatePreviewLoading}
        fromDate={generateFrom}
        toDate={resolveGenerateRotaToDate(generateFrom, generateTo)}
        isPending={generateSchedule.isPending}
        onConfirm={runGenerateSchedule}
      />

      <VisitPlanWorkingPatternSyncDialog
        open={patternSyncOpen}
        onOpenChange={(open) => {
          if (!open) {
            setPatternSyncPreview(null)
            setPatternSyncConfirmHandler(null)
          }
          setPatternSyncOpen(open)
        }}
        preview={patternSyncPreview}
        isPending={update.isPending || generateSchedule.isPending}
        onConfirmRespect={() => handlePatternSyncChoice(true)}
        onConfirmIgnore={() => handlePatternSyncChoice(false)}
      />

      <VisitPlanConfirmGate
        open={amendmentConfirmOpen}
        onOpenChange={setAmendmentConfirmOpen}
        title="Confirm rota impact"
        description="This amendment will update future visits on the scheduling board."
        impact={pendingAmendmentPreview?.scheduleImpact}
        confirmLabel="Apply amendment"
        isPending={update.isPending}
        onConfirm={handleConfirmAmendmentImpact}
      >
        {pendingAmendmentPreview?.actions.length ? (
          <ul className="space-y-1 text-sm text-muted-foreground">
            {pendingAmendmentPreview.actions.map((action, i) => (
              <li key={i}>
                {action.slotLabel}: {action.type.replace(/_/g, ' ')}
                {action.jobCount != null ? ` (${action.jobCount})` : ''}
              </li>
            ))}
          </ul>
        ) : null}
      </VisitPlanConfirmGate>

      <VisitPlanConfirmGate
        open={postReactivateGenerateOpen}
        onOpenChange={setPostReactivateGenerateOpen}
        title="Generate visits?"
        description="Package is live again. Generate rota visits from tomorrow?"
        confirmLabel="Generate 14 days"
        cancelLabel="Later"
        isPending={generateSchedule.isPending}
        onConfirm={async () => {
          const tomorrow = new Date()
          tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
          const from = tomorrow.toISOString().slice(0, 10)
          setGenerateFrom(from)
          setGenerateTo('')
          setPostReactivateGenerateOpen(false)
          const toDate = resolveGenerateRotaToDate(from, '')
          setGeneratePreviewLoading(true)
          setGeneratePreviewOpen(true)
          try {
            const preview = await previewVisitPlanGenerateSchedule(serviceUserId, workingPlan!.id, {
              fromDate: from,
              toDate,
            })
            setGeneratePreview(preview)
          } catch (e) {
            setGeneratePreviewOpen(false)
            toastApiError(e, 'Could not preview generate schedule')
          } finally {
            setGeneratePreviewLoading(false)
          }
        }}
      />
    </div>
  )
}
