import type { MedicationEventListRow } from '@/features/service-users/api/medication-mar.api'
import { formatGbDateTime } from '@/features/service-users/medication/medication-event-display'
import { administrationStatusToDisplayCode } from '@/features/service-users/medication/mar-status-utils'

/** Label for MAR administration picker (body map dose-at-site evidence). */
export function formatMarAdministrationEventLabel(ev: MedicationEventListRow): string {
  const code =
    ev.statusCode?.trim() ||
    administrationStatusToDisplayCode(ev.status) ||
    ev.status
  const when = formatGbDateTime(ev.actualDateTime ?? ev.scheduledDateTime)
  const round = ev.round?.name ?? ev.schedule?.round?.name
  const roundBit = round ? ` · ${round}` : ''
  return `${when} · ${code}${roundBit}`
}

export const MAR_LINK_ON_SAVE = '__on_save__' as const
export type MarAdministrationLinkChoice = '' | typeof MAR_LINK_ON_SAVE | string
