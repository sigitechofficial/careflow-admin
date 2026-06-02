import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { useBodyMapSiteMedications } from '@/features/service-users/body-map/hooks/useBodyMapSiteMedications'
import {
  isCreamLikeSubType,
  isPatchSubType,
  MAR_TYPE_TO_BODY_MAP_SUBTYPE,
} from '@/features/service-users/body-map/utils/body-map-medication-subtype'
import { resolveBodyMapMedicationSubType } from '@/features/service-users/utils/body-map-medication-eligibility'
import { patchMedicationSiteValidationErrors } from '@/features/service-users/body-map/utils/patch-safety'
import type { BodyMapEmollientFireRisk, BodyMapMedicationSitePayload } from '@/features/service-users/body-map/types'
import type { ServiceUserMedicationRow } from '@/features/service-users/api/service-users.api'
import { Input } from '@/shared/ui/input'
import { Textarea } from '@/shared/ui/form-field'

export type MedicationSiteWizardState = {
  serviceUserMedicationId: string
  consentGiven: boolean
  fireRiskEmollient: BodyMapEmollientFireRisk | ''
  amountOrThickness: string
  reasonForApplication: string
  outcomeNote: string
  oldPatchPresent: 'yes' | 'no' | ''
  oldPatchRemoved: boolean
  oldPatchRemovalAt: string
  oldPatchBodyPart: string
  oldPatchNotes: string
  disposalRecorded: boolean
  nextChangeDue: string
  siteRotationChecked: boolean
  secondStaffCheck: boolean
  siteRotationNotes: string
}

export const emptyMedicationSiteWizardState = (): MedicationSiteWizardState => ({
  serviceUserMedicationId: '',
  consentGiven: false,
  fireRiskEmollient: '',
  amountOrThickness: '',
  reasonForApplication: '',
  outcomeNote: '',
  oldPatchPresent: '',
  oldPatchRemoved: false,
  oldPatchRemovalAt: '',
  oldPatchBodyPart: '',
  oldPatchNotes: '',
  disposalRecorded: false,
  nextChangeDue: '',
  siteRotationChecked: false,
  secondStaffCheck: false,
  siteRotationNotes: '',
})

export function buildMedicationSitePayload(
  state: MedicationSiteWizardState,
  med: ServiceUserMedicationRow | undefined,
): BodyMapMedicationSitePayload {
  return {
    serviceUserMedicationId: state.serviceUserMedicationId,
    medicineNameSnapshot: med?.medicationName,
    strength: med?.strength ?? undefined,
    frequencyText: med?.frequencyText ?? med?.frequency?.name ?? undefined,
    consentGiven: state.consentGiven,
    fireRiskEmollient: state.fireRiskEmollient || undefined,
    amountOrThickness: state.amountOrThickness.trim() || undefined,
    reasonForApplication: state.reasonForApplication.trim() || undefined,
    outcomeNote: state.outcomeNote.trim() || undefined,
    oldPatchPresent: state.oldPatchPresent === 'yes' ? true : state.oldPatchPresent === 'no' ? false : undefined,
    oldPatchRemoved: state.oldPatchPresent === 'yes' ? state.oldPatchRemoved : undefined,
    oldPatchRemovalAt: state.oldPatchRemovalAt
      ? new Date(state.oldPatchRemovalAt).toISOString()
      : undefined,
    oldPatchBodyPart: state.oldPatchBodyPart.trim() || undefined,
    oldPatchNotes: state.oldPatchNotes.trim() || undefined,
    disposalRecorded: state.oldPatchPresent === 'yes' ? state.disposalRecorded : undefined,
    nextChangeDue: state.nextChangeDue ? new Date(state.nextChangeDue).toISOString() : undefined,
    siteRotationChecked: state.siteRotationChecked,
    secondStaffCheck: state.secondStaffCheck,
    siteRotationNotes: state.siteRotationNotes.trim() || undefined,
  }
}

export function medicationSiteWizardValid(subType: string, state: MedicationSiteWizardState): boolean {
  if (!state.serviceUserMedicationId) return false
  if (!state.consentGiven) return false
  if (isCreamLikeSubType(subType) && !state.fireRiskEmollient) return false
  if (isPatchSubType(subType)) {
    if (!state.oldPatchPresent) return false
    if (state.oldPatchPresent === 'yes') {
      if (
        !state.oldPatchRemoved ||
        !state.disposalRecorded ||
        !state.oldPatchRemovalAt.trim() ||
        !state.oldPatchBodyPart.trim()
      ) {
        return false
      }
    }
    if (state.oldPatchPresent === 'no' && !state.oldPatchNotes.trim()) return false
    if (!state.nextChangeDue) return false
    if (!state.siteRotationChecked) return false
  }
  return true
}

