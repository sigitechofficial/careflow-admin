import type { BodyMapOverlayMarker } from '@/features/service-users/body-map/types'
import type { VisitObservationRecordedRow } from '@/features/scheduling/api/scheduling.api'
import { normalizeBodyMapPinCoordinates } from '@/features/service-users/body-map/utils/body-map-marker-position.util'

const OBSERVATION_PIN_COLOR = '#0284c7'

type FlatPin = BodyMapOverlayMarker & { recordedAt?: string }

function assignObservationPinDisplayNumbers(
  pins: FlatPin[],
  chartMaxNumber: number,
): BodyMapOverlayMarker[] {
  const sorted = [...pins].sort((a, b) => {
    const ta = a.recordedAt ? new Date(a.recordedAt).getTime() : 0
    const tb = b.recordedAt ? new Date(b.recordedAt).getTime() : 0
    return ta - tb
  })
  return sorted.map((pin, index) => {
    const { recordedAt: _recordedAt, ...rest } = pin
    return {
      ...rest,
      displayNumber: chartMaxNumber + index + 1,
    }
  })
}

/** Flatten visit observation bodyMapPins for canvas overlay (mobile API-13 / admin obs form). */
export function flattenVisitObservationBodyMapPins(
  rows: VisitObservationRecordedRow[],
  chartMaxNumber = 0,
): BodyMapOverlayMarker[] {
  const flat: FlatPin[] = []
  for (const row of rows) {
    if (!row.bodyMapPins?.length) continue
    row.bodyMapPins.forEach((pin, idx) => {
      const normalized = normalizeBodyMapPinCoordinates({
        recordView: pin.recordView,
        canvasView: pin.canvasView ?? pin.view,
        view: pin.view,
        x: pin.x,
        y: pin.y,
      })
      flat.push({
        id: `${row.id}-${idx}`,
        recordView: normalized.recordView,
        canvasView: normalized.canvasView,
        x: normalized.x,
        y: normalized.y,
        label: `${row.title} — ${pin.part}`,
        markerColor: OBSERVATION_PIN_COLOR,
        recordedAt: row.recordedAt,
      })
    })
  }
  return assignObservationPinDisplayNumbers(flat, chartMaxNumber)
}
