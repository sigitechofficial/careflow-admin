import * as React from 'react'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import type {
  MedicationRecordStatusValue,
  ServiceUserMedicationRow,
  UpdateServiceUserMedicationPayload,
} from '@/features/service-users/api/service-users.api'
import {
  useDeleteServiceUserMedication,
  useMedicationLookups,
  usePatchServiceUserMedicationStatus,
  useUpdateServiceUserMedication,
} from '@/features/service-users/hooks/useServiceUserMedicationMutations'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
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
import { Input } from '@/shared/ui/input'
import {
  EMPTY_PRN_LIMITS,
  PrnLimitFields,
  prnLimitValuesFromMedication,
  prnLimitsPayload,
  validatePrnLimits,
  type PrnLimitValues,
} from '@/features/service-users/medication/PrnLimitFields'
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
import {
  HOW_ASSISTED_OPTIONS,
  MEDICATION_SELECT_NONE,
  MEDICATION_TEXTAREA_CLASS,
  howAssistedToSelectValue,
} from '@/features/service-users/medication/medication-dialog-shared'
import { MedicationScheduleFrequencyReadOnly } from '@/features/service-users/medication/MedicationScheduleFrequencyReadOnly'
import {
  medicationEndSourceLabel,
  medicationEndSourceWhen,
} from '@/features/service-users/medication/medication-status-end-display'
import { formatRoundLabel } from '@/features/service-users/medication/medication-time-slots'
import { medicationRequiresBodyMapFromRow } from '@/features/service-users/medication/medication-body-map-eligibility'
import { MedicationBodyMapSiteBadge } from '@/features/service-users/medication/MedicationBodyMapSiteBadge'
import { useMedicationBodyMapSiteIndex } from '@/features/service-users/body-map/hooks/useMedicationBodyMapSiteIndex'

function dateInputValue(iso: string | null | undefined): string {
  if (!iso) return ''
  return iso.slice(0, 10)
}

function scheduleSlotLabel(s: {
  dueTime: string | null
  dueVisitName?: string | null
  dose?: string | null
}): string {
  const round =
    s.dueVisitName?.trim() ||
    (s.dueTime ? formatRoundLabel(s.dueTime.slice(0, 5)) : null) ||
    'Administration'
  const time = s.dueTime?.trim()
  const parts = [round, time, s.dose?.trim()].filter(Boolean)
  return parts.join(' · ')
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  serviceUserId: string
  medication: ServiceUserMedicationRow | null
  canEdit: boolean
  onSaved: () => void | Promise<void>
}

