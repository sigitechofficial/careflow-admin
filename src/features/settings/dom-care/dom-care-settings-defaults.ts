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

export function domCareZoneKey(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
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

/**
 * Late-visit alert rows = one per live branch (schedule area). Saved recipients are matched by
 * scheduleAreaId, then by the label-derived zoneKey (legacy rows). Saved rows for branches that
 * no longer exist — e.g. the old hard-coded sample branch names — are not shown.
 * While the branch list is unavailable, the saved rows (already branch-derived by the API) are shown.
 */
export function mergeDomLateVisitZoneAlerts(
  saved: DomLateVisitZoneAlert[],
  scheduleAreas: Array<Parameters<typeof scheduleAreaDisplayLabel>[0] & { id: string }>,
): DomLateVisitZoneAlert[] {
  if (scheduleAreas.length === 0) return saved.map(zone => ({ ...zone }))
  const byAreaId = new Map<string, DomLateVisitZoneAlert>()
  const byKey = new Map<string, DomLateVisitZoneAlert>()
  for (const zone of saved) {
    if (zone.scheduleAreaId) byAreaId.set(zone.scheduleAreaId, zone)
    else byKey.set(zone.zoneKey, zone)
  }
  return scheduleAreas
    .map(area => {
      const label = scheduleAreaDisplayLabel(area)
      const zoneKey = domCareZoneKey(label)
      const existing = byAreaId.get(area.id) ?? byKey.get(zoneKey)
      return {
        zoneKey,
        label,
        scheduleAreaId: area.id,
        emailEmployeeIds: existing?.emailEmployeeIds ?? [],
        notificationEmployeeIds: existing?.notificationEmployeeIds ?? [],
      }
    })
    .sort((a, b) => a.label.localeCompare(b.label))
}
