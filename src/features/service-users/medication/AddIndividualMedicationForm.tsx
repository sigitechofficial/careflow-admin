import * as React from 'react'
import { Loader2, Plus } from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import type { CreateServiceUserMedicationPayload, ServiceUserMedicationRow } from '@/features/service-users/types'
import {
  useCreateServiceUserMedication,
  useMedicationLookups,
} from '@/features/service-users/hooks/useServiceUserMedicationMutations'
import { useMedicationSchedulePreview } from '@/features/service-users/hooks/useMedicationSchedulePreview'
import type { MedicationSchedulePreviewPayload } from '@/features/service-users/api/medication-schedule-preview.api'
import { toastApiError, toastError, toastSuccess } from '@/shared/lib/toast'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { MedicationFieldLabelWithTooltip } from '@/features/service-users/medication/MedicationFieldLabelWithTooltip'
import {
  EMPTY_PRN_LIMITS,
  PrnLimitFields,
  prnLimitsPayload,
  validatePrnLimits,
  type PrnLimitValues,
} from '@/features/service-users/medication/PrnLimitFields'
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
  MedicationNameSearchField,
  type MedicationOpenFdaAutofill,
} from '@/features/service-users/medication/MedicationNameSearchField'
import {
  defaultWeekdays,
  resolveFrequencyIdForPattern,
  SCHEDULE_PATTERN_OPTIONS,
  WEEKDAY_OPTIONS,
  type SchedulePattern,
  type WeekdayValue,
} from '@/features/service-users/medication/medication-schedule-pattern'

const SELECT_NONE = '__none__'

const HOW_ASSISTED_OPTIONS = [
  'Self',
  'Prompting',
  'Supervision',
  'Full assistance',
  'Not applicable',
] as const

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

export type AddIndividualMedicationFormProps = {
  serviceUserId: string
  enabled?: boolean
  canSave?: boolean
  defaultStartDate?: string
  /** When false, parent provides submit via form attribute on external button */
  showSaveButton?: boolean
  saveLabel?: string
  formId?: string
  onSaved: (medication: ServiceUserMedicationRow) => void | Promise<void>
}

