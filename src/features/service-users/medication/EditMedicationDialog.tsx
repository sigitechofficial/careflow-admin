import * as React from 'react'
import { Info, Loader2 } from 'lucide-react'
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
  const [instructions, setInstructions] = React.useState('')
  const [notes, setNotes] = React.useState('')
  const [isControlledMedication, setIsControlledMedication] = React.useState(false)
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
    setInstructions(medication.instructions ?? '')
    setNotes(medication.notes ?? '')
    setIsControlledMedication(medication.isControlledMedication)
    setFormError(null)
  }, [open, medication])

  const isPrn = medication?.medicationKind === 'PRN'
  const saving =
    updateMutation.isPending || statusMutation.isPending || deleteMutation.isPending
  const disabled = !canEdit || saving || lookupsLoading

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
    instructions: instructions.trim() || undefined,
    notes: notes.trim() || undefined,
    isControlledMedication,
  })

  async function saveDetails() {
    if (!medication) return
    if (!medicationName.trim()) {
      setFormError('Medication name is required.')
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
            Update medication details. Administration times are shown below; changing schedule
            pattern or times is not yet available in this dialog.
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
              <label className="flex items-center gap-1 text-sm font-medium">
                Dose <span className="text-destructive">*</span>
                <Info className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
              </label>
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
              <label className="text-sm font-medium">Controlled medication</label>
              <NoYesToggle
                value={isControlledMedication}
                onChange={setIsControlledMedication}
                disabled={disabled}
                activeTone="success"
              />
            </div>

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
              <textarea
                value={instructions}
                onChange={e => setInstructions(e.target.value)}
                rows={3}
                disabled={disabled}
                placeholder="Reason for medication…"
                className={MEDICATION_TEXTAREA_CLASS}
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <label className="text-sm font-medium">Medication notes</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
                disabled={disabled}
                placeholder="Any medication note…"
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
                Schedule pattern and MAR frequency code are set when the medication is added. Edit
                other fields here; changing times or pattern is not available in this dialog yet.
              </p>
            </div>
          )}

          <div className="space-y-4 rounded-lg border border-border bg-muted/20 p-4">
            <p className="text-sm font-medium text-foreground">Administration times</p>
            {isPrn ? (
              <p className="text-sm text-muted-foreground">PRN — as required (no fixed daily times).</p>
            ) : (medication.schedules?.length ?? 0) > 0 ? (
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                {medication.schedules!.map(s => (
                  <li key={s.id} className="rounded-md border border-border/80 bg-card px-3 py-2">
                    {scheduleSlotLabel(s)}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No administration times on file.</p>
            )}
            <p className="text-xs text-muted-foreground">
              To change administration times or pattern, add a new medication row or use schedule
              maintenance when available.
            </p>
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
