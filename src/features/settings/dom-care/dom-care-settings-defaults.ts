import type { DomJobCancellationRule, DomLateVisitZoneAlert } from '@/features/settings/types'

export const DEFAULT_DOM_JOB_CANCELLATION_RULES: DomJobCancellationRule[] = [
  {
    id: 'default-0-24',
    hoursFrom: 0,
    hoursTo: 24,
    chargeServiceUserPercent: 100,
    payEmployeePercent: 100,
  },
  {
    id: 'default-24-25',
    hoursFrom: 24,
    hoursTo: 25,
    chargeServiceUserPercent: 0,
    payEmployeePercent: 0,
  },
]

export const DEFAULT_DOM_LATE_VISIT_ZONE_LABELS = [
  'Croydon - Croydon 2',
  'Croydon - Croydon 3',
  'Croydon - Croydon 4',
  'Croydon - Croydon 5',
  'Croydon - Croydon 1',
  'Merton - Merton',
  'Hackney - Harrow 1',
  'Haringey - Haringey',
  'Croydon Private - Croydon 2 Private',
  'Croydon Private - Croydon 5 Private',
  'Croydon Private - Croydon 4 Private',
  'Croydon Private - Croydon 3 Private',
  'Croydon Private - Croydon 1 Private',
  'Croydon admin - Croydon office',
  'Bexley ISF - Bexley',
  'Cleaners - Cleaning 1',
  'ALF Private - ALF Private',
  'Greenwich council - Greenwich',
  'Transport - Croydon Transport',
] as const

export function domCareZoneKey(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function defaultDomLateVisitZoneAlerts(): DomLateVisitZoneAlert[] {
  return DEFAULT_DOM_LATE_VISIT_ZONE_LABELS.map(label => ({
    zoneKey: domCareZoneKey(label),
    label,
    scheduleAreaId: null,
    emailEmployeeIds: [],
    notificationEmployeeIds: [],
  }))
}

export function scheduleAreaDisplayLabel(area: {
  name: string
  location?: { name: string } | null
  zone?: { name: string } | null
}): string {
  if (area.location?.name) return area.location.name
  if (area.zone?.name) return `${area.zone.name} - ${area.name}`
  return area.name
}
