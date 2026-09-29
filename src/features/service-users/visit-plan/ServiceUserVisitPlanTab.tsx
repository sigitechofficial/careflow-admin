import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { CalendarOff, CalendarClock, ClipboardList, Eye, History, Info, Loader2, Package, PanelRightOpen, Pause, Play, RefreshCw, Save, Sparkles, StopCircle, UserPlus } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { FormField, Textarea } from '@/shared/ui/form-field'
import {
  ContentCard,
  ContentSectionHeader,
  contentBodyClass,
  contentEmphasisClass,
  contentHelperClass,
  contentHelperErrorClass,
  contentKickerClass,
  contentSummaryClass,
  contentBadgeClass,
  contentTableRowLabelClass,
  contentTitleClass,
} from '@/shared/ui/content-section'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/data-table'
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
import { useScheduleAreas } from '@/features/scheduling/hooks/useScheduling'
import { VisitPlanSlotAdditionalDetailsPanel } from '@/features/service-users/visit-plan/VisitPlanSlotAdditionalDetailsPanel'
import { VisitPlanSlotDetailsSheet } from '@/features/service-users/visit-plan/VisitPlanSlotDetailsSheet'
import { VisitPlanIaPreferredVisitTimesPanel } from '@/features/service-users/visit-plan/VisitPlanIaPreferredVisitTimesPanel'
import { VisitPlanSlotCarersDialog } from '@/features/service-users/visit-plan/VisitPlanSlotCarersDialog'
import { VisitPlanSlotCarePlansDialog } from '@/features/service-users/visit-plan/VisitPlanSlotCarePlansDialog'
import { VisitPlanCarersCountInput } from '@/features/service-users/visit-plan/VisitPlanCarersCountInput'
import { useVisitPlanCareContext } from '@/features/service-users/visit-plan/hooks/useVisitPlanCareContext'
import {
  normalizeTimeForInput,
  visitDurationMinutes,
  visitPlanEndTimeFromStartAndDuration,
} from '@/features/service-users/visit-plan/visit-plan-time.util'
import { VISIT_PLAN_MAX_DURATION_MINUTES } from '@/features/service-users/visit-plan/visit-plan-constants'
import {
  formatVisitPlanNightDuty,
  resolveVisitPlanNightDuty,
} from '@/features/service-users/visit-plan/visit-plan-night-duty.util'
import {
  assignedEmployeeIdsFromSlots,
  formatSlotAssignedCarersSummary,
  normalizeSlotCarerFields,
  slotGlobalCarerIds,
} from '@/features/service-users/visit-plan/visit-plan-employee-names.util'
import {
  assignCarersToGroup,
  buildCarerByDayAssignSlot,
  formatCarerAssignmentGroupDaysLabel,
  groupCarerAssignments,
} from '@/features/service-users/visit-plan/visit-plan-carer-by-day.util'
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
  buildGenerateRotaHorizonOptions,
  maxEnabledSlotBackfillDays,
  resolveBackfillWindowEnd,
  resolveBackfillWindowStart,
  resolveGenerateRotaToDate,
  resolveRotaStartIsoDate,
  SHOW_GENERATE_ROTA_SECTION,
  addDaysToIsoDate,
  todayIsoDate,
} from '@/features/service-users/visit-plan/visit-plan-generate-rota.util'
import type { VisitPlanScheduleGenerateMode } from '@/features/service-users/visit-plan/VisitPlanGeneratePreviewDialog'
import { useGeneralSettings } from '@/features/settings/hooks/useGeneralSettings'
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/ui/tooltip'

function VisitPlanCarePackageInfoIcon() {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="inline-flex shrink-0 text-muted-foreground transition-colors hover:text-foreground"
            aria-label="About visit plan (care package)"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
            }}
          >
            <Info className="h-3.5 w-3.5" aria-hidden />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-sm space-y-2 text-left text-xs leading-snug">
          <p>
            Authorised call pattern — when visits happen, how long, and how many carers. Separate from the clinical
            care plan. Changes are amendment-audited for CQC. Use{' '}
            <strong className="font-medium">Call pattern</strong> or{' '}
            <strong className="font-medium">Visit calendar</strong> at the top of this page to review without editing.
          </p>
          <p>
            Enter weekly contracted hours above, configure the call pattern below, then create a draft. You can also
            auto-create a plan when care package activation is approved on initial assessment (hours must be on the DOM
            Care profile).
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

function statusBadge(status: ServiceUserVisitPlan['status']) {
  const styles: Record<ServiceUserVisitPlan['status'], string> = {
    DRAFT: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200',
    ACTIVE: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200',
    SUSPENDED: 'bg-orange-100 text-orange-900 dark:bg-orange-950 dark:text-orange-200',
    ENDED: 'bg-muted text-muted-foreground',
  }
  return (
    <span className={cn('rounded-full px-2.5 py-0.5', contentBadgeClass, styles[status])}>
      {status}
    </span>
  )
}

