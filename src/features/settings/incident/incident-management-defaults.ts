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

export const DEFAULT_INCIDENT_SEVERITY_SETTINGS: IncidentTypeSetting[] = [
  { key: 'low', label: 'Low', required: true },
  { key: 'medium', label: 'Medium', required: true },
  { key: 'high', label: 'High', required: true },
  { key: 'critical', label: 'Critical', required: true },
]

export const DEFAULT_INCIDENT_WHO_INFORMED_SETTINGS: IncidentTypeSetting[] = [
  { key: 'office', label: 'Office', required: true },
  { key: 'on_call_manager', label: 'On-call manager', required: true },
  { key: 'family_nok', label: 'Family / NOK', required: true },
  { key: 'gp', label: 'GP', required: true },
  { key: 'emergency_999', label: '999', required: true },
  { key: 'safeguarding_lead', label: 'Safeguarding lead', required: true },
  { key: 'local_authority', label: 'Local authority', required: true },
]

const DEFAULT_WHO_KEYS = new Set(DEFAULT_INCIDENT_WHO_INFORMED_SETTINGS.map(t => t.key))

export function isDefaultWhoInformedKey(key: string): boolean {
  return DEFAULT_WHO_KEYS.has(key)
}

export function mergeIncidentTypeSettings(saved: IncidentTypeSetting[]): IncidentTypeSetting[] {
  const byKey = new Map(saved.map(t => [t.key, t]))
  return DEFAULT_INCIDENT_TYPE_SETTINGS.map(def => {
    const row = byKey.get(def.key)
    return row ? { ...def, required: row.required } : { ...def }
  })
}

export function mergeIncidentSeveritySettings(saved: IncidentTypeSetting[]): IncidentTypeSetting[] {
  const byKey = new Map(saved.map(t => [t.key, t]))
  return DEFAULT_INCIDENT_SEVERITY_SETTINGS.map(def => {
    const row = byKey.get(def.key)
    return row ? { ...def, required: row.required } : { ...def }
  })
}

export function mergeIncidentWhoInformedSettings(saved: IncidentTypeSetting[]): IncidentTypeSetting[] {
  const byKey = new Map(saved.map(t => [t.key, t]))
  const merged = DEFAULT_INCIDENT_WHO_INFORMED_SETTINGS.map(def => {
    const row = byKey.get(def.key)
    return row ? { ...def, required: row.required, label: row.label || def.label } : { ...def }
  })
  const extras = saved.filter(row => !DEFAULT_WHO_KEYS.has(row.key))
  return [...merged, ...extras]
}

export function slugIncidentCatalogKey(label: string): string {
  const slug = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 64)
  return slug || `who_${Date.now()}`
}
