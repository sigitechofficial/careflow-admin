/** Field events that ring the office and deep-link to the ECM exception queue. */
export const URGENT_OFFICE_ALERT_KINDS = [
  'CARER_SOS',
  'LEFT_VISIT_AREA',
  'UNABLE_TO_START',
] as const

export type UrgentOfficeAlertKind = (typeof URGENT_OFFICE_ALERT_KINDS)[number]

export function isUrgentOfficeAlertKind(kind: unknown): boolean {
  return (
    typeof kind === 'string' &&
    (URGENT_OFFICE_ALERT_KINDS as readonly string[]).includes(kind)
  )
}
