import * as React from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Loader2, MapPin, Plus, Trash2 } from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import type { CreateServiceUserMedicationPayload } from '@/features/service-users/types'
import {
  useAddMedicationPackItem,
  useCreateMedicationPack,
  useCreateServiceUserMedication,
  useMedicationLookups,
  useMedicationPacks,
} from '@/features/service-users/hooks/useServiceUserMedicationMutations'
import { useMedicationSchedulePreview } from '@/features/service-users/hooks/useMedicationSchedulePreview'
import type { MedicationSchedulePreviewPayload } from '@/features/service-users/api/medication-schedule-preview.api'
import { toastApiError, toastError, toastSuccess } from '@/shared/lib/toast'
import { Button } from '@/shared/ui/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { medicationRequiresBodyMapFromLookupIds } from '@/features/service-users/medication/medication-body-map-eligibility'
import {
  MedicationNameSearchField,
  type MedicationOpenFdaAutofill,
} from '@/features/service-users/medication/MedicationNameSearchField'
import { Input } from '@/shared/ui/input'
import { MedicationFieldLabelWithTooltip } from '@/features/service-users/medication/MedicationFieldLabelWithTooltip'
import {
  CONTROLLED_MEDICATION_TOOLTIP,
  DECONGESTANT_MEDICATION_TOOLTIP,
  DOSE_TOOLTIP,
} from '@/features/service-users/medication/medication-field-help'
import { TimeSensitiveMedicationFields } from '@/features/service-users/medication/TimeSensitiveMedicationFields'
import { NoYesToggle } from '@/shared/ui/no-yes-toggle'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
const SELECT_NONE = '__none__'

const HOW_ASSISTED_OPTIONS = [
  'Self',
  'Prompting',
  'Supervision',
  'Full assistance',
  'Not applicable',
] as const

import { createClientUuid } from '@/shared/lib/create-client-uuid'
import { MedicationTimeSlotRow } from '@/features/service-users/medication/MedicationTimeSlotRow'
import {
  matchRoundIdByTime,
  newTimeSlot,
  nextUnusedMedicationRound,
  slotFromRound,
  timeSlotsFromRounds,
  type MedicationTimeSlot,
} from '@/features/service-users/medication/medication-time-slots'
import {
  defaultWeekdays,
  resolveFrequencyIdForPattern,
  SCHEDULE_PATTERN_OPTIONS,
  WEEKDAY_OPTIONS,
  type SchedulePattern,
  type WeekdayValue,
} from '@/features/service-users/medication/medication-schedule-pattern'

export type BlisterPackItemDraft = {
  id: string
  medicationName: string
  strength: string
}

function newPackItem(): BlisterPackItemDraft {
  return { id: createClientUuid(), medicationName: '', strength: '' }
}

function optionalId(v: string): string | undefined {
  return v && v !== SELECT_NONE ? v : undefined
}

function normalizeTimeInput(value: string): string {
  const t = value.trim()
  if (!t) return ''
  if (/^([01]\d|2[0-3]):[0-5]\d$/.test(t)) return t
  const m = t.match(/^(\d{1,2}):(\d{2})$/)
  if (!m) return t
  const h = m[1]
  const min = m[2]
  if (!h || !min) return t
  return `${h.padStart(2, '0')}:${min}`
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  serviceUserId: string
  canSave: boolean
  onSaved: () => void | Promise<void>
}

