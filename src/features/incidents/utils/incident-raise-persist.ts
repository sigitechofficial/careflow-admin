import {
  addIncidentWitness,
  uploadIncidentAttachment,
} from '@/features/incidents/api/incidents-care.api'
import type { IncidentPersonKind } from '@/features/incidents/types'
import { evidenceCategory } from '@/features/incidents/utils/incident-evidence-files'

/** A witness captured on the raise form before the incident exists, persisted once it does. */
export type PendingWitness = {
  /** Local id for React list keys — not sent to the API. */
  id: string
  personKind: IncidentPersonKind
  /** Linked record when the witness is a service user / staff member (name is still kept for display). */
  personServiceUserId?: string | null
  personEmployeeId?: string | null
  personName: string
  statement: string
}

/** Persist one witness against an existing incident. */
export async function persistIncidentWitness(
  incidentId: string,
  witness: PendingWitness,
): Promise<void> {
  await addIncidentWitness(incidentId, {
    personKind: witness.personKind,
    personServiceUserId:
      witness.personKind === 'SERVICE_USER' ? witness.personServiceUserId || undefined : undefined,
    personEmployeeId: witness.personKind === 'EMPLOYEE' ? witness.personEmployeeId || undefined : undefined,
    personName: witness.personName.trim() || undefined,
    statement: witness.statement.trim() || undefined,
  })
}

/** Upload one photo/evidence file against an existing incident (photos → INCIDENT_PHOTO, PDFs → OTHER). */
export async function persistIncidentPhoto(incidentId: string, file: File): Promise<void> {
  await uploadIncidentAttachment(incidentId, file, evidenceCategory(file))
}