type SetupGuideData = {
  slots: VisitPlanSlot[]
  planStatus: ServiceUserVisitPlan['status'] | null
  hasPlan: boolean
}

type Props = {
  serviceUserId: string
  planId?: string
  onSelectPlan?: (planId: string) => void
  onSetupGuideData?: (data: SetupGuideData) => void
}

const DRAFT_SAVE_DEFAULT_REASON = 'Draft visit plan updated'
const SUSPENDED_SAVE_DEFAULT_REASON = 'Suspended visit plan updated before re-activation'

function slotStartDateInputValue(
  slot: VisitPlanSlot,
  planEffectiveFrom?: string | null,
): string {
  if (slot.slotKind === 'ONE_OFF') {
    return slot.oneOffDate?.slice(0, 10) ?? ''
  }
  return slot.slotEffectiveFrom?.slice(0, 10) ?? planEffectiveFrom?.slice(0, 10) ?? todayIsoDate()
}

function slotStartDatePatch(slot: VisitPlanSlot, value: string): Partial<VisitPlanSlot> {
  if (slot.slotKind === 'ONE_OFF') {
    return { oneOffDate: value || null }
  }
  return { slotEffectiveFrom: value || null }
}

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
      nightDuty: s.nightDuty,
      slotEffectiveFrom: s.slotEffectiveFrom,
      slotEffectiveTo: s.slotEffectiveTo,
      oneOffDate: s.oneOffDate,
      allowBackfillDays: s.allowBackfillDays,
      exceptions: (s.exceptions ?? []).map(({ id: _id, ...exception }) => exception),
    }
  })
}

/** Regenerate rota step number when visible; Backfill follows (or becomes 5 when Regenerate is hidden). */
const GENERATE_ROTA_STEP = 5
const BACKFILL_STEP = SHOW_GENERATE_ROTA_SECTION ? 6 : 5

