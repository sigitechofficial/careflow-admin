import { addIncidentInjury, updateIncidentInjury } from '@/features/incidents/api/incidents-care.api'
import type { IncidentInjurySeverity, IncidentPersonKind } from '@/features/incidents/types'
import type { PlaceMarkerPayload } from '@/features/service-users/body-map/components/BodyMapCanvas'
import {
  prototypeSideToApi,
  recordViewToApiBodyView,
} from '@/features/service-users/body-map/utils/body-map-coords'
import { addBodyMapLink, createBodyMapRecord } from '@/features/service-users/body-map/api'
import type { BodyMapRecordTypeCode } from '@/features/service-users/body-map/catalog/record-types'
import type { BodyMapRiskLevel } from '@/features/service-users/body-map/types'

/** An injury captured in a form before the incident exists, persisted once it does. */
export type PendingIncidentInjury = {
  /** Local id for React list keys — not sent to the API. */
  id: string
  injuryType: string
  severity: IncidentInjurySeverity
  notes?: string
  /** Body-map placement; when present (with a service user) the injury is pinned on the body map. */
  marker?: PlaceMarkerPayload | null
  /** Who was injured. Defaults to the service user passed to `persistIncidentInjury`. */
  personKind?: IncidentPersonKind
  personServiceUserId?: string | null
  personEmployeeId?: string | null
  /** Name for people who are not service users or staff (family, visitor…). */
  personName?: string | null
  /** Display only, e.g. "Enid Morrison (Service user)" — not sent to the API. */
  personLabel?: string
}

const SEVERITY_TO_RISK: Record<IncidentInjurySeverity, BodyMapRiskLevel> = {
  MINOR: 'LOW',
  MODERATE: 'MEDIUM',
  SERIOUS: 'HIGH',
  FATAL: 'URGENT',
}

/**
 * Persist one injury against an existing incident. When a body-map marker and a service user
 * are both present it creates a real BodyMapRecord (type INJURY), links it to the incident, and
 * records the injury with `bodyMapRecordId`. Otherwise it records the injury detail on its own.
 */
export async function persistIncidentInjury(
  incidentId: string,
  serviceUserId: string | null | undefined,
  pending: PendingIncidentInjury,
): Promise<void> {
  const injuryType = pending.injuryType.trim()
  if (!injuryType) return
  const notes = pending.notes?.trim() || undefined
  const personKind = pending.personKind ?? 'SERVICE_USER'
  // Only service users have a body map; staff and other people never get a pin.
  const injuredServiceUserId =
    personKind === 'SERVICE_USER' ? pending.personServiceUserId ?? serviceUserId ?? null : null
  const marker = personKind === 'SERVICE_USER' ? pending.marker : null

  if (marker && injuredServiceUserId) {
    const pin = await pinInjuryOnBodyMap(incidentId, injuredServiceUserId, injuryType, notes, pending.severity, marker)
    await addIncidentInjury(incidentId, {
      personKind: 'SERVICE_USER',
      personServiceUserId: injuredServiceUserId,
      injurySeverity: pending.severity,
      injuryType,
      bodyRegion: pin.bodyRegion,
      side: pin.side,
      notes,
      bodyMapRecordId: pin.recordId,
    })
    return
  }

  await addIncidentInjury(incidentId, {
    personKind,
    personServiceUserId: injuredServiceUserId || undefined,
    personEmployeeId: personKind === 'EMPLOYEE' ? pending.personEmployeeId || undefined : undefined,
    personName:
      personKind !== 'SERVICE_USER' && personKind !== 'EMPLOYEE'
        ? pending.personName?.trim() || undefined
        : undefined,
    injurySeverity: pending.severity,
    injuryType,
    bodyRegion: marker?.bodyPart || marker?.summaryLabel || undefined,
    side: marker ? prototypeSideToApi(marker.side) : undefined,
    notes,
  })
}

/** Create a body-map INJURY record for a service user and link it to the incident. */
async function pinInjuryOnBodyMap(
  incidentId: string,
  injuredServiceUserId: string,
  injuryType: string,
  notes: string | undefined,
  severity: IncidentInjurySeverity,
  marker: PlaceMarkerPayload,
): Promise<{ recordId: string; bodyRegion: string; side: string | undefined }> {
  const bodyPart = marker.bodyPart || marker.summaryLabel || 'Unspecified'
  const record = await createBodyMapRecord({
    serviceUserId: injuredServiceUserId,
    recordType: 'INJURY' as BodyMapRecordTypeCode,
    subType: injuryType,
    description: notes || injuryType,
    riskLevel: SEVERITY_TO_RISK[severity],
    bodyView: recordViewToApiBodyView(marker.recordView),
    side: prototypeSideToApi(marker.side),
    bodyPart,
    specificLocation: marker.summaryLabel,
    xCoordinate: marker.x,
    yCoordinate: marker.y,
    observationDetails: {
      recordView: marker.recordView,
      canvasView: marker.canvasView,
      regionId: marker.regionId ?? undefined,
      source: 'incident',
      incidentId,
    },
  })
  await addBodyMapLink(record.id, {
    linkedModule: 'INCIDENT',
    linkedRecordId: incidentId,
    label: 'Incident injury',
  })
  return { recordId: record.id, bodyRegion: bodyPart, side: prototypeSideToApi(marker.side) }
}

/**
 * Save an edit to a recorded injury (reason kept in the audit log). A new pin placed for a
 * service user is added to their body map and linked; an existing pin is left as it is.
 */
export async function updatePersistedInjury(
  incidentId: string,
  injuryId: string,
  pending: PendingIncidentInjury,
  reason: string,
): Promise<void> {
  const personKind = pending.personKind ?? 'SERVICE_USER'
  const injuryType = pending.injuryType.trim()
  const notes = pending.notes?.trim() || undefined
  const pin =
    personKind === 'SERVICE_USER' && pending.marker && pending.personServiceUserId
      ? await pinInjuryOnBodyMap(
          incidentId,
          pending.personServiceUserId,
          injuryType,
          notes,
          pending.severity,
          pending.marker,
        )
      : null
  await updateIncidentInjury(injuryId, {
    reason,
    personKind,
    personServiceUserId: personKind === 'SERVICE_USER' ? pending.personServiceUserId || undefined : undefined,
    personEmployeeId: personKind === 'EMPLOYEE' ? pending.personEmployeeId || undefined : undefined,
    personName:
      personKind !== 'SERVICE_USER' && personKind !== 'EMPLOYEE' ? pending.personName?.trim() || '' : '',
    injurySeverity: pending.severity,
    injuryType,
    notes: notes ?? '',
    ...(pin ? { bodyMapRecordId: pin.recordId, bodyRegion: pin.bodyRegion, side: pin.side ?? '' } : {}),
  })
}