export function EditMedicationDialog({
  open,
  onOpenChange,
  serviceUserId,
  medication,
  canEdit,
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

  const { byMedicationId } = useMedicationBodyMapSiteIndex(serviceUserId, open && Boolean(medication))
  const updateMutation = useUpdateServiceUserMedication()
  const statusMutation = usePatchServiceUserMedicationStatus()
  const deleteMutation = useDeleteServiceUserMedication()

  const [medicationName, setMedicationName] = React.useState('')
  const [dose, setDose] = React.useState('')
  const [strength, setStrength] = React.useState('')
  const [startDate, setStartDate] = React.useState('')
  const [endDate, setEndDate] = React.useState('')
  const [expiryDate, setExpiryDate] = React.useState('')
  const [routeId, setRouteId] = React.useState(MEDICATION_SELECT_NONE)
  const [medicationTypeId, setMedicationTypeId] = React.useState(MEDICATION_SELECT_NONE)
  const [howAssisted, setHowAssisted] = React.useState(MEDICATION_SELECT_NONE)
  const [reasonForMedication, setReasonForMedication] = React.useState('')
  const [instructions, setInstructions] = React.useState('')
  const [notes, setNotes] = React.useState('')
  const [isControlledMedication, setIsControlledMedication] = React.useState(false)
  const [isDecongestantMedication, setIsDecongestantMedication] = React.useState(false)
  const [timeCritical, setTimeCritical] = React.useState(false)
  const [timeToleranceMinutes, setTimeToleranceMinutes] = React.useState(30)
  const [isPrnMedication, setIsPrnMedication] = React.useState(false)
  const [prnLimits, setPrnLimits] = React.useState<PrnLimitValues>(EMPTY_PRN_LIMITS)
  const [times, setTimes] = React.useState<string[]>([])
  const [formError, setFormError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!open || !medication) return
    setMedicationName(medication.medicationName)
    setDose(medication.dose ?? '')
    setStrength(medication.strength ?? '')
    setStartDate(dateInputValue(medication.startDate))
    setEndDate(dateInputValue(medication.endDate))
    setExpiryDate(dateInputValue(medication.expiryDate))
    setRouteId(medication.route?.id ?? MEDICATION_SELECT_NONE)
    setMedicationTypeId(medication.medicationType?.id ?? MEDICATION_SELECT_NONE)
    setHowAssisted(howAssistedToSelectValue(medication.howAssisted))
    setReasonForMedication(medication.reasonForMedication ?? '')
    setInstructions(medication.instructions ?? '')
    setNotes(medication.notes ?? '')
    setIsControlledMedication(medication.isControlledMedication)
    setIsDecongestantMedication(medication.isDecongestantMedication ?? false)
    setTimeCritical(Boolean(medication.timeCritical))
    setTimeToleranceMinutes(medication.timeToleranceMinutes ?? 30)
    setIsPrnMedication(medication.medicationKind === 'PRN')
    setPrnLimits(prnLimitValuesFromMedication(medication))
    const initialTimes = [
      ...new Set(
        (medication.schedules ?? [])
          .map(s => (s.dueTime ?? '').slice(0, 5))
          .filter(Boolean),
      ),
    ].sort()
    setTimes(initialTimes)
    setFormError(null)
  }, [open, medication])

  const wasPrn = medication?.medicationKind === 'PRN'
  const isPrn = isPrnMedication
  const inBlisterPack = Boolean(medication?.medicationPack?.id)
  const saving =
    updateMutation.isPending || statusMutation.isPending || deleteMutation.isPending
  const disabled = !canEdit || saving || lookupsLoading

  const cleanTimes = React.useMemo(
    () => [...new Set(times.map(t => t.trim()).filter(Boolean))].sort(),
    [times],
  )

  const buildBody = (): UpdateServiceUserMedicationPayload => ({
    medicationName: medicationName.trim(),
    dose: dose.trim() || undefined,
    strength: strength.trim() || undefined,
    startDate: startDate.trim() || undefined,
    endDate: endDate.trim() || undefined,
    expiryDate: expiryDate.trim() || undefined,
    routeId: routeId !== MEDICATION_SELECT_NONE ? routeId : undefined,
    medicationTypeId: medicationTypeId !== MEDICATION_SELECT_NONE ? medicationTypeId : undefined,
    howAssisted: howAssisted !== MEDICATION_SELECT_NONE ? howAssisted : undefined,
    reasonForMedication: reasonForMedication.trim() || undefined,
    instructions: instructions.trim() || undefined,
    notes: notes.trim() || undefined,
    isControlledMedication,
    isDecongestantMedication,
    timeCritical,
    timeToleranceMinutes,
    medicationKind: isPrnMedication ? 'PRN' : 'REGULAR',
    ...(isPrnMedication ? prnLimitsPayload(prnLimits) : {}),
    // Timed medicines send their administration times (backend replaces existing).
    // PRN sends none — the backend clears any times on conversion.
    ...(isPrnMedication ? {} : { schedules: cleanTimes.map(dueTime => ({ dueTime })) }),
  })

  async function saveDetails() {
    if (!medication) return
    if (!medicationName.trim()) {
      setFormError('Medication name is required.')
      return
    }
    if (isPrnMedication) {
      const prnError = validatePrnLimits(prnLimits)
      if (prnError) {
        setFormError(prnError)
        return
      }
    }
    if (!isPrnMedication && cleanTimes.length === 0) {
      setFormError('Add at least one administration time, or mark this medication as PRN.')
      return
    }
    setFormError(null)
    try {
      await updateMutation.mutateAsync({
        serviceUserId,
        medicationId: medication.id,
        body: buildBody(),
      })
      toastSuccess('Medication updated')
      onOpenChange(false)
      await onSaved()
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : 'Save failed')
      toastApiError(e, 'Could not update medication')
    }
  }

  async function setStatus(status: MedicationRecordStatusValue) {
    if (!medication) return
    try {
      await statusMutation.mutateAsync({ serviceUserId, medicationId: medication.id, status })
      toastSuccess(
        status === 'ENDED'
          ? 'Medication stopped'
          : status === 'PAUSED'
            ? 'Medication paused'
            : status === 'CANCELLED'
              ? 'Medication cancelled'
              : 'Medication reactivated',
      )
      onOpenChange(false)
      await onSaved()
    } catch (e) {
      toastApiError(e, 'Could not update status')
    }
  }

  async function archiveMedication() {
    if (!medication) return
    if (
      !window.confirm(
        `Archive "${medication.medicationName}"? It will be hidden from the MAR and medication lists. You can restore it later from Archived medications on the Records tab.`,
      )
    ) {
      return
    }
    try {
      await deleteMutation.mutateAsync({ serviceUserId, medicationId: medication.id })
      toastSuccess('Medication archived')
      onOpenChange(false)
      await onSaved()
    } catch (e) {
      toastApiError(e, 'Could not archive medication')
    }
  }

  if (!medication) return null

  const requiresBodyMap = medicationRequiresBodyMapFromRow(medication)
  const siteEntry = byMedicationId.get(medication.id)
  const meta = [medication.dose, medication.strength].filter(Boolean).join(' · ')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" className="max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-teal-800 dark:text-teal-200">Edit medication</DialogTitle>
          <DialogDescription>
            Update medication details, including the daily administration times and PRN status.
            Changing the schedule pattern is not yet available in this dialog.
          </DialogDescription>
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
          {formError && (
            <p className="text-sm text-destructive" role="alert">
              {formError}
            </p>
          )}

          <div className="rounded-lg border border-border bg-muted/20 px-4 py-3 text-sm">
            <div className="font-semibold text-foreground">{medication.medicationName}</div>
            {(meta || medication.medicationPack?.name) && (
              <div className="text-muted-foreground">
                {[meta, medication.medicationPack?.name].filter(Boolean).join(' · ')}
              </div>
            )}
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              {isPrn && (
                <span className="rounded bg-sky-500/15 px-2 py-0.5 font-medium text-sky-900 dark:text-sky-100">
                  PRN
                </span>
              )}
              <span className="rounded bg-muted px-2 py-0.5 font-medium">{medication.status}</span>
              {medication.frequency?.name && (
                <span className="text-muted-foreground">{medication.frequency.name}</span>
              )}
              {requiresBodyMap ? (
                <MedicationBodyMapSiteBadge
                  serviceUserId={serviceUserId}
                  medicationId={medication.id}
                  siteEntry={siteEntry}
                  requiresSite
                />
              ) : null}
            </div>
            {medicationEndSourceLabel(medication) && (
              <p className="mt-2 text-xs text-muted-foreground">
                {medicationEndSourceLabel(medication)}
                {medicationEndSourceWhen(medication)
                  ? ` · ${medicationEndSourceWhen(medication)}`
                  : ''}
              </p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-2">
              <label className="text-sm font-medium">
                Medication name <span className="text-destructive">*</span>
              </label>
              <Input
                value={medicationName}
                onChange={e => setMedicationName(e.target.value)}
                disabled={disabled}
              />
            </div>

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
              <Input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                disabled={disabled}
              />
            </div>

            <div className="space-y-1">
              <MedicationFieldLabelWithTooltip label="Dose" tooltip={DOSE_TOOLTIP} />
              <Input value={dose} onChange={e => setDose(e.target.value)} disabled={disabled} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Strength</label>
              <Input
                value={strength}
                onChange={e => setStrength(e.target.value)}
                disabled={disabled}
              />
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
                  <SelectItem value={MEDICATION_SELECT_NONE}>—</SelectItem>
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
                  <SelectItem value={MEDICATION_SELECT_NONE}>—</SelectItem>
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
                  <SelectItem value={MEDICATION_SELECT_NONE}>—</SelectItem>
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
              <Input
                type="date"
                value={expiryDate}
                onChange={e => setExpiryDate(e.target.value)}
                disabled={disabled}
              />
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
                className={MEDICATION_TEXTAREA_CLASS}
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <label className="text-sm font-medium">Instructions</label>
              <p className="text-xs text-muted-foreground">How to give this medicine. Shown to the carer.</p>
              <textarea
                value={instructions}
                onChange={e => setInstructions(e.target.value)}
                rows={2}
                disabled={disabled}
                placeholder="e.g. Take with food in the morning"
                className={MEDICATION_TEXTAREA_CLASS}
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <label className="text-sm font-medium">Office notes</label>
              <p className="text-xs text-muted-foreground">Internal only. Not shown on the employee app.</p>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={2}
                disabled={disabled}
                placeholder="Office-only note…"
                className={MEDICATION_TEXTAREA_CLASS}
              />
            </div>
          </div>

          {!isPrn && (
            <div className="space-y-3 border-t border-border pt-4">
              <p className="text-sm font-medium">Frequency</p>
              <MedicationScheduleFrequencyReadOnly
                schedulePattern={medication.schedulePattern}
                frequencyIntervalDays={medication.frequencyIntervalDays}
                monthlyDayOfMonth={medication.monthlyDayOfMonth}
                monthlyAnchorToStartDate={medication.monthlyAnchorToStartDate}
                startDate={medication.startDate}
                schedules={medication.schedules}
                frequencyName={medication.frequency?.name}
                frequencyText={medication.frequencyText}
              />
              <p className="text-xs text-muted-foreground">
                Schedule pattern and MAR frequency code are set when the medication is added. You can
                edit the daily administration times below; changing the pattern is not available here.
              </p>
            </div>
          )}

          <div className="space-y-4 rounded-lg border border-border bg-muted/20 p-4">
            <p className="text-sm font-medium text-foreground">Administration times</p>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isPrnMedication}
                onChange={e => setIsPrnMedication(e.target.checked)}
                disabled={disabled || inBlisterPack}
              />
              PRN medication (as required — no fixed daily times)
            </label>
            {inBlisterPack ? (
              <p className="text-xs text-muted-foreground">
                Blister pack medicines cannot be PRN. Remove it from the pack first.
              </p>
            ) : isPrnMedication && !wasPrn ? (
              <p className="text-xs text-muted-foreground">
                Save will remove the fixed times below. It will show on the carer app under PRN · as
                required.
              </p>
            ) : !isPrnMedication && wasPrn ? (
              <p className="text-xs text-muted-foreground">
                Add the daily administration times below to convert this PRN line back to a timed dose.
              </p>
            ) : null}
            {isPrn ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  PRN — as required (no fixed daily times).
                </p>
                <PrnLimitFields values={prnLimits} onChange={setPrnLimits} />
              </div>
            ) : (
              <div className="space-y-2">
                {times.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No administration times yet — add one below.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {times.map((t, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <Input
                          type="time"
                          value={t}
                          onChange={e =>
                            setTimes(prev => prev.map((v, i) => (i === idx ? e.target.value : v)))
                          }
                          disabled={disabled}
                          className="w-36"
                          aria-label={`Administration time ${idx + 1}`}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 shrink-0 p-0 text-destructive hover:text-destructive"
                          aria-label="Remove time"
                          disabled={disabled}
                          onClick={() => setTimes(prev => prev.filter((_, i) => i !== idx))}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  disabled={disabled}
                  onClick={() => setTimes(prev => [...prev, ''])}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add time
                </Button>
                <p className="text-xs text-muted-foreground">
                  Set each daily administration time (24-hour). Saving replaces this medicine’s
                  current times.
                </p>
              </div>
            )}
          </div>

          {canEdit && (
            <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-4">
              <p className="text-sm font-medium text-foreground">Workflow</p>
              <p className="text-xs text-muted-foreground">
                Pause, stop, or archive without deleting administration history on the MAR.
              </p>
              <div className="flex flex-wrap gap-2">
                {medication.status !== 'ACTIVE' && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={disabled}
                    onClick={() => void setStatus('ACTIVE')}
                  >
                    Reactivate
                  </Button>
                )}
                {medication.status === 'ACTIVE' && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={disabled}
                    onClick={() => void setStatus('PAUSED')}
                  >
                    Pause
                  </Button>
                )}
                {medication.status !== 'ENDED' && medication.status !== 'CANCELLED' && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={disabled}
                    onClick={() => void setStatus('ENDED')}
                  >
                    Stop (end today)
                  </Button>
                )}
                {medication.status !== 'CANCELLED' && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={disabled}
                    onClick={() => void setStatus('CANCELLED')}
                  >
                    Cancel prescription
                  </Button>
                )}
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  disabled={disabled}
                  onClick={() => void archiveMedication()}
                >
                  Archive / remove
                </Button>
              </div>
            </div>
          )}
        </DialogBody>

        <DialogFooter className="gap-2 sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          {canEdit && (
            <Button
              type="button"
              className="bg-teal-700 text-white hover:bg-teal-800"
              disabled={disabled}
              onClick={() => void saveDetails()}
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                'Save changes'
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
