import type { BodyMapMedicationSitePayload } from '@/features/service-users/body-map/types'
import { isPatchSubType } from '@/features/service-users/body-map/utils/body-map-medication-subtype'

export function patchMedicationSiteValidationErrors(
  subType: string,
  payload: BodyMapMedicationSitePayload | undefined,
  wizard?: {
    oldPatchPresent: '' | 'yes' | 'no'
    oldPatchRemoved: boolean
    disposalRecorded: boolean
    oldPatchRemovalAt: string
    oldPatchBodyPart: string
    oldPatchNotes: string
    nextChangeDue: string
    siteRotationChecked: boolean
  },
): string[] {
  if (!isPatchSubType(subType)) return []
  const errors: string[] = []

  const present =
    wizard?.oldPatchPresent ??
    (payload?.oldPatchPresent === true ? 'yes' : payload?.oldPatchPresent === false ? 'no' : '')
  const removed = wizard?.oldPatchRemoved ?? payload?.oldPatchRemoved
  const disposal = wizard?.disposalRecorded ?? payload?.disposalRecorded
  const removalAt = wizard?.oldPatchRemovalAt ?? payload?.oldPatchRemovalAt ?? ''
  const oldPart = wizard?.oldPatchBodyPart ?? payload?.oldPatchBodyPart ?? ''
  const notes = wizard?.oldPatchNotes ?? payload?.oldPatchNotes ?? ''
  const nextDue = wizard?.nextChangeDue ?? payload?.nextChangeDue ?? ''
  const rotation = wizard?.siteRotationChecked ?? payload?.siteRotationChecked

  if (!present) {
    errors.push('Select whether an old patch was present')
  }
  if (present === 'yes') {
    if (!removed) errors.push('Confirm the old patch was removed')
    if (!disposal) errors.push('Confirm disposal of the old patch was recorded')
    if (!removalAt.trim()) errors.push('Enter old patch removal date and time')
    if (!oldPart.trim()) errors.push('Enter the previous patch location (body part)')
  }
  if (present === 'no' && !notes.trim()) {
    errors.push('Add a note when no old patch was found (first application or unable to locate)')
  }
  if (!nextDue.trim()) errors.push('Next patch change due is required')
  if (!rotation) errors.push('Confirm site rotation was checked')

  return errors
}