export function ServiceUserVisitPlanTab({ serviceUserId, planId, onSelectPlan, onSetupGuideData }: Props) {
  const { data: plans, isLoading } = useServiceUserVisitPlans(serviceUserId)
  const { data: activePlan } = useActiveServiceUserVisitPlan(serviceUserId)
  const { create, update, activate, suspend, end, generateSchedule } =
    useServiceUserVisitPlanMutations(serviceUserId)
  const { data: medicationRounds = [], isLoading: medicationRoundsLoading } = useMedicationRounds()
  const scheduleAreasQuery = useScheduleAreas()
  const domCareQuery = useServiceUserDomCare(serviceUserId)
  const generalSettingsQuery = useGeneralSettings()
  const rotaHorizonOptions = React.useMemo(
    () => buildGenerateRotaHorizonOptions(generalSettingsQuery.data),
    [generalSettingsQuery.data],
  )
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
  const [backfillDays, setBackfillDays] = React.useState(6)
  const [scheduleAreaId, setScheduleAreaId] = React.useState<string>('')
  const [configSlotCode, setConfigSlotCode] = React.useState<VisitPlanSlot['slotCode']>('')
  const [detailsSlotCode, setDetailsSlotCode] = React.useState<VisitPlanSlot['slotCode'] | null>(null)
  const [carersModalSlotCode, setCarersModalSlotCode] = React.useState<VisitPlanSlot['slotCode'] | null>(null)
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
  const [generatePreviewMode, setGeneratePreviewMode] =
    React.useState<VisitPlanScheduleGenerateMode>('generate')
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

  const assignedEmployeeIds = React.useMemo(() => assignedEmployeeIdsFromSlots(slots), [slots])
  const employeeNameById = useEmployeeNameMap(assignedEmployeeIds)

  React.useEffect(() => {
    if (!medicationRounds.length) return
    // IA lone-worker flag → default new/unset slots to 2 carers (never overrides
    // a saved plan's explicit values, which come through `prev` in the builder).
    const defaultRequiredCarers = careContext.loneWorkerTwoCarerRequired ? 2 : 1
    if (!workingPlan) {
      setSlots(visitPlanSlotsFromMedicationRounds(medicationRounds, undefined, { defaultRequiredCarers }))
      if (careContext.loneWorkerTwoCarerRequired) setNumberOfCarers(2)
      return
    }
    setSlots(
      visitPlanSlotsFromMedicationRounds(
        medicationRounds,
        workingPlan.slots?.length ? workingPlan.slots : undefined,
        { defaultRequiredCarers },
      ),
    )
    setWeeklyHours(workingPlan.weeklyContractedHours ?? '')
    setNumberOfCarers(workingPlan.numberOfCarers)
    setNotes(workingPlan.notes ?? '')
  }, [workingPlan?.id, workingPlan?.updatedAt, medicationRounds, careContext.loneWorkerTwoCarerRequired])

  React.useEffect(() => {
    if (!slots.length) return
    if (slots.some((s) => s.slotCode === configSlotCode)) return
    const firstEnabled = slots.find((s) => s.isEnabled)
    setConfigSlotCode((firstEnabled ?? slots[0]!).slotCode)
  }, [slots, configSlotCode])

  React.useEffect(() => {
    onSetupGuideData?.({
      slots,
      planStatus: workingPlan?.status ?? null,
      hasPlan: Boolean(workingPlan?.id),
    })
  }, [slots, workingPlan?.id, workingPlan?.status, onSetupGuideData])

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
    setSlots((prev) =>
      prev.map((row, i) => {
        if (i !== slotIndex) return row
        const next = { ...row, ...patch }
        return { ...next, nightDuty: resolveVisitPlanNightDuty(next) }
      }),
    )
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
  const maxSlotBackfillDays = React.useMemo(() => maxEnabledSlotBackfillDays(slots), [slots])
  const rotaStartDate = React.useMemo(
    () => resolveRotaStartIsoDate(slots, workingPlan?.effectiveFrom ?? null),
    [slots, workingPlan?.effectiveFrom],
  )
  const effectiveBackfillDays =
    maxSlotBackfillDays > 0
      ? Math.min(Math.max(1, backfillDays), maxSlotBackfillDays)
      : Math.max(1, backfillDays)
  const backfillWindowStart = rotaStartDate
    ? resolveBackfillWindowStart(rotaStartDate, effectiveBackfillDays)
    : ''
  const backfillWindowEnd = rotaStartDate ? resolveBackfillWindowEnd(rotaStartDate) : ''
  const generatePreviewRange =
    generatePreviewMode === 'backfill'
      ? { fromDate: backfillWindowStart, toDate: backfillWindowEnd }
      : {
          fromDate: generateFrom,
          toDate: resolveGenerateRotaToDate(generateFrom, generateTo, rotaHorizonOptions),
        }

  const handleGenerate = async () => {
    if (!workingPlan || workingPlan.status !== 'ACTIVE' || !workingPlan.id) return
    if (!generateFrom) {
      toastApiError(new Error('From date required'), 'Select a from date')
      return
    }
    const toDate = resolveGenerateRotaToDate(generateFrom, generateTo, rotaHorizonOptions)
    setGeneratePreviewMode('regenerate')
    setGeneratePreview(null)
    setGeneratePreviewLoading(true)
    setGeneratePreviewOpen(true)
    try {
      const preview = await previewVisitPlanGenerateSchedule(serviceUserId, workingPlan.id, {
        fromDate: generateFrom,
        toDate,
      })
      setGeneratePreview(preview)
    } catch (e) {
      setGeneratePreviewOpen(false)
      toastApiError(e, 'Could not preview regenerate rota')
    } finally {
      setGeneratePreviewLoading(false)
    }
  }

  const handleBackfill = async () => {
    if (!workingPlan || workingPlan.status !== 'ACTIVE' || !workingPlan.id) return
    if (!rotaStartDate) {
      toastApiError(
        new Error('Rota start date missing'),
        'Set a Start Date on at least one enabled call first',
      )
      return
    }
    const savedMaxBackfill = maxEnabledSlotBackfillDays(workingPlan.slots ?? [])
    if (savedMaxBackfill <= 0) {
      toastApiError(
        new Error('Max backfill days not saved'),
        'Set Max backfill days on Morning, then click Record amendment to save — then run Backfill',
      )
      return
    }
    if (maxSlotBackfillDays <= 0) {
      toastApiError(
        new Error('No call slots allow backfill'),
        'Set Max backfill days on at least one enabled call before backfilling',
      )
      return
    }
    if (maxSlotBackfillDays > savedMaxBackfill) {
      toastApiError(
        new Error('Unsaved backfill days'),
        `Form shows ${maxSlotBackfillDays} days but saved plan allows ${savedMaxBackfill}. Record amendment first.`,
      )
      return
    }
    const days = Math.min(Math.max(1, backfillDays), savedMaxBackfill)
    setGeneratePreviewMode('backfill')
    setGeneratePreview(null)
    setGeneratePreviewLoading(true)
    setGeneratePreviewOpen(true)
    try {
      const preview = await previewVisitPlanGenerateSchedule(serviceUserId, workingPlan.id, {
        fromDate: rotaStartDate,
        toDate: rotaStartDate,
        backfillDays: days,
        backfillOnly: true,
      })
      setGeneratePreview(preview)
    } catch (e) {
      setGeneratePreviewOpen(false)
      toastApiError(e, 'Could not preview backfill')
    } finally {
      setGeneratePreviewLoading(false)
    }
  }

  const runGenerateSchedule = async () => {
    if (!workingPlan?.id) return
    const respect = visitPlanRespectWorkingPatternOnSync(workingPlan)
    try {
      if (generatePreviewMode === 'backfill') {
        if (!rotaStartDate) return
        const days = Math.min(Math.max(1, backfillDays), maxSlotBackfillDays || 14)
        const result = await generateSchedule.mutateAsync({
          planId: workingPlan.id,
          fromDate: rotaStartDate,
          toDate: rotaStartDate,
          backfillDays: days,
          backfillOnly: true,
          scheduleAreaId: scheduleAreaId || undefined,
          respectWorkingPatternOnSync: respect,
        })
        setGeneratePreviewOpen(false)
        toastSuccess(
          'Backfill complete',
          `${result.visitsCreated} visits created (${result.visitsSkipped} already existed).`,
        )
        return
      }

      if (!generateFrom) return
      const toDate = resolveGenerateRotaToDate(generateFrom, generateTo, rotaHorizonOptions)
      const result = await generateSchedule.mutateAsync({
        planId: workingPlan.id,
        fromDate: generateFrom,
        toDate,
        scheduleAreaId: scheduleAreaId || undefined,
        respectWorkingPatternOnSync: respect,
      })
      setGeneratePreviewOpen(false)
      toastSuccess(
        generatePreviewMode === 'regenerate' ? 'Rota regenerated' : 'Rota generated',
        generatePreviewMode === 'regenerate'
          ? `${result.visitsCreated} visits created; ${result.visitsSkipped} existing visits synced.`
          : `${result.visitsCreated} visits created (${result.visitsSkipped} already existed).`,
      )
    } catch (e) {
      toastApiError(
        e,
        generatePreviewMode === 'backfill'
          ? 'Could not backfill visits'
          : generatePreviewMode === 'regenerate'
            ? 'Could not regenerate rota'
            : 'Could not generate schedule',
      )
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
          <div className="flex gap-3">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-700 dark:text-violet-300">
              <Package className="h-4 w-4" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className={contentTitleClass}>Which package are you editing?</p>
              <p className={cn('mt-0.5', contentBodyClass)}>
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
            </div>
          </div>
        </section>
      ) : null}

      <ContentCard>
        <ContentSectionHeader
          icon={<ClipboardList className="h-5 w-5" aria-hidden />}
          iconClassName="bg-sky-500/10 text-sky-700 dark:text-sky-300"
          title={
            <span className="inline-flex items-center gap-1.5">
              Visit plan (care package)
              <VisitPlanCarePackageInfoIcon />
            </span>
          }
          titleClassName="text-sky-600 dark:text-sky-400"
          action={workingPlan ? statusBadge(workingPlan.status) : null}
        />

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <FormField
            label="Weekly contracted hours"
            required={!workingPlan}
            error={
              !workingPlan && !hasWeeklyContractedHours
                ? 'Required before you can create a visit plan.'
                : undefined
            }
          >
            <Input
              value={weeklyHours}
              onChange={(e) => setWeeklyHours(e.target.value)}
              placeholder="e.g. 14"
              required={!workingPlan}
            />
          </FormField>
          <FormField label="Carers per visit (default)">
            <VisitPlanCarersCountInput value={numberOfCarers} onCommit={setNumberOfCarers} />
            {careContext.loneWorkerTwoCarerRequired ? (
              <p className="mt-1 text-xs font-medium text-amber-700 dark:text-amber-400">
                Initial assessment flags a two-carer (double-up) visit — 2 carers recommended.
              </p>
            ) : null}
          </FormField>
          <FormField label="Review due">
            <Input readOnly value={formatDate(workingPlan?.reviewDueAt)} />
          </FormField>
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
              <span className={contentHelperClass}>Matches this plan</span>
            )}
          </div>
        ) : domCareQuery.isLoading ? (
          <p className={cn('mt-3', contentHelperClass)}>Loading contract profile…</p>
        ) : null}
        <VisitPlanWeeklyHoursPanel
          className="mt-4"
          slots={slots}
          weeklyContractedHours={weeklyHours}
          anchorIso={workingPlan?.effectiveFrom}
        />
      </ContentCard>

      <VisitPlanIaPreferredVisitTimesPanel serviceUserId={serviceUserId} />

      {careContext.loneWorkerTwoCarerRequired ? (
        <div
          className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300"
          data-testid="visit-plan-two-carer-recommendation"
        >
          <span className="font-semibold">Two-carer (double-up) visit recommended.</span>{' '}
          The initial assessment flags a lone-worker / staff-safety risk for this service user.
          New visit slots default to 2 carers — review the Carers column below before saving.
        </div>
      ) : null}

      <ContentCard className="border-2 border-teal-200 dark:border-teal-900">
        <ContentSectionHeader
          icon={<CalendarClock className="h-5 w-5" aria-hidden />}
          iconClassName="bg-teal-500/10 text-teal-700 dark:text-teal-300"
          kicker="Step 1–3"
          kickerClassName="text-teal-700 dark:text-teal-300"
          title="Visit schedule"
          titleAs="h3"
          description={
            <>
              One row per call type (Morning, Evening, …). Turn visits on, pick days, set start date, times, and
              duration, then <strong>Assign</strong> carers. Use <strong>Skip date</strong> to miss this visit on one
              day only.
            </>
          }
          className="mb-4"
        />
            {medicationRoundsLoading ? (
              <p className={cn('mb-3', contentHelperClass)}>Loading time slots…</p>
            ) : medicationRounds.length === 0 ? (
              <p className="mb-3 text-xs font-medium text-amber-700 dark:text-amber-300">
                No time slots configured. Add them under Settings → Time slots.
              </p>
            ) : null}
            <Table className="min-w-[1080px]">
                <TableHeader>
                  <TableRow className="border-b border-border bg-muted/40 hover:bg-transparent">
                    <TableHead variant="data">Slot</TableHead>
                    <TableHead variant="data">On</TableHead>
                    {VISIT_PLAN_DAY_LABELS.map((d) => (
                      <TableHead key={d} variant="data" align="center" className="px-1">
                        {d}
                      </TableHead>
                    ))}
                    <TableHead variant="data" className="pl-2">Start</TableHead>
                    <TableHead variant="data" className="pl-2">Duration (mins)</TableHead>
                    <TableHead variant="data" className="pl-2">End</TableHead>
                    <TableHead variant="data" className="pl-2">Carers</TableHead>
                    <TableHead variant="data">Care plans</TableHead>
                    <TableHead variant="data">Assigned carers</TableHead>
                    <TableHead variant="data">Exceptions</TableHead>
                    <TableHead variant="data">Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {slots.map((slot, rowIndex) => {
                    const assignedIds = slotGlobalCarerIds(slot)
                    const carerSummary = formatSlotAssignedCarersSummary(slot, employeeNameById)
                    return (
                      <TableRow
                        key={slot.slotCode}
                        className={cn(
                          'cursor-pointer border-b border-border/60 hover:bg-muted/40',
                          // Disabled controls swallow clicks; let them reach the row so the slot can be selected.
                          !slot.isEnabled && '[&_:disabled]:pointer-events-none',
                          configSlotCode === slot.slotCode && 'bg-teal-50/90 dark:bg-teal-950/30',
                        )}
                        onClick={() => setConfigSlotCode(slot.slotCode)}
                      >
                        <TableCell variant="data" className="pr-0">
                          <div className={contentTableRowLabelClass}>{slot.label}</div>
                          {slot.nightDuty !== 'NONE' ? (
                            <p className="mt-0.5 text-[11px] text-sky-700 dark:text-sky-300">
                              {formatVisitPlanNightDuty(slot.nightDuty)}
                            </p>
                          ) : null}
                          <Input
                            type="date"
                            className="mt-1 h-8 w-[9.5rem] text-sm"
                            value={slotStartDateInputValue(slot, workingPlan?.effectiveFrom)}
                            disabled={!slot.isEnabled}
                            aria-label={`${slot.label} start date`}
                            onChange={(e) =>
                              updateSlot(rowIndex, slotStartDatePatch(slot, e.target.value))
                            }
                          />
                        </TableCell>
                        <TableCell variant="data">
                          <Switch
                            checked={slot.isEnabled}
                            onCheckedChange={(isEnabled) => {
                              updateSlot(rowIndex, { isEnabled })
                              if (isEnabled) setConfigSlotCode(slot.slotCode)
                            }}
                            aria-label={`Enable ${slot.label}`}
                          />
                        </TableCell>
                        {VISIT_PLAN_DAY_LABELS.map((_, dayIndex) => (
                          <TableCell key={dayIndex} variant="data" className="px-1 text-center">
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
                          </TableCell>
                        ))}
                        <TableCell variant="data" className="pl-2">
                          <Input
                            type="time"
                            className="h-8 w-[7.25rem] text-sm"
                            value={normalizeTimeForInput(slot.plannedStartTime)}
                            disabled={!slot.isEnabled}
                            onChange={(e) => {
                              const plannedStartTime = e.target.value
                              const end = visitPlanEndTimeFromStartAndDuration(
                                plannedStartTime,
                                slot.durationMinutes,
                              )
                              updateSlot(rowIndex, {
                                plannedStartTime,
                                ...(end ? { plannedEndTime: end } : {}),
                              })
                            }}
                          />
                        </TableCell>
                        <TableCell variant="data" className="pl-2">
                          <Input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            className="h-8 w-16 text-sm tabular-nums"
                            value={slot.durationMinutes ?? ''}
                            placeholder="min"
                            disabled={!slot.isEnabled}
                            aria-label={`${slot.label} duration minutes`}
                            onChange={(e) => {
                              const raw = e.target.value
                              if (raw !== '' && !/^\d*$/.test(raw)) return
                              const durationMinutes =
                                raw === ''
                                  ? null
                                  : Math.min(VISIT_PLAN_MAX_DURATION_MINUTES, Math.max(1, Number(raw)))
                              const end = visitPlanEndTimeFromStartAndDuration(
                                slot.plannedStartTime,
                                durationMinutes,
                              )
                              updateSlot(rowIndex, {
                                durationMinutes,
                                ...(end ? { plannedEndTime: end } : {}),
                              })
                            }}
                            onFocus={(e) => e.currentTarget.select()}
                          />
                        </TableCell>
                        <TableCell variant="data" className="pl-2">
                          <Input
                            type="time"
                            className="h-8 w-[7.25rem] text-sm"
                            value={normalizeTimeForInput(slot.plannedEndTime)}
                            disabled={!slot.isEnabled}
                            onChange={(e) => {
                              const plannedEndTime = e.target.value
                              const start = normalizeTimeForInput(slot.plannedStartTime)
                              const end = normalizeTimeForInput(plannedEndTime)
                              const mins = start && end ? visitDurationMinutes(start, end) : null
                              updateSlot(rowIndex, {
                                plannedEndTime,
                                ...(mins != null && mins > 0 ? { durationMinutes: mins } : {}),
                              })
                            }}
                          />
                        </TableCell>
                        <TableCell variant="data" className="pl-2">
                          <VisitPlanCarersCountInput
                            className="h-8 w-16 text-sm"
                            disabled={!slot.isEnabled}
                            value={slot.requiredCarers}
                            aria-label={`${slot.label} carers per visit`}
                            onCommit={(requiredCarers) => {
                              // Slot default count trims the global carers only; day-specific advanced
                              // rows keep their own carers and per-row counts untouched.
                              const globalIds = slotGlobalCarerIds(slot)
                              const assignedEmployeeIds =
                                globalIds.length > requiredCarers
                                  ? globalIds.slice(0, requiredCarers)
                                  : globalIds
                              const carerAssignments = (slot.carerAssignments ?? []).filter(
                                (a) => a.dayOfWeek != null || assignedEmployeeIds.includes(a.employeeId),
                              )
                              updateSlot(rowIndex, { requiredCarers, assignedEmployeeIds, carerAssignments })
                            }}
                          />
                        </TableCell>
                        <TableCell variant="data">
                          {slot.isEnabled ? (
                            <div className="flex min-w-[120px]">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-8"
                                onClick={() => setCarePlansModalSlotCode(slot.slotCode)}
                              >
                                <Eye className="mr-1 h-3.5 w-3.5" />
                                View
                              </Button>
                            </div>
                          ) : (
                            <span className={contentBodyClass}>—</span>
                          )}
                        </TableCell>
                        <TableCell variant="data">
                          {slot.isEnabled ? (
                            <div className="flex min-w-[140px] flex-col gap-1">
                              <p
                                className={cn(
                                  contentBodyClass,
                                  'leading-snug',
                                  assignedIds.length ? 'text-foreground' : undefined,
                                )}
                                title={carerSummary}
                              >
                                {carerSummary}
                              </p>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-8 w-fit"
                                onClick={() => setCarersModalSlotCode(slot.slotCode)}
                              >
                                <UserPlus className="mr-1 h-3.5 w-3.5" />
                                {assignedIds.length > 0 ? 'Change' : 'Assign'}
                              </Button>
                            </div>
                          ) : (
                            <span className={contentBodyClass}>—</span>
                          )}
                        </TableCell>
                        <TableCell variant="data">
                          {slot.isEnabled ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8"
                              onClick={() => openExceptionsForSlot(slot.slotCode)}
                            >
                              <CalendarOff className="mr-1 h-3.5 w-3.5" />
                              {slot.exceptions.length > 0 ? `${slot.exceptions.length} set` : 'Skip date'}
                            </Button>
                          ) : (
                            <span className={contentBodyClass}>—</span>
                          )}
                        </TableCell>
                        <TableCell variant="data">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8"
                            onClick={() => {
                              setConfigSlotCode(slot.slotCode)
                              setDetailsSlotCode(slot.slotCode)
                            }}
                          >
                            <PanelRightOpen className="mr-1 h-3.5 w-3.5" />
                            Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>

        {configSlot ? (
          <div className="mt-6 space-y-3 border-t border-border pt-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className={contentBodyClass}>
                Optional settings for <strong className="font-medium text-foreground">{configSlot.label}</strong> — click a row
                above to switch slot.
                {!configSlot.isEnabled ? (
                  <span className={cn('ml-1', contentHelperClass)}>
                    This visit is off — turn it on to schedule it.
                  </span>
                ) : null}
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
              <summary className={contentSummaryClass}>
                Skip or extra visit on a specific date
                {configSlot.exceptions.length > 0 ? (
                  <span className={cn('ml-2 font-normal', contentHelperClass)}>
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
              <summary className={contentSummaryClass}>
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
              <summary className={contentSummaryClass}>
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
              <summary className={contentSummaryClass}>
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
          <p className={cn('mt-4 border-t border-border pt-4', contentHelperClass)}>
            Click a visit row above to see optional settings for that slot.
          </p>
        )}
      </ContentCard>

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
                // Replace only the global (all-days) carer rows; keep any day-specific advanced rows.
                const daySpecific = (carersModalSlot.carerAssignments ?? []).filter(
                  (a) => a.dayOfWeek != null,
                )
                const globalRows = assignedEmployeeIds.map((employeeId, index) => ({
                  dayOfWeek: null,
                  employeeId,
                  role: (index === 0 ? 'LEAD' : 'SECONDARY') as VisitPlanSlot['carerAssignments'][number]['role'],
                  durationMinutes: null,
                  plannedStartTime: null,
                  plannedEndTime: null,
                  sortOrder: index,
                }))
                const carerAssignments = [...globalRows, ...daySpecific]
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
                carerByDayAssignContext.group.carers.some((carer) => carer.employeeId?.trim())
                  ? 'Change carers'
                  : 'Assign carers'
              } — ${carerByDayAssignContext.slot.label}`}
              dialogDescription={`Pick carers for ${formatCarerAssignmentGroupDaysLabel(
                carerByDayAssignContext.group.days,
              )} (${carerByDayAssignContext.slot.plannedStartTime}–${carerByDayAssignContext.slot.plannedEndTime}).`}
              onChange={(assignedEmployeeIds) => {
                const ctx = carerByDayAssignContext
                if (!ctx) return
                const carerAssignments = assignCarersToGroup(
                  ctx.slot.carerAssignments,
                  ctx.group,
                  assignedEmployeeIds,
                )
                updateSlot(
                  ctx.slotIndex,
                  assignedEmployeeIds.length
                    ? normalizeSlotCarerFields({ ...ctx.slot, carerAssignments })
                    : { carerAssignments },
                )
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

      <ContentCard
        className={cn(
          'space-y-4',
          workingPlan?.status === 'SUSPENDED'
            ? 'border-2 border-orange-300 dark:border-orange-800'
            : undefined,
        )}
      >
        <ContentSectionHeader
          icon={
            planIsLive ? (
              <Save className="h-5 w-5" aria-hidden />
            ) : (
              <Play className="h-5 w-5" aria-hidden />
            )
          }
          iconClassName={
            workingPlan?.status === 'SUSPENDED'
              ? 'bg-orange-500/10 text-orange-700 dark:text-orange-300'
              : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
          }
          kicker="Step 4"
          title={planIsLive ? 'Amend live package' : 'Save or activate'}
          titleAs="h3"
          description={
            planIsLive
              ? 'Changes to an active package need an amendment reason and are recorded for CQC audit.'
              : workingPlan?.status === 'SUSPENDED'
                ? 'Save updates the suspended plan. Re-activate when visits should resume — your latest schedule is saved first.'
                : 'Save draft keeps work on file without going live. Activate makes this the authorised care package and enables rota generation (always saves your latest schedule first).'
          }
        />
        <FormField label="Plan notes (optional)">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
        </FormField>
        {workingPlan ? (
          <FormField
            label={
              planIsLive
                ? 'Amendment reason (required to save changes to the live package)'
                : 'Reason (optional for draft saves)'
            }
          >
            <Input
              value={amendmentReason}
              onChange={(e) => setAmendmentReason(e.target.value)}
              placeholder={
                planIsLive
                  ? 'e.g. Client requested later morning call after hospital discharge'
                  : 'e.g. Package agreed with family — optional while still in draft'
              }
            />
          </FormField>
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
      </ContentCard>

      {/* Forward regenerate — creates missing visits and syncs carers on existing ones */}
      {SHOW_GENERATE_ROTA_SECTION && workingPlan?.status === 'ACTIVE' ? (
        <ContentCard className="space-y-4 border-2 border-sky-200 dark:border-sky-900">
          <ContentSectionHeader
            icon={<RefreshCw className="h-5 w-5" aria-hidden />}
            iconClassName="bg-sky-500/10 text-sky-700 dark:text-sky-300"
            kicker={`Step ${GENERATE_ROTA_STEP}`}
            kickerClassName="text-sky-700 dark:text-sky-300"
            title="Regenerate rota"
            titleAs="h3"
            description={
              <>
                Apply the saved visit plan to the schedule (max 31 days). Creates any missing visits and
                syncs carers on existing ones — including day-specific carers. Leave To empty for the
                configured horizon. View results in{' '}
                <Link to="/scheduling/view" search={{ date: generateFrom }} className="text-sky-600 underline">
                  Scheduling
                </Link>
                . Use Backfill past visits below for catch-up days.
              </>
            }
          />
              <div className="flex flex-wrap items-end gap-3">
                <FormField label="From" className="min-w-[10rem]">
                  <Input type="date" value={generateFrom} onChange={(e) => setGenerateFrom(e.target.value)} />
                </FormField>
                <FormField label="To (optional)" className="min-w-[10rem]">
                  <Input
                    type="date"
                    value={generateTo}
                    placeholder="Next 14 days"
                    onChange={(e) => setGenerateTo(e.target.value)}
                  />
                </FormField>
                <FormField label="Backfill days" className="w-28">
                  <Input
                    type="number"
                    min={0}
                    max={14}
                    value={backfillDays}
                    onChange={(e) => setBackfillDays(Number(e.target.value) || 0)}
                  />
                </FormField>
                <FormField label="Schedule area" className="min-w-[12rem]">
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
                </FormField>
                <Button
                  type="button"
                  onClick={() => void handleGenerate()}
                  disabled={generateSchedule.isPending}
                >
                  {generateSchedule.isPending && generatePreviewMode === 'regenerate' ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  Regenerate rota
                </Button>
              </div>
        </ContentCard>
      ) : null}

      {workingPlan?.status === 'ACTIVE' ? (
        <ContentCard className="space-y-4 border-2 border-amber-200 dark:border-amber-900">
          <ContentSectionHeader
            icon={<History className="h-5 w-5" aria-hidden />}
            iconClassName="bg-amber-500/10 text-amber-800 dark:text-amber-300"
            kicker={`Step ${BACKFILL_STEP}`}
            kickerClassName="text-amber-800 dark:text-amber-300"
            title="Backfill past visits"
            titleAs="h3"
            description={
              <>
                Create visits for the days <strong>before</strong> rota start (call Start Date). Example: rota
                starts 6 Aug and days = 5 → creates 1–5 Aug. First set Max backfill days on the call, then{' '}
                <strong>Record amendment</strong> to save, then backfill. View results in{' '}
                <Link
                  to="/scheduling/view"
                  search={{ date: backfillWindowStart || rotaStartDate || generateFrom }}
                  className="text-amber-700 underline dark:text-amber-300"
                >
                  Scheduling
                </Link>
                .
              </>
            }
          />
          <div className="flex flex-wrap items-end gap-3">
            <FormField label="Days before rota start" className="w-40">
              <Input
                type="number"
                min={1}
                max={maxSlotBackfillDays || 14}
                value={backfillDays}
                onChange={(e) => setBackfillDays(Number(e.target.value) || 0)}
              />
            </FormField>
            <FormField label="Schedule area" className="min-w-[12rem]">
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
            </FormField>
            <Button
              type="button"
              variant="secondary"
              onClick={() => void handleBackfill()}
              disabled={
                generateSchedule.isPending ||
                maxSlotBackfillDays <= 0 ||
                backfillDays < 1 ||
                !rotaStartDate
              }
            >
              {generateSchedule.isPending && generatePreviewMode === 'backfill' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <History className="mr-2 h-4 w-4" />
              )}
              Backfill visits
            </Button>
          </div>
          {!rotaStartDate ? (
            <p className={contentHelperErrorClass}>
              Set a Start Date on an enabled call (e.g. Morning) so we know when the rota started.
            </p>
          ) : maxSlotBackfillDays <= 0 ? (
            <p className={contentHelperErrorClass}>
              No enabled call allows backfill. Open a call&apos;s details and set Max backfill days (1–14).
            </p>
          ) : (
            <p className={contentHelperClass}>
              Rota start: {rotaStartDate}. Will create: {backfillWindowStart} → {backfillWindowEnd} (slot
              cap {maxSlotBackfillDays} day{maxSlotBackfillDays === 1 ? '' : 's'}).
            </p>
          )}
        </ContentCard>
      ) : null}

      {workingPlan && (workingPlan.amendments ?? []).length > 0 ? (
        <ContentCard>
              <ContentSectionHeader
                icon={<History className="h-5 w-5" aria-hidden />}
                iconClassName="bg-violet-500/10 text-violet-700 dark:text-violet-300"
                title="Amendment history"
                titleAs="h3"
                className="mb-3"
              />
              <ul className={cn('space-y-2', contentBodyClass)}>
                {(workingPlan.amendments ?? []).map((a: VisitPlanAmendment) => (
                  <li key={a.id} className="rounded-md border border-border/60 bg-muted/20 px-3 py-2">
                    <span className={contentHelperClass}>{formatDateTime(a.amendedAt)}</span>
                    <p className="mt-0.5">{a.reason}</p>
                  </li>
                ))}
              </ul>
        </ContentCard>
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
        mode={generatePreviewMode}
        fromDate={generatePreviewRange.fromDate}
        toDate={generatePreviewRange.toDate}
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
          const from = addDaysToIsoDate(todayIsoDate(), 1)
          setGenerateFrom(from)
          setGenerateTo('')
          setPostReactivateGenerateOpen(false)
          setGeneratePreviewMode('generate')
          const toDate = resolveGenerateRotaToDate(from, '', rotaHorizonOptions)
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