export function AddMedicationDialog({
  open,
  onOpenChange,
  serviceUserId,
  canSave,
  onSaved,
}: Props) {
  const {
    data: lookups,
    isLoading: lookupsLoading,
    error: lookupsQueryError,
  } = useMedicationLookups(open)
  const lookupsError =
    lookupsQueryError instanceof ApiError
      ? lookupsQueryError.message
      : lookupsQueryError
        ? 'Failed to load lookups'
        : null

  const navigate = useNavigate()
  const createMedication = useCreateServiceUserMedication()
  const createPack = useCreateMedicationPack()
  const addPackItemMutation = useAddMedicationPackItem()

  const [bodyMapPrompt, setBodyMapPrompt] = React.useState<{
    medicationId: string
    medicationName: string
    blisterItemCount?: number
  } | null>(null)

  const [recordType, setRecordType] = React.useState<'MEDICATION' | 'BLISTER_PACK'>('MEDICATION')
  const [isPrnMedication, setIsPrnMedication] = React.useState(false)
  const [basicSearch, setBasicSearch] = React.useState(false)
  const [medicationName, setMedicationName] = React.useState('')
  const [dose, setDose] = React.useState('')
  const [startDate, setStartDate] = React.useState('')
  const [endDate, setEndDate] = React.useState('')
  const [routeId, setRouteId] = React.useState(SELECT_NONE)
  const [howAssisted, setHowAssisted] = React.useState(SELECT_NONE)
  const [isControlledMedication, setIsControlledMedication] = React.useState(false)
  const [isDecongestantMedication, setIsDecongestantMedication] = React.useState(false)
  const [timeCritical, setTimeCritical] = React.useState(false)
  const [timeToleranceMinutes, setTimeToleranceMinutes] = React.useState(30)
  const [medicationTypeId, setMedicationTypeId] = React.useState(SELECT_NONE)
  const [expiryDate, setExpiryDate] = React.useState('')
  const [reasonForMedication, setReasonForMedication] = React.useState('')
  const [medicationInstructions, setMedicationInstructions] = React.useState('')
  const [medicationNotes, setMedicationNotes] = React.useState('')
  const [schedulePattern, setSchedulePattern] = React.useState<SchedulePattern>('DAILY')
  const [frequencyIntervalDays, setFrequencyIntervalDays] = React.useState('1')
  const [selectedWeekdays, setSelectedWeekdays] = React.useState<WeekdayValue[]>(() =>
    defaultWeekdays(),
  )
  const [monthlyAnchorToStart, setMonthlyAnchorToStart] = React.useState(true)
  const [monthlyDayOfMonth, setMonthlyDayOfMonth] = React.useState('1')
  const [timeSlots, setTimeSlots] = React.useState<MedicationTimeSlot[]>(() =>
    timeSlotsFromRounds([]),
  )

  const [packSource, setPackSource] = React.useState<'NEW' | 'EXISTING'>('NEW')
  const [packName, setPackName] = React.useState('')
  const [existingPackId, setExistingPackId] = React.useState(SELECT_NONE)
  const [packItems, setPackItems] = React.useState<BlisterPackItemDraft[]>(() => [
    newPackItem(),
    newPackItem(),
  ])
  const isBlister = recordType === 'BLISTER_PACK'
  const { data: packs = [], isLoading: packsLoading } = useMedicationPacks(
    serviceUserId,
    open && isBlister,
  )

  const [formError, setFormError] = React.useState<string | null>(null)
  const formSaving =
    createMedication.isPending || createPack.isPending || addPackItemMutation.isPending

  function resetForm() {
    setRecordType('MEDICATION')
    setIsPrnMedication(false)
    setBasicSearch(false)
    setMedicationName('')
    setDose('')
    setStartDate('')
    setEndDate('')
    setRouteId(SELECT_NONE)
    setHowAssisted(SELECT_NONE)
    setIsControlledMedication(false)
    setIsDecongestantMedication(false)
    setMedicationTypeId(SELECT_NONE)
    setExpiryDate('')
    setReasonForMedication('')
    setMedicationInstructions('')
    setMedicationNotes('')
    setSchedulePattern('DAILY')
    setFrequencyIntervalDays('1')
    setSelectedWeekdays(defaultWeekdays())
    setMonthlyAnchorToStart(true)
    setMonthlyDayOfMonth('1')
    setTimeSlots(timeSlotsFromRounds(lookups?.rounds ?? []))
    setPackSource('NEW')
    setPackName('')
    setExistingPackId(SELECT_NONE)
    setPackItems([newPackItem(), newPackItem()])
    setFormError(null)
  }

  const timeSlotsSeededRef = React.useRef(false)

  React.useEffect(() => {
    if (!open) {
      timeSlotsSeededRef.current = false
      return
    }
    resetForm()
  }, [open])

  React.useEffect(() => {
    if (!open || timeSlotsSeededRef.current) return
    if (!lookups?.rounds?.length) return
    timeSlotsSeededRef.current = true
    setTimeSlots(timeSlotsFromRounds(lookups.rounds))
  }, [open, lookups?.rounds])

  const selectedPack = packs.find(p => p.id === existingPackId) ?? null
  const existingPackItems = selectedPack?.items ?? []

  const scheduleDaysOfWeek = React.useMemo(
    () => (schedulePattern === 'WEEKLY' ? selectedWeekdays : []),
    [schedulePattern, selectedWeekdays],
  )

  const previewPayload = React.useMemo((): MedicationSchedulePreviewPayload | null => {
    if (isBlister || !startDate.trim()) return null
    const schedules = buildSchedules()
    if (!isPrnMedication && schedules.length === 0) return null
    const interval = Math.max(1, parseInt(frequencyIntervalDays, 10) || 1)
    const monthlyDay = Math.min(31, Math.max(1, parseInt(monthlyDayOfMonth, 10) || 1))
    return {
      startDate: startDate.trim(),
      endDate: endDate.trim() || undefined,
      previewDays: endDate.trim() ? undefined : 30,
      medicationKind: isPrnMedication ? 'PRN' : 'REGULAR',
      schedulePattern: isPrnMedication ? undefined : schedulePattern,
      frequencyIntervalDays: isPrnMedication
        ? undefined
        : schedulePattern === 'DAILY'
          ? interval
          : 1,
      monthlyDayOfMonth:
        !isPrnMedication && schedulePattern === 'MONTHLY' && !monthlyAnchorToStart
          ? monthlyDay
          : undefined,
      monthlyAnchorToStartDate:
        !isPrnMedication && schedulePattern === 'MONTHLY' ? monthlyAnchorToStart : undefined,
      schedules: isPrnMedication ? [{ dueTime: '00:00' }] : schedules,
    }
  }, [
    isBlister,
    isPrnMedication,
    startDate,
    endDate,
    schedulePattern,
    frequencyIntervalDays,
    monthlyAnchorToStart,
    monthlyDayOfMonth,
    scheduleDaysOfWeek,
    timeSlots,
  ])

  const schedulePreviewQuery = useMedicationSchedulePreview(
    serviceUserId,
    previewPayload,
    open && !isBlister,
  )
  const schedulePreview = schedulePreviewQuery.data

  const usedRoundIds = React.useMemo(
    () => new Set(timeSlots.map(s => s.roundId).filter((id): id is string => Boolean(id))),
    [timeSlots],
  )

  function addTimeSlot() {
    const rounds = lookups?.rounds ?? []
    const nextRound = nextUnusedMedicationRound(rounds, usedRoundIds)
    setTimeSlots(prev => [...prev, nextRound ? slotFromRound(nextRound) : newTimeSlot()])
  }

  function removeTimeSlot(id: string) {
    setTimeSlots(prev => (prev.length <= 1 ? prev : prev.filter(s => s.id !== id)))
  }

  function updateTimeSlot(id: string, patch: Partial<MedicationTimeSlot>) {
    setTimeSlots(prev => prev.map(s => (s.id === id ? { ...s, ...patch } : s)))
  }

  function addPackItem() {
    setPackItems(prev => [...prev, newPackItem()])
  }

  function removePackItem(id: string) {
    setPackItems(prev => (prev.length <= 1 ? prev : prev.filter(p => p.id !== id)))
  }

  function updatePackItem(id: string, patch: Partial<BlisterPackItemDraft>) {
    setPackItems(prev => prev.map(p => (p.id === id ? { ...p, ...patch } : p)))
  }

  function buildSchedules() {
    const rounds = lookups?.rounds ?? []
    const defaultDose = dose.trim()
    const days = schedulePattern === 'WEEKLY' ? scheduleDaysOfWeek : undefined
    return timeSlots
      // A slot counts only when it has its own dose or a care plan action.
      // Slots left blank on both are treated as unused and excluded.
      .filter(s => s.dose.trim() !== '' || s.carePlanAction.trim() !== '')
      .map(s => {
        const dueTime = normalizeTimeInput(s.dueTime)
        const slotDose = s.dose.trim() || defaultDose
        return {
          dueTime,
          dose: slotDose || undefined,
          dueVisitName: s.carePlanAction.trim() || undefined,
          roundId: s.roundId ?? (dueTime ? matchRoundIdByTime(rounds, dueTime) : undefined),
          daysOfWeek: days,
        }
      })
      .filter(s => s.dueTime)
  }

  function toggleWeekday(day: WeekdayValue) {
    setSelectedWeekdays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day],
    )
  }

  function validateMarFields(): string | null {
    if (!startDate.trim()) return 'Start date on system is required.'
    if (!optionalId(routeId)) return 'Route administration is required.'
    if (!optionalId(medicationTypeId)) return 'Medication type is required.'
    if (!isPrnMedication && buildSchedules().length === 0) {
      return 'Add at least one administration time under "at times".'
    }
    if (!isPrnMedication && schedulePattern === 'WEEKLY' && selectedWeekdays.length === 0) {
      return 'Select at least one weekday for a weekly pattern.'
    }
    if (
      !isPrnMedication &&
      schedulePattern === 'MONTHLY' &&
      monthlyAnchorToStart &&
      !startDate.trim()
    ) {
      return 'Start date is required when monthly doses use the same day as the start date.'
    }
    return null
  }

  function sharedMedicationPayload(schedules: CreateServiceUserMedicationPayload['schedules']) {
    const howAssistedLabel =
      howAssisted !== SELECT_NONE
        ? HOW_ASSISTED_OPTIONS.includes(howAssisted as (typeof HOW_ASSISTED_OPTIONS)[number])
          ? howAssisted
          : howAssisted
        : undefined
    const activeSlots = schedules?.length ?? 0
    const interval = Math.max(1, parseInt(frequencyIntervalDays, 10) || 1)
    const monthlyDay = Math.min(31, Math.max(1, parseInt(monthlyDayOfMonth, 10) || 1))
    return {
      medicationKind: isPrnMedication ? ('PRN' as const) : ('REGULAR' as const),
      dose: dose.trim(),
      startDate: startDate.trim(),
      endDate: endDate.trim() || undefined,
      expiryDate: expiryDate.trim() || undefined,
      routeId: optionalId(routeId),
      medicationTypeId: optionalId(medicationTypeId),
      frequencyId: isPrnMedication
        ? undefined
        : resolveFrequencyIdForPattern(lookups?.frequencies ?? [], schedulePattern, activeSlots),
      schedulePattern: isPrnMedication ? undefined : schedulePattern,
      frequencyIntervalDays: isPrnMedication
        ? undefined
        : schedulePattern === 'DAILY'
          ? interval
          : 1,
      monthlyDayOfMonth:
        !isPrnMedication && schedulePattern === 'MONTHLY' && !monthlyAnchorToStart
          ? monthlyDay
          : undefined,
      monthlyAnchorToStartDate:
        !isPrnMedication && schedulePattern === 'MONTHLY' ? monthlyAnchorToStart : undefined,
      reasonForMedication: reasonForMedication.trim() || undefined,
      instructions: medicationInstructions.trim() || undefined,
      notes: medicationNotes.trim() || undefined,
      howAssisted: howAssistedLabel,
      isControlledMedication,
      isDecongestantMedication,
      timeCritical,
      timeToleranceMinutes,
      schedules,
    }
  }

  async function saveMedication() {
    const name = medicationName.trim()
    if (!name) {
      setFormError('Medication name is required.')
      toastError('Cannot save', 'Enter a medication name.')
      return
    }
    const marErr = validateMarFields()
    if (marErr) {
      setFormError(marErr)
      return
    }

    const schedules = isPrnMedication ? undefined : buildSchedules()
    setFormError(null)

    try {
      const res = await createMedication.mutateAsync({
        serviceUserId,
        body: {
          medicationName: name,
          ...sharedMedicationPayload(schedules),
        },
      })
      onOpenChange(false)
      resetForm()
      await onSaved()
      const count = res.schedules?.length ?? schedules?.length ?? 0
      toastSuccess(
        'Medication added',
        count > 1
          ? `Saved with ${count} administration times (one MAR row per time for carers).`
          : 'The medication list has been updated.',
      )
      if (
        medicationRequiresBodyMapFromLookupIds(lookups, medicationTypeId, routeId) &&
        res.id
      ) {
        setBodyMapPrompt({ medicationId: res.id, medicationName: name })
      }
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : 'Save failed')
      toastApiError(e, 'Save failed')
    }
  }

  async function saveBlisterPack() {
    const marErr = validateMarFields()
    if (marErr) {
      setFormError(marErr)
      return
    }

    let packId = ''
    let items: { medicationName: string; strength?: string }[] = []

    if (packSource === 'NEW') {
      const name = packName.trim()
      if (!name) {
        setFormError('Blister pack name is required.')
        return
      }
      items = packItems
        .map(p => ({ medicationName: p.medicationName.trim(), strength: p.strength.trim() || undefined }))
        .filter(p => p.medicationName)
      if (items.length === 0) {
        setFormError('Add at least one medication to the blister pack.')
        return
      }
    } else {
      if (!optionalId(existingPackId)) {
        setFormError('Select an existing blister pack.')
        return
      }
      packId = existingPackId
      items = existingPackItems.map(p => ({
        medicationName: p.medicationName,
        strength: p.strength ?? undefined,
      }))
      if (items.length === 0) {
        setFormError('The selected blister pack has no medications. Add items to the pack first.')
        return
      }
    }

    const schedules = buildSchedules()
    setFormError(null)

    try {
      if (packSource === 'NEW') {
        const pack = await createPack.mutateAsync({
          serviceUserId,
          body: {
            name: packName.trim(),
            startDate: startDate.trim() || undefined,
            endDate: endDate.trim() || undefined,
            description: medicationNotes.trim() || undefined,
          },
        })
        packId = pack.id
        for (let i = 0; i < items.length; i++) {
          const item = items[i]
          if (!item?.medicationName) continue
          await addPackItemMutation.mutateAsync({
            serviceUserId,
            packId,
            body: {
              ...item,
              medicationName: item.medicationName,
              sortOrder: i,
            },
          })
        }
      }

      let firstSiteMed: { id: string; name: string } | null = null
      for (const item of items) {
        const res = await createMedication.mutateAsync({
          serviceUserId,
          body: {
            medicationName: item.medicationName,
            strength: item.strength,
            medicationPackId: packId,
            ...sharedMedicationPayload(schedules),
          },
        })
        if (
          !firstSiteMed &&
          medicationRequiresBodyMapFromLookupIds(lookups, medicationTypeId, routeId) &&
          res.id
        ) {
          firstSiteMed = { id: res.id, name: item.medicationName }
        }
      }

      onOpenChange(false)
      resetForm()
      await onSaved()
      const slotCount = items.length * schedules.length
      toastSuccess(
        'Blister pack added',
        `${items.length} medication(s) linked to the pack, ${slotCount} MAR row(s) in total (${schedules.length} time(s) each).`,
      )
      if (firstSiteMed) {
        setBodyMapPrompt({
          medicationId: firstSiteMed.id,
          medicationName: firstSiteMed.name,
          blisterItemCount: items.length,
        })
      }
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : 'Save failed')
      toastApiError(e, 'Save failed')
    }
  }

  async function onSave() {
    if (recordType === 'BLISTER_PACK') await saveBlisterPack()
    else await saveMedication()
  }

  function applyOpenFdaAutofill(fields: MedicationOpenFdaAutofill) {
    setMedicationName(fields.medicationName)
    if (fields.reasonForMedication) setReasonForMedication(fields.reasonForMedication)
    if (fields.medicationTypeId) setMedicationTypeId(fields.medicationTypeId)
    if (fields.routeId) setRouteId(fields.routeId)
    if (fields.dose && !dose.trim()) setDose(fields.dose)
    if (fields.isControlledMedication) setIsControlledMedication(true)
  }

  const disabled = formSaving || lookupsLoading || !canSave

  function goToBodyMapSite(medicationId: string) {
    setBodyMapPrompt(null)
    void navigate({
      to: '/service-users/$serviceUserId/body-map',
      params: { serviceUserId },
      search: { linkMedicationId: medicationId },
    })
  }

  return (
    <>
    <Dialog
      open={Boolean(bodyMapPrompt)}
      onOpenChange={open => {
        if (!open) setBodyMapPrompt(null)
      }}
    >
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-blue-600" />
            Add body map site?
          </DialogTitle>
          <DialogDescription>
            {bodyMapPrompt?.blisterItemCount && bodyMapPrompt.blisterItemCount > 1
              ? `${bodyMapPrompt.blisterItemCount} medicines in this blister pack may need body map sites (cream, patch, etc.). `
              : null}
            {bodyMapPrompt?.medicationName} is a site-specific medicine. CQC expects the body
            location on the map linked to the MAR chart line
            {bodyMapPrompt?.blisterItemCount && bodyMapPrompt.blisterItemCount > 1
              ? ' — start with this line, then repeat for other pack items.'
              : '.'}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setBodyMapPrompt(null)}>
            Later
          </Button>
          <Button
            type="button"
            onClick={() => bodyMapPrompt && goToBodyMapSite(bodyMapPrompt.medicationId)}
          >
            Add body site now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" className="max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-teal-800 dark:text-teal-200">
            {isBlister ? 'Add blister pack' : 'Add medication'}
          </DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-5">
          {lookupsLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading lookups…
            </div>
          )}
          {lookupsError && (
            <p className="text-sm text-destructive" role="alert">
              {lookupsError}
            </p>
          )}
          {formError && <p className="text-sm text-destructive">{formError}</p>}

          <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
            <div className="space-y-1">
              <label className="text-sm font-medium">Select</label>
              <Select
                value={recordType}
                onValueChange={v => setRecordType(v as 'MEDICATION' | 'BLISTER_PACK')}
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MEDICATION">Medication</SelectItem>
                  <SelectItem value="BLISTER_PACK">Blister pack</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {isBlister && (
            <div className="space-y-4 rounded-lg border border-border bg-muted/20 p-4">
              <div className="flex flex-wrap gap-4">
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="pack-source"
                    checked={packSource === 'NEW'}
                    onChange={() => setPackSource('NEW')}
                    disabled={disabled}
                  />
                  New blister pack
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="pack-source"
                    checked={packSource === 'EXISTING'}
                    onChange={() => setPackSource('EXISTING')}
                    disabled={disabled}
                  />
                  Existing blister pack
                </label>
              </div>

              {packSource === 'NEW' ? (
                <>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">
                      Blister pack name <span className="text-destructive">*</span>
                    </label>
                    <Input
                      value={packName}
                      onChange={e => setPackName(e.target.value)}
                      placeholder="e.g. Morning blister pack"
                      disabled={disabled}
                    />
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">
                      Medications in pack <span className="text-destructive">*</span>
                    </p>
                    <ul className="space-y-2">
                      {packItems.map((item, index) => (
                        <li key={item.id} className="flex flex-wrap items-end gap-2">
                          <div className="min-w-[10rem] flex-1 space-y-1">
                            {index === 0 && (
                              <label className="text-xs text-muted-foreground">Name</label>
                            )}
                            <Input
                              value={item.medicationName}
                              onChange={e =>
                                updatePackItem(item.id, { medicationName: e.target.value })
                              }
                              placeholder="Medication name"
                              disabled={disabled}
                            />
                          </div>
                          <div className="min-w-[6rem] flex-1 space-y-1">
                            {index === 0 && (
                              <label className="text-xs text-muted-foreground">Strength</label>
                            )}
                            <Input
                              value={item.strength}
                              onChange={e => updatePackItem(item.id, { strength: e.target.value })}
                              placeholder="e.g. 5mg"
                              disabled={disabled}
                            />
                          </div>
                          <div className="flex gap-1 pb-0.5">
                            {index === packItems.length - 1 && (
                              <Button
                                type="button"
                                size="icon"
                                variant="outline"
                                className="h-9 w-9 shrink-0"
                                onClick={addPackItem}
                                disabled={disabled}
                                aria-label="Add pack medication"
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              type="button"
                              size="icon"
                              variant="outline"
                              className="h-9 w-9 shrink-0"
                              onClick={() => removePackItem(item.id)}
                              disabled={disabled || packItems.length <= 1}
                              aria-label="Remove pack medication"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              ) : (
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Blister pack <span className="text-destructive">*</span>
                  </label>
                  <Select
                    value={existingPackId}
                    onValueChange={setExistingPackId}
                    disabled={disabled || packsLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={packsLoading ? 'Loading…' : 'Select blister pack'} />
                    </SelectTrigger>
                    <SelectContent className="max-h-64">
                      <SelectItem value={SELECT_NONE}>—</SelectItem>
                      {packs.map(p => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} ({p.items.length} meds)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedPack && (
                    <ul className="rounded-md border border-border bg-card px-3 py-2 text-sm">
                      {existingPackItems.map(item => (
                        <li key={item.id} className="py-1 text-muted-foreground">
                          {item.medicationName}
                          {item.strength ? ` · ${item.strength}` : ''}
                        </li>
                      ))}
                    </ul>
                  )}
                  {!packsLoading && packs.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      No blister packs yet. Create a new pack above.
                    </p>
                  )}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Each medication in the pack is added to the MAR with the same route, dose, frequency, and
                administration times below (one row per med per time).
              </p>
            </div>
          )}

          <div className="grid gap-4 border-t border-border pt-4 sm:grid-cols-2">
            {!isBlister && (
              <MedicationNameSearchField
                medicationName={medicationName}
                onMedicationNameChange={setMedicationName}
                basicSearch={basicSearch}
                onBasicSearchChange={setBasicSearch}
                lookups={lookups}
                disabled={disabled}
                onAutofill={applyOpenFdaAutofill}
              />
            )}

            <div className="space-y-1">
              <label className="text-sm font-medium">
                Start date on system <span className="text-destructive">*</span>
              </label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} disabled={disabled} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">End date</label>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} disabled={disabled} />
            </div>

            <div className="space-y-1">
              <MedicationFieldLabelWithTooltip label="Dose" tooltip={DOSE_TOOLTIP} />
              <Input value={dose} onChange={e => setDose(e.target.value)} disabled={disabled} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">
                Route administration <span className="text-destructive">*</span>
              </label>
              <Select value={routeId} onValueChange={setRouteId} disabled={disabled || !lookups}>
                <SelectTrigger>
                  <SelectValue placeholder="Select route administration" />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  <SelectItem value={SELECT_NONE}>—</SelectItem>
                  {lookups?.routes.map(r => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <MedicationFieldLabelWithTooltip
                label="Controlled medication"
                tooltip={CONTROLLED_MEDICATION_TOOLTIP}
              />
              <NoYesToggle
                value={isControlledMedication}
                onChange={setIsControlledMedication}
                disabled={disabled}
                activeTone="success"
              />
            </div>
            <div className="space-y-1">
              <MedicationFieldLabelWithTooltip
                label="Decongestant medicine"
                tooltip={DECONGESTANT_MEDICATION_TOOLTIP}
              />
              <NoYesToggle
                value={isDecongestantMedication}
                onChange={setIsDecongestantMedication}
                disabled={disabled}
                activeTone="success"
              />
            </div>
            <TimeSensitiveMedicationFields
              timeCritical={timeCritical}
              timeToleranceMinutes={timeToleranceMinutes}
              disabled={disabled}
              onTimeCriticalChange={setTimeCritical}
              onToleranceChange={setTimeToleranceMinutes}
            />
            <div className="space-y-1">
              <label className="text-sm font-medium">
                How assisted
              </label>
              <Select value={howAssisted} onValueChange={setHowAssisted} disabled={disabled}>
                <SelectTrigger>
                  <SelectValue placeholder="Select how assisted" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SELECT_NONE}>—</SelectItem>
                  {HOW_ASSISTED_OPTIONS.map(o => (
                    <SelectItem key={o} value={o}>
                      {o}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">
                Medication type <span className="text-destructive">*</span>
              </label>
              <Select value={medicationTypeId} onValueChange={setMedicationTypeId} disabled={disabled || !lookups}>
                <SelectTrigger>
                  <SelectValue placeholder="Select medication type" />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  <SelectItem value={SELECT_NONE}>—</SelectItem>
                  {lookups?.types.map(t => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Expiry date</label>
              <Input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} disabled={disabled} />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-sm font-medium">Reason for medication</label>
              <p className="text-xs text-muted-foreground">Why this is prescribed. Shown to the carer.</p>
              <textarea
                value={reasonForMedication}
                onChange={e => setReasonForMedication(e.target.value)}
                rows={2}
                disabled={disabled}
                placeholder="e.g. High blood pressure"
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <label className="text-sm font-medium">Instructions</label>
              <p className="text-xs text-muted-foreground">How to give this medicine. Shown to the carer.</p>
              <textarea
                value={medicationInstructions}
                onChange={e => setMedicationInstructions(e.target.value)}
                rows={2}
                disabled={disabled}
                placeholder="e.g. Take with food in the morning"
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <label className="text-sm font-medium">Office notes</label>
              <p className="text-xs text-muted-foreground">Internal only. Not shown on the employee app.</p>
              <textarea
                value={medicationNotes}
                onChange={e => setMedicationNotes(e.target.value)}
                rows={2}
                disabled={disabled}
                placeholder="Office-only note…"
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
          </div>

          <div className="space-y-3 border-t border-border pt-4">
            <p className="text-sm font-medium">
              Frequency <span className="text-destructive">*</span>
            </p>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isPrnMedication}
                onChange={e => setIsPrnMedication(e.target.checked)}
                disabled={disabled}
              />
              PRN medication (as required — no fixed daily times)
            </label>

            {!isPrnMedication && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-end gap-3">
                <div className="min-w-[10rem] flex-1 space-y-1">
                  <label className="text-xs text-muted-foreground">Pattern</label>
                  <Select
                    value={schedulePattern}
                    onValueChange={v => setSchedulePattern(v as SchedulePattern)}
                    disabled={disabled}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SCHEDULE_PATTERN_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {schedulePattern === 'DAILY' && (
                  <div className="flex items-end gap-2">
                    <span className="pb-2 text-sm text-muted-foreground">Every</span>
                    <Input
                      type="number"
                      min={1}
                      max={365}
                      className="w-16"
                      value={frequencyIntervalDays}
                      onChange={e => setFrequencyIntervalDays(e.target.value)}
                      disabled={disabled}
                    />
                    <span className="pb-2 text-sm text-muted-foreground">day(s)</span>
                  </div>
                )}
              </div>

              {schedulePattern === 'WEEKLY' && (
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">On weekdays</label>
                  <div className="flex flex-wrap gap-1.5">
                    {WEEKDAY_OPTIONS.map(opt => {
                      const active = selectedWeekdays.includes(opt.value)
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          disabled={disabled}
                          onClick={() => toggleWeekday(opt.value)}
                          className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                            active
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-input bg-background text-foreground hover:bg-muted'
                          }`}
                        >
                          {opt.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {schedulePattern === 'MONTHLY' && (
                <div className="space-y-2 rounded-md border border-border bg-muted/30 p-3 text-sm">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="monthly-anchor"
                      checked={monthlyAnchorToStart}
                      onChange={() => setMonthlyAnchorToStart(true)}
                      disabled={disabled}
                    />
                    Same calendar day as start date
                  </label>
                  <label className="flex flex-wrap items-center gap-2">
                    <input
                      type="radio"
                      name="monthly-anchor"
                      checked={!monthlyAnchorToStart}
                      onChange={() => setMonthlyAnchorToStart(false)}
                      disabled={disabled}
                    />
                    Fixed day of month
                    {!monthlyAnchorToStart && (
                      <Input
                        type="number"
                        min={1}
                        max={31}
                        className="h-8 w-16"
                        value={monthlyDayOfMonth}
                        onChange={e => setMonthlyDayOfMonth(e.target.value)}
                        disabled={disabled}
                      />
                    )}
                  </label>
                  {monthlyAnchorToStart && !startDate.trim() && (
                    <p className="text-xs text-amber-700">Set a start date above to anchor monthly doses.</p>
                  )}
                </div>
              )}
            </div>
            )}

            {!isPrnMedication && (
            <div className="space-y-2">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="min-w-0 flex-1 text-sm text-muted-foreground">
                  at times: <span className="text-destructive">*</span>{' '}
                  <span className="text-xs">
                    Slots come from Settings → Time slots. A slot with no dose and no care
                    plan action is not counted, so you can leave unused slots blank instead of
                    removing them. Set a dose per slot when it differs from the medication dose above.
                  </span>
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="shrink-0"
                  onClick={addTimeSlot}
                  disabled={disabled}
                >
                  <Plus className="h-4 w-4" />
                  Add time
                </Button>
              </div>
              {lookupsLoading ? (
                <p className="text-xs text-muted-foreground">Loading time slots…</p>
              ) : (lookups?.rounds?.length ?? 0) === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No time slots configured. Add them under Settings → Time slots.
                </p>
              ) : null}
              <ul className="space-y-2">
                {timeSlots.map((slot, index) => (
                  <MedicationTimeSlotRow
                    key={slot.id}
                    slot={slot}
                    index={index}
                    rounds={lookups?.rounds ?? []}
                    usedRoundIds={usedRoundIds}
                    disabled={disabled}
                    dosePlaceholder={dose.trim() || 'e.g. 2 tablets'}
                    canRemove={timeSlots.length > 1}
                    onChange={patch => updateTimeSlot(slot.id, patch)}
                    onRemove={() => removeTimeSlot(slot.id)}
                  />
                ))}
              </ul>
            </div>

            )}

            {!isBlister && previewPayload && (
              <div
                className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm"
                aria-live="polite"
              >
                {schedulePreviewQuery.isFetching && !schedulePreview ? (
                  <span className="text-muted-foreground">Calculating schedule preview…</span>
                ) : schedulePreview ? (
                  <div className="space-y-1">
                    <p className="font-medium text-foreground">{schedulePreview.summaryLabel}</p>
                    <p className="text-xs text-muted-foreground">
                      {schedulePreview.from} to {schedulePreview.to} ({schedulePreview.dayCount}{' '}
                      days)
                    </p>
                    {schedulePreview.prnNote ? (
                      <p className="text-xs text-muted-foreground">{schedulePreview.prnNote}</p>
                    ) : schedulePreview.perSchedule.length > 0 ? (
                      <ul className="text-xs text-muted-foreground">
                        {schedulePreview.perSchedule.map(row => (
                          <li key={`${row.dueTime}-${row.timeSlotLabel}`}>
                            {row.timeSlotLabel} ({row.dueTime}): {row.dueSlotCount} slots
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ) : schedulePreviewQuery.isError ? (
                  <span className="text-destructive">Could not load schedule preview</span>
                ) : null}
              </div>
            )}
          </div>
        </DialogBody>
        <DialogFooter className="gap-2 sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={formSaving}>
            Cancel
          </Button>
          <Button
            type="button"
            className="bg-teal-700 text-white hover:bg-teal-800"
            disabled={disabled}
            onClick={() => void onSave()}
          >
            {formSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isBlister ? (
              'Save blister pack'
            ) : (
              'Save medication'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  )
}
