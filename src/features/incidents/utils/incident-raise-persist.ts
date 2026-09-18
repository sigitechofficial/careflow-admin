import {
  addIncidentWitness,
  uploadIncidentAttachment,
} from '@/features/incidents/api/incidents-care.api'
import type { IncidentPersonKind } from '@/features/incidents/types'

/** A witness captured on the raise form before the incident exists, persisted once it does. */
export type PendingWitness = {
  /** Local id for React list keys — not sent to the API. */
  id: string
  personKind: IncidentPersonKind
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
    personName: witness.personName.trim() || undefined,
    statement: witness.statement.trim() || undefined,
  })
}

/** Upload one photo/evidence file against an existing incident. */
export async function persistIncidentPhoto(incidentId: string, file: File): Promise<void> {
  await uploadIncidentAttachment(incidentId, file, 'INCIDENT_PHOTO')
}
