import { create } from 'zustand'
import { getTravelLegs, type TravelLeg } from '@/features/scheduling/api/scheduling.api'
import type { GeoCoordinates } from '@/features/scheduling/utils/schedule-job-travel-distance.util'

/**
 * Driving distance and time between rota visits, from the API (Google's route, cached there; the
 * estimate when Google has none). Journeys are asked for in batches; until an answer arrives the
 * travel utils use their own estimate.
 */

export type DrivingLegPair = { from: GeoCoordinates; to: GeoCoordinates }

const BATCH_DELAY_MS = 150
const MAX_PER_REQUEST = 200

/** Same rounding as the API cache key (5 decimals ≈ 1 metre). */
export function drivingLegKey(from: GeoCoordinates, to: GeoCoordinates): string {
  return `${from.lat.toFixed(5)},${from.lng.toFixed(5)}|${to.lat.toFixed(5)},${to.lng.toFixed(5)}`
}

type DrivingTravelState = {
  /** Answer per journey; null = same place. */
  legs: Record<string, TravelLeg | null>
  /** Bumped whenever answers arrive, so travel figures can be worked out again. */
  version: number
}

export const useDrivingTravelStore = create<DrivingTravelState>(() => ({ legs: {}, version: 0 }))

const requested = new Set<string>()
let queue = new Map<string, DrivingLegPair>()
let timer: ReturnType<typeof setTimeout> | null = null

async function flush() {
  timer = null
  const batch = [...queue.entries()]
  queue = new Map()
  for (let i = 0; i < batch.length; i += MAX_PER_REQUEST) {
    const chunk = batch.slice(i, i + MAX_PER_REQUEST)
    try {
      const answers = await getTravelLegs(chunk.map(([, pair]) => pair))
      const legs: Record<string, TravelLeg | null> = {}
      chunk.forEach(([key], index) => {
        legs[key] = answers[index] ?? null
      })
      useDrivingTravelStore.setState(s => ({ legs: { ...s.legs, ...legs }, version: s.version + 1 }))
    } catch {
      // The estimate stays; these journeys may be asked for again later.
      for (const [key] of chunk) requested.delete(key)
    }
  }
}

/** Ask for the journeys not known or already asked for; answers arrive in the store. */
export function requestDrivingLegs(pairs: DrivingLegPair[]): void {
  for (const pair of pairs) {
    const key = drivingLegKey(pair.from, pair.to)
    if (requested.has(key)) continue
    requested.add(key)
    queue.set(key, pair)
  }
  if (queue.size && !timer) timer = setTimeout(() => void flush(), BATCH_DELAY_MS)
}

/** The answer for a journey; undefined until it has arrived. */
export function drivingLegFor(from: GeoCoordinates, to: GeoCoordinates): TravelLeg | null | undefined {
  return useDrivingTravelStore.getState().legs[drivingLegKey(from, to)]
}

/** Re-render when answers arrive; use the value as a memo dependency. */
export function useDrivingTravelVersion(): number {
  return useDrivingTravelStore(s => s.version)
}