export function AddIndividualMedicationForm({
  serviceUserId,
  enabled = true,
  canSave = true,
  defaultStartDate = '',
  showSaveButton = true,
  saveLabel = 'Save medication',
  formId = 'add-individual-medication-form',
  onSaved,
}: AddIndividualMedicationFormProps) {
  const {
    data: lookups,
    isLoading: lookupsLoading,
    error: lookupsQueryError,
  } = useMedicationLookups(enabled)
  const lookupsError =
    lookupsQueryError instanceof ApiError
      ? lookupsQueryError.message
      : lookupsQueryError
        ? 'Failed to load lookups'
        : null

  const createMedication = useCreateServiceUserMedication()

  const [isPrnMedication, setIsPrnMedication] = React.useState(false)
  const [prnLimits, setPrnLimits] = React.useState<PrnLimitValues>(EMPTY_PRN_LIMITS)
  const [basicSearch, setBasicSearch] = React.useState(false)
  const [medicationName, setMedicationName] = React.useState('')
  const [dose, setDose] = React.useState('')
  const [startDate, setStartDate] = React.useState(defaultStartDate)
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
  const [formError, setFormError] = React.useState<string | null>(null)

  const formSaving = createMedication.isPending
  const disabled = formSaving || lookupsLoading || !canSave

  function applyOpenFdaAutofill(fields: MedicationOpenFdaAutofill) {
    setMedicationName(fields.medicationName)
    if (fields.reasonForMedication) setReasonForMedication(fields.reasonForMedication)
    if (fields.medicationTypeId) setMedicationTypeId(fields.medicationTypeId)
    if (fields.routeId) setRouteId(fields.routeId)
    if (fields.dose && !dose.trim()) {
      setDose(fields.dose)
      setTimeSlots(prev => {
        const idx = prev.findIndex(s => !s.dose.trim())
        if (idx < 0) return prev
        return prev.map((s, i) => (i === idx ? { ...s, dose: fields.dose! } : s))
      })
    }
    if (fields.isControlledMedication) setIsControlledMedication(true)
  }

  const timeSlotsSeededRef = React.useRef(false)

  React.useEffect(() => {
    if (!enabled) {
      timeSlotsSeededRef.current = false
      return
    }
    setStartDate(prev => (prev || defaultStartDate ? prev : defaultStartDate))
  }, [enabled, defaultStartDate])

  React.useEffect(() => {
    if (!enabled || timeSlotsSeededRef.current) return
    if (!lookups?.rounds?.length) return
    timeSlotsSeededRef.current = true
    setTimeSlots(timeSlotsFromRounds(lookups.rounds))
  }, [enabled, lookups?.rounds])

  const scheduleDaysOfWeek = React.useMemo(
    () => (schedulePattern === 'WEEKLY' ? selectedWeekdays : []),
    [schedulePattern, selectedWeekdays],
  )

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

  const previewPayload = React.useMemo((): MedicationSchedulePreviewPayload | null => {
    if (!startDate.trim()) return null
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
    isPrnMedication,
    startDate,
    endDate,
    schedulePattern,
    frequencyIntervalDays,
    monthlyAnchorToStart,
    monthlyDayOfMonth,
    scheduleDaysOfWeek,
    timeSlots,
    dose,
    lookups?.rounds,
  ])

  const schedulePreviewQuery = useMedicationSchedulePreview(
    serviceUserId,
    previewPayload,
    enabled,
  )
  const schedulePreview = schedulePreviewQuery.data

  const marFrequencyLabel = React.useMemo(() => {
    const frequencies = lookups?.frequencies ?? []
    if (isPrnMedication) {
      return frequencies.find(f => f.code === 'AS_REQUIRED')?.name ?? 'As required'
    }
    const timesPerDay = timeSlots.filter(s => normalizeTimeInput(s.dueTime)).length
    const id = resolveFrequencyIdForPattern(frequencies, schedulePattern, timesPerDay)
    return frequencies.find(f => f.id === id)?.name ?? null
  }, [isPrnMedication, lookups?.frequencies, schedulePattern, timeSlots])

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

  function toggleWeekday(day: WeekdayValue) {
    setSelectedWeekdays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day],
    )
  }

  function validateMarFields(): string | null {
    if (!startDate.trim()) return 'Start date on system is required.'
    if (!optionalId(routeId)) return 'Route administration is required.'
    if (!optionalId(medicationTypeId)) return 'Medication type is required.'
    if (isPrnMedication) {
      const prnError = validatePrnLimits(prnLimits)
      if (prnError) return prnError
    }
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
      dose: isPrnMedication
        ? dose.trim()
        : (schedules?.find(s => s.dose?.trim())?.dose?.trim() ?? dose.trim()),
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
      ...(isPrnMedication ? prnLimitsPayload(prnLimits) : {}),
      schedules,
    }
  }

  function resetForm() {
    setIsPrnMedication(false)
    setPrnLimits(EMPTY_PRN_LIMITS)
    setBasicSearch(false)
    setMedicationName('')
    setDose('')
    setStartDate(defaultStartDate)
    setEndDate('')
    setRouteId(SELECT_NONE)
    setHowAssisted(SELECT_NONE)
    setIsControlledMedication(false)
    setIsDecongestantMedication(false)
    setTimeCritical(false)
    setTimeToleranceMinutes(30)
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
    setFormError(null)
    timeSlotsSeededRef.current = Boolean(lookups?.rounds?.length)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
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
      resetForm()
      await onSaved(res)
      const count = res.schedules?.length ?? schedules?.length ?? 0
      toastSuccess(
        'Medication added',
        count > 1
          ? `Saved with ${count} administration times (one MAR row per time for carers).`
          : 'The medication list has been updated.',
      )
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Save failed')
      toastApiError(err, 'Save failed')
    }
  }

  return (
    <form id={formId} onSubmit={e => void handleSubmit(e)} className="space-y-5">
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

      <div className="grid gap-4 sm:grid-cols-2">
        <MedicationNameSearchField
          medicationName={medicationName}
          onMedicationNameChange={setMedicationName}
          basicSearch={basicSearch}
          onBasicSearchChange={setBasicSearch}
          lookups={lookups}
          disabled={disabled}
          onAutofill={applyOpenFdaAutofill}
        />

        <div className="space-y-1">
          <label className="text-sm font-medium">
            Start date on system <span className="text-destructive">*</span>
          </label>
          <Input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            disabled={disabled}
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">End date</label>
          <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} disabled={disabled} />
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
          <label className="text-sm font-medium">How assisted</label>
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
          <Select
            value={medicationTypeId}
            onValueChange={setMedicationTypeId}
            disabled={disabled || !lookups}
          >
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

        {isPrnMedication && (
          <div className="space-y-1">
            <MedicationFieldLabelWithTooltip label="Dose" tooltip={DOSE_TOOLTIP} />
            <Input value={dose} onChange={e => setDose(e.target.value)} disabled={disabled} />
          </div>
        )}
        {isPrnMedication && (
          <PrnLimitFields values={prnLimits} onChange={setPrnLimits} disabled={disabled} />
        )}

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
                    name={`${formId}-monthly-anchor`}
                    checked={monthlyAnchorToStart}
                    onChange={() => setMonthlyAnchorToStart(true)}
                    disabled={disabled}
                  />
                  Same calendar day as start date
                </label>
                <label className="flex flex-wrap items-center gap-2">
                  <input
                    type="radio"
                    name={`${formId}-monthly-anchor`}
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

            {marFrequencyLabel && (
              <p className="text-xs text-muted-foreground">
                MAR frequency:{' '}
                <span className="font-medium text-foreground">{marFrequencyLabel}</span>
              </p>
            )}
          </div>
        )}

        {!isPrnMedication && (
          <div className="space-y-2">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="min-w-0 flex-1 text-sm text-muted-foreground">
                at times: <span className="text-destructive">*</span>{' '}
                <span className="text-xs">
                  Slots come from Settings → Time slots. A slot with no dose and no care plan
                  action is not counted, so you can leave unused slots blank instead of removing
                  them. Enter the dose on each slot you use (e.g. Morning, Evening).
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
                  dosePlaceholder="No of tablets"
                  canRemove={timeSlots.length > 1}
                  onChange={patch => updateTimeSlot(slot.id, patch)}
                  onRemove={() => removeTimeSlot(slot.id)}
                />
              ))}
            </ul>
          </div>
        )}

        {previewPayload && (
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
                  {schedulePreview.from} to {schedulePreview.to} ({schedulePreview.dayCount} days)
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

      {showSaveButton && (
        <Button
          type="submit"
          size="sm"
          className="bg-teal-700 text-white hover:bg-teal-800"
          disabled={disabled}
        >
          {formSaving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
          {saveLabel}
        </Button>
      )}
    </form>
  )
}
