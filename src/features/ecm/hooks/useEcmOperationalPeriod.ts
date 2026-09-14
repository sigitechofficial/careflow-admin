import * as React from 'react'
import { useNavigate, useRouterState, useSearch } from '@tanstack/react-router'
import {
  type EcmOperationalPeriod,
  type EcmOperationalPeriodPreset,
  formatOperationalPeriodLabel,
  periodFromPreset,
  todayIsoLocal,
} from '@/features/ecm/utils/ecm-operational-period.util'
import {
  buildEcmPeriodSearch,
  ecmPeriodSearchHasExplicitPeriod,
  periodsEqual,
  resolveEcmPeriodFromSearch,
  shouldUpdateEcmPeriodSearch,
  type EcmPeriodUrlSearch,
} from '@/features/ecm/utils/ecm-period-url-state.util'
import { getSyncedOperationalTimeZone } from '@/shared/lib/operational-day.util'

const DEFAULT_PRESET = 'today' as const satisfies Exclude<EcmOperationalPeriodPreset, 'custom'>

type Listener = () => void

/** In-memory SSOT so Live ↔ Graphs ↔ Reports keep period when sidebar links omit search. */
let sharedPeriod: EcmOperationalPeriod | null = null
/** Referentially stable fallback while store is empty — required by useSyncExternalStore. */
let emptyStoreFallback: EcmOperationalPeriod | null = null
const listeners = new Set<Listener>()

function subscribe(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getEmptyStoreFallback(): EcmOperationalPeriod {
  const today = todayIsoLocal()
  if (
    emptyStoreFallback &&
    emptyStoreFallback.preset === DEFAULT_PRESET &&
    emptyStoreFallback.dateFrom === today &&
    emptyStoreFallback.dateTo === today
  ) {
    return emptyStoreFallback
  }
  emptyStoreFallback = { preset: DEFAULT_PRESET, ...periodFromPreset(DEFAULT_PRESET, today) }
  return emptyStoreFallback
}

function getSharedPeriodSnapshot(): EcmOperationalPeriod {
  // Must return a stable reference across calls when the store is empty; a fresh
  // object each time makes useSyncExternalStore re-render forever (refresh hang).
  return sharedPeriod ?? getEmptyStoreFallback()
}

function setSharedPeriod(next: EcmOperationalPeriod): void {
  if (sharedPeriod && periodsEqual(sharedPeriod, next)) return
  sharedPeriod = next
  for (const listener of listeners) listener()
}

function searchWriteKey(search: EcmPeriodUrlSearch): string {
  return JSON.stringify({
    period: search.period ?? null,
    from: search.from ?? null,
    to: search.to ?? null,
  })
}

/** Test-only reset for the module store. */
export function __resetEcmOperationalPeriodStoreForTests(): void {
  sharedPeriod = null
  emptyStoreFallback = null
}

/** Test-only: expose getSnapshot for referential-stability checks. */
export function __getEcmOperationalPeriodSnapshotForTests(): EcmOperationalPeriod {
  return getSharedPeriodSnapshot()
}

/**
 * Shared operational period for Live / Graphs / Reports / Compliance.
 *
 * - Hydrate FROM URL on mount / when URL period params change (read-only).
 * - Write TO URL only on user actions (setPreset / dates) — never auto-sync in an effect.
 *   This avoids Graph (Dashboard + Compliance both mounting the hook) navigate loops on refresh.
 * - In-memory store keeps period across SPA nav when sidebar links omit search.
 */
export function useEcmOperationalPeriod(
  defaultPreset: EcmOperationalPeriodPreset = DEFAULT_PRESET,
) {
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const search = useSearch({ strict: false }) as EcmPeriodUrlSearch
  const lastWrittenSearchRef = React.useRef<string | null>(null)

  // Hydrate store from URL (or seed default once). No navigate here.
  React.useLayoutEffect(() => {
    if (ecmPeriodSearchHasExplicitPeriod(search)) {
      setSharedPeriod(resolveEcmPeriodFromSearch(search, null, defaultPreset))
      return
    }
    if (!sharedPeriod) {
      setSharedPeriod(resolveEcmPeriodFromSearch({}, null, defaultPreset))
    }
  }, [search.period, search.from, search.to, search.date, defaultPreset])

  const period = React.useSyncExternalStore(
    subscribe,
    getSharedPeriodSnapshot,
    getSharedPeriodSnapshot,
  )

  const writeUrl = React.useCallback(
    (next: EcmOperationalPeriod) => {
      const desired = buildEcmPeriodSearch(next)
      const key = searchWriteKey(desired)
      if (lastWrittenSearchRef.current === key) return
      if (!shouldUpdateEcmPeriodSearch(search, desired)) {
        lastWrittenSearchRef.current = key
        return
      }
      lastWrittenSearchRef.current = key
      void navigate({
        to: pathname as never,
        search: ((prev: Record<string, unknown>) => ({
          ...desired,
          ...(typeof prev.tab === 'string' ? { tab: prev.tab } : {}),
          ...(typeof prev.jobId === 'string' ? { jobId: prev.jobId } : {}),
        })) as never,
        replace: true,
      })
    },
    [navigate, pathname, search.period, search.from, search.to, search.date],
  )

  const commit = React.useCallback(
    (next: EcmOperationalPeriod) => {
      setSharedPeriod(next)
      writeUrl(next)
    },
    [writeUrl],
  )

  const applyPreset = React.useCallback(
    (next: Exclude<EcmOperationalPeriodPreset, 'custom'>) => {
      const range = periodFromPreset(next)
      commit({ preset: next, dateFrom: range.dateFrom, dateTo: range.dateTo })
    },
    [commit],
  )

  const setPreset = React.useCallback(
    (next: EcmOperationalPeriodPreset) => {
      if (next === 'custom') {
        commit({
          preset: 'custom',
          dateFrom: period.dateFrom,
          dateTo: period.dateTo,
        })
        return
      }
      applyPreset(next)
    },
    [applyPreset, commit, period.dateFrom, period.dateTo],
  )

  const setCustomFrom = React.useCallback(
    (value: string) => {
      const dateFrom = value
      const dateTo = value > period.dateTo ? value : period.dateTo
      commit({ preset: 'custom', dateFrom, dateTo })
    },
    [commit, period.dateTo],
  )

  const setCustomTo = React.useCallback(
    (value: string) => {
      const dateTo = value
      const dateFrom = value < period.dateFrom ? value : period.dateFrom
      commit({ preset: 'custom', dateFrom, dateTo })
    },
    [commit, period.dateFrom],
  )

  return {
    preset: period.preset,
    setPreset,
    dateFrom: period.dateFrom,
    dateTo: period.dateTo,
    setDateFrom: setCustomFrom,
    setDateTo: setCustomTo,
    applyPreset,
    period,
    periodLabel: formatOperationalPeriodLabel(period),
    multiDay: period.dateFrom !== period.dateTo,
    operationalToday: todayIsoLocal(),
    operationalTimezone: getSyncedOperationalTimeZone(),
  }
}
