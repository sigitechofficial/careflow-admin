import type { IncidentDefaultStatus, IncidentTypeSetting } from '@/features/settings/types'

export const INCIDENT_STATUS_OPTIONS: { value: IncidentDefaultStatus; label: string }[] = [
  { value: 'REPORTED', label: 'Reported' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'UNDER_REVIEW', label: 'Under review' },
  { value: 'CLOSED', label: 'Closed' },
]

export const DEFAULT_INCIDENT_TYPE_SETTINGS: IncidentTypeSetting[] = [
  { key: 'accident', label: 'Accident', required: true },
  { key: 'behaviour', label: 'Behaviour', required: true },
  { key: 'concerns', label: 'Concerns', required: true },
  { key: 'fall', label: 'Fall', required: true },
  { key: 'incident', label: 'Incident', required: true },
  { key: 'medication', label: 'Medication', required: true },
  { key: 'near_miss', label: 'Near Miss', required: true },
  { key: 'safeguarding', label: 'Safeguarding', required: true },
]

export function mergeIncidentTypeSettings(saved: IncidentTypeSetting[]): IncidentTypeSetting[] {
  const byKey = new Map(saved.map(t => [t.key, t]))
  return DEFAULT_INCIDENT_TYPE_SETTINGS.map(def => {
    const row = byKey.get(def.key)
    return row ? { ...def, required: row.required } : { ...def }
  })
}
