/** Spare minutes after required travel+buffer before we show "only just on time". */
export const TRAVEL_TIGHT_SPARE_MINUTES = 5

export type TravelTimingStatus = 'ok' | 'tight' | 'conflict'

export function resolveTravelTimingStatus(
  gapMinutes: number,
  travelMinutes: number,
  bufferMinutes = 0,
): TravelTimingStatus {
  const requiredGapMinutes = Math.max(0, travelMinutes) + Math.max(0, bufferMinutes)
  if (gapMinutes < requiredGapMinutes) return 'conflict'
  const spareMinutes = gapMinutes - requiredGapMinutes
  if (spareMinutes <= TRAVEL_TIGHT_SPARE_MINUTES) return 'tight'
  return 'ok'
}

export function travelTimingStatusLabel(status: TravelTimingStatus): string {
  switch (status) {
    case 'conflict':
      return 'Arrives too late'
    case 'tight':
      return 'Only just on time'
    case 'ok':
      return 'On time'
  }
}