type Props = {
  serviceUserId: string
  subType: string
  onSubTypeChange: (subType: string) => void
  state: MedicationSiteWizardState
  onStateChange: (patch: Partial<MedicationSiteWizardState>) => void
  preselectedMedicationId?: string
  patchRotationWarnings?: string[]
}

export function MedicationSiteWizardFields({
  serviceUserId,
  subType,
  onSubTypeChange,
  state,
  onStateChange,
  preselectedMedicationId,
  patchRotationWarnings = [],
}: Props) {
  const patchErrors = React.useMemo(
    () => patchMedicationSiteValidationErrors(subType, undefined, state),
    [subType, state],
  )
  const { eligibleMedications, isLoading, isError } = useBodyMapSiteMedications(serviceUserId)

  React.useEffect(() => {
    if (!preselectedMedicationId || state.serviceUserMedicationId) return
    const med = eligibleMedications.find(m => m.id === preselectedMedicationId)
    if (med) applyMedication(med)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- preselect once when list loads
  }, [preselectedMedicationId, eligibleMedications.length])

  const selectedMed = eligibleMedications.find(m => m.id === state.serviceUserMedicationId)

  function applyMedication(med: ServiceUserMedicationRow) {
    const suggested = resolveBodyMapMedicationSubType(
      med.medicationType?.code,
      MAR_TYPE_TO_BODY_MAP_SUBTYPE,
    )
    if (suggested) onSubTypeChange(suggested)
    onStateChange({
      serviceUserMedicationId: med.id,
      fireRiskEmollient: isCreamLikeSubType(suggested ?? subType) ? 'NOT_ASSESSED' : '',
    })
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Link this marker to an active MAR chart line (cream, patch, injection, or topical). CQC
        requires medicine, time, location, and who applied it.
      </p>

      {isLoading ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading medications…
        </p>
      ) : null}
      {isError ? (
        <p className="text-sm text-destructive">Could not load medications for this service user.</p>
      ) : null}

      <label className="block text-sm font-medium">
        Chart medication (required)
        <select
          className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={state.serviceUserMedicationId}
          onChange={e => {
            const med = eligibleMedications.find(m => m.id === e.target.value)
            if (med) applyMedication(med)
            else onStateChange({ serviceUserMedicationId: e.target.value })
          }}
          required
        >
          <option value="">Select active medication…</option>
          {eligibleMedications.map(m => (
            <option key={m.id} value={m.id}>
              {m.medicationName}
              {m.strength ? ` · ${m.strength}` : ''}
              {m.route?.name ? ` · ${m.route.name}` : ''}
            </option>
          ))}
        </select>
      </label>

      {eligibleMedications.length === 0 && !isLoading ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          No active site-relevant medications on the MAR. Add a topical, patch, or injection medicine
          first, then return to link the body site.
        </p>
      ) : null}

      {selectedMed ? (
        <div className="rounded-md bg-blue-50 px-3 py-2 text-xs text-blue-950">
          <strong>{selectedMed.medicationName}</strong>
          {selectedMed.frequencyText ? ` · ${selectedMed.frequencyText}` : ''}
          {selectedMed.medicationType?.name ? ` · ${selectedMed.medicationType.name}` : ''}
        </div>
      ) : null}

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={state.consentGiven}
          onChange={e => onStateChange({ consentGiven: e.target.checked })}
        />
        Person consented to application at this site
      </label>

      {isCreamLikeSubType(subType) ? (
        <div className="space-y-3 rounded-lg border border-blue-200 bg-blue-50/50 p-3">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-blue-900">
            Cream / ointment / lotion (§9.1)
          </h4>
          <label className="block text-sm font-medium">
            Emollient fire risk (required)
            <select
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={state.fireRiskEmollient}
              onChange={e =>
                onStateChange({
                  fireRiskEmollient: e.target.value as BodyMapEmollientFireRisk | '',
                })
              }
            >
              <option value="">Select…</option>
              <option value="NOT_ASSESSED">Not yet assessed</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium — caution near flames</option>
              <option value="HIGH">High — strict fire safety</option>
              <option value="NOT_APPLICABLE">Not applicable</option>
            </select>
          </label>
          <label className="block text-sm font-medium">
            Amount / thickness
            <Input
              className="mt-1"
              value={state.amountOrThickness}
              onChange={e => onStateChange({ amountOrThickness: e.target.value })}
              placeholder="Thin layer, pea-sized, etc."
            />
          </label>
          <label className="block text-sm font-medium">
            Reason for application
            <Textarea
              className="mt-1"
              rows={2}
              value={state.reasonForApplication}
              onChange={e => onStateChange({ reasonForApplication: e.target.value })}
            />
          </label>
          <label className="block text-sm font-medium">
            Outcome note (optional)
            <Textarea
              className="mt-1"
              rows={2}
              value={state.outcomeNote}
              onChange={e => onStateChange({ outcomeNote: e.target.value })}
            />
          </label>
        </div>
      ) : null}

      {isPatchSubType(subType) ? (
        <div className="space-y-3 rounded-lg border border-indigo-200 bg-indigo-50/50 p-3">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-indigo-900">
            Patch site (§9.2 — old patch removal)
          </h4>
          <label className="block text-sm font-medium">
            Old patch present?
            <select
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={state.oldPatchPresent}
              onChange={e =>
                onStateChange({
                  oldPatchPresent: e.target.value as 'yes' | 'no' | '',
                })
              }
            >
              <option value="">Select…</option>
              <option value="yes">Yes</option>
              <option value="no">No / first application</option>
            </select>
          </label>
          {state.oldPatchPresent === 'yes' ? (
            <>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={state.oldPatchRemoved}
                  onChange={e => onStateChange({ oldPatchRemoved: e.target.checked })}
                />
                Old patch removed
              </label>
              <label className="block text-sm font-medium">
                Removal date & time
                <Input
                  className="mt-1"
                  type="datetime-local"
                  value={state.oldPatchRemovalAt}
                  onChange={e => onStateChange({ oldPatchRemovalAt: e.target.value })}
                />
              </label>
              <label className="block text-sm font-medium">
                Previous patch location (body part)
                <Input
                  className="mt-1"
                  value={state.oldPatchBodyPart}
                  onChange={e => onStateChange({ oldPatchBodyPart: e.target.value })}
                  placeholder="e.g. Left upper arm"
                />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={state.disposalRecorded}
                  onChange={e => onStateChange({ disposalRecorded: e.target.checked })}
                />
                Disposal of old patch recorded
              </label>
            </>
          ) : null}
          {state.oldPatchPresent === 'no' ? (
            <label className="block text-sm font-medium">
              Note — no old patch found / first application
              <Textarea
                className="mt-1"
                rows={2}
                value={state.oldPatchNotes}
                onChange={e => onStateChange({ oldPatchNotes: e.target.value })}
                placeholder="Why no old patch was located, or first application on file"
                required
              />
            </label>
          ) : null}
          <label className="block text-sm font-medium">
            Next patch change due
            <Input
              className="mt-1"
              type="datetime-local"
              value={state.nextChangeDue}
              onChange={e => onStateChange({ nextChangeDue: e.target.value })}
              required
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={state.siteRotationChecked}
              onChange={e => onStateChange({ siteRotationChecked: e.target.checked })}
            />
            Site rotation checked (not same as recent sites)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={state.secondStaffCheck}
              onChange={e => onStateChange({ secondStaffCheck: e.target.checked })}
            />
            Second staff check (if policy requires)
          </label>
          {patchRotationWarnings.length > 0 ? (
            <div
              className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-950"
              role="status"
            >
              <p className="font-semibold">Site rotation warning</p>
              <ul className="mt-1 list-disc pl-4">
                {patchRotationWarnings.map(w => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
              <p className="mt-1 text-amber-800">
                You can still save after confirming rotation above — CQC expects a different site
                when possible.
              </p>
            </div>
          ) : null}
          {patchErrors.length > 0 ? (
            <ul className="list-disc pl-4 text-xs text-red-700">
              {patchErrors.map(e => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {!isCreamLikeSubType(subType) && !isPatchSubType(subType) ? (
        <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Injection / spray site
          </h4>
          <label className="block text-sm font-medium">
            Site rotation / notes
            <Textarea
              className="mt-1"
              rows={2}
              value={state.siteRotationNotes}
              onChange={e => onStateChange({ siteRotationNotes: e.target.value })}
              placeholder="Rotation from last site, technique notes"
            />
          </label>
        </div>
      ) : null}
    </div>
  )
}
