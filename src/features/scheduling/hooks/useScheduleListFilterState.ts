import * as React from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import {
  type EcmOperationalPeriod,
  type EcmOperationalPeriodPreset,
  periodFromPreset,
  todayIsoLocal,
} from '@/features/ecm/utils/ecm-operational-period.util'
import {
  isIsoDayString,
  resolveEcmPeriodFromSearch,
} from '@/features/ecm/utils/ecm-period-url-state.util'
import { useGlobalLocationScope } from '@/features/locations/hooks/useGlobalLocationScope'
import {
  DEFAULT_SCHEDULE_JOB_OUTCOME_FILTERS,
  parseScheduleJobOperationalFilters,
  type ScheduleJobOperationalFilter,
  type ScheduleJobOutcomeFilter,
} from '@/features/scheduling/utils/schedule-job-board-filter.util'
import {
  parseScheduleJobsRequiredCarersFilters,
  type ScheduleJobsRequiredCarersFilterValue,
} from '@/features/scheduling/utils/schedule-jobs-required-carers-filter.util'
import {
  buildScheduleSharedFilterSearch,
  parseCommaSeparatedFilterIds,
} from '@/features/scheduling/utils/schedule-jobs-url-state.util'
import { clampIsoDateToRange } from '@/features/scheduling/utils/schedule-period-range.util'

export type ScheduleListPageSearch = {
  period?: string
  from?: string
  to?: string
  date?: string
  locationId?: string
  serviceUserId?: string
  employeeId?: string
  requiredCarers?: string
  op?: string
}

function resolvePeriodAndFocus(search: ScheduleListPageSearch): {
  period: EcmOperationalPeriod
  date: string
} {
  const period = resolveEcmPeriodFromSearch(search, null, 'today')
  const focusRaw = isIsoDayString(search.date) ? search.date : period.dateFrom
  return {
    period,
    date: clampIsoDateToRange(focusRaw, period.dateFrom, period.dateTo),
  }
}

function focusForPeriod(period: EcmOperationalPeriod, preferred?: string): string {
  const today = todayIsoLocal()
  const candidate =
    preferred ?? (today >= period.dateFrom && today <= period.dateTo ? today : period.dateTo)
  return clampIsoDateToRange(candidate, period.dateFrom, period.dateTo)
}

export function useScheduleListFilterState() {
  const navigate = useNavigate()
  const search = useSearch({ strict: false }) as ScheduleListPageSearch
  const { locationId: globalLocationId, isScoped: globalLocationScoped } =
    useGlobalLocationScope()

  const [period, setPeriod] = React.useState<EcmOperationalPeriod>(
    () => resolvePeriodAndFocus(search).period,
  )
  const [date, setDate] = React.useState(() => resolvePeriodAndFocus(search).date)
  const [locationFilterIds, setLocationFilterIds] = React.useState<string[]>(
    () => parseCommaSeparatedFilterIds(search.locationId),
  )
  const [serviceUserFilterIds, setServiceUserFilterIds] = React.useState<string[]>(
    () => parseCommaSeparatedFilterIds(search.serviceUserId),
  )
  const [employeeFilterIds, setEmployeeFilterIds] = React.useState<string[]>(
    () => parseCommaSeparatedFilterIds(search.employeeId),
  )
  const [requiredCarersFilters, setRequiredCarersFilters] = React.useState<
    ScheduleJobsRequiredCarersFilterValue[]
  >(() => parseScheduleJobsRequiredCarersFilters(search.requiredCarers))
  const [jobOutcomeFilters, setJobOutcomeFilters] = React.useState(
    () => new Set(DEFAULT_SCHEDULE_JOB_OUTCOME_FILTERS),
  )
  const [jobOperationalFilters, setJobOperationalFilters] = React.useState<
    ScheduleJobOperationalFilter[]
  >(() => parseScheduleJobOperationalFilters(search.op))

  const effectiveLocationFilterIds = React.useMemo(
    () => (globalLocationScoped && globalLocationId ? [globalLocationId] : locationFilterIds),
    [globalLocationScoped, globalLocationId, locationFilterIds],
  )

  const buildSearch = React.useCallback(
    (partial?: {
      period?: EcmOperationalPeriod
      date?: string
      locationIds?: string[]
      serviceUserIds?: string[]
      employeeIds?: string[]
      requiredCarersFilters?: ScheduleJobsRequiredCarersFilterValue[]
      jobOperationalFilters?: ScheduleJobOperationalFilter[]
    }) => ({
      ...buildScheduleSharedFilterSearch({
        period: partial?.period ?? period,
        date: partial?.date ?? date,
        locationIds: partial?.locationIds ?? effectiveLocationFilterIds,
        serviceUserIds: partial?.serviceUserIds ?? serviceUserFilterIds,
        employeeIds: partial?.employeeIds ?? employeeFilterIds,
        requiredCarersFilters: partial?.requiredCarersFilters ?? requiredCarersFilters,
      }),
      ...((partial?.jobOperationalFilters ?? jobOperationalFilters).length
        ? { op: (partial?.jobOperationalFilters ?? jobOperationalFilters).join(',') }
        : {}),
    }),
    [
      period,
      date,
      effectiveLocationFilterIds,
      serviceUserFilterIds,
      employeeFilterIds,
      requiredCarersFilters,
      jobOperationalFilters,
    ],
  )

  const updateUrl = React.useCallback(
    (partial?: Parameters<typeof buildSearch>[0]) => {
      void navigate({
        to: '/scheduling/list',
        search: buildSearch(partial),
      })
    },
    [buildSearch, navigate],
  )

  const commitPeriod = React.useCallback(
    (next: EcmOperationalPeriod, preferredFocus?: string) => {
      const focus = focusForPeriod(next, preferredFocus)
      setPeriod(next)
      setDate(focus)
      updateUrl({ period: next, date: focus })
    },
    [updateUrl],
  )

  const setScheduleDate = React.useCallback(
    (next: string) => {
      if (period.dateFrom === period.dateTo) {
        const nextPeriod: EcmOperationalPeriod = {
          preset: 'custom',
          dateFrom: next,
          dateTo: next,
        }
        setPeriod(nextPeriod)
        setDate(next)
        updateUrl({ period: nextPeriod, date: next })
        return
      }
      const clamped = clampIsoDateToRange(next, period.dateFrom, period.dateTo)
      setDate(clamped)
      updateUrl({ date: clamped })
    },
    [period.dateFrom, period.dateTo, updateUrl],
  )

  const setPeriodPreset = React.useCallback(
    (next: EcmOperationalPeriodPreset) => {
      if (next === 'custom') {
        commitPeriod({
          preset: 'custom',
          dateFrom: period.dateFrom,
          dateTo: period.dateTo,
        })
        return
      }
      commitPeriod({ preset: next, ...periodFromPreset(next) })
    },
    [commitPeriod, period.dateFrom, period.dateTo],
  )

  const applyPeriodPreset = React.useCallback(
    (next: Exclude<EcmOperationalPeriodPreset, 'custom'>) => {
      commitPeriod({ preset: next, ...periodFromPreset(next) })
    },
    [commitPeriod],
  )

  const setPeriodDateFrom = React.useCallback(
    (value: string) => {
      const dateFrom = value
      const dateTo = value > period.dateTo ? value : period.dateTo
      commitPeriod({ preset: 'custom', dateFrom, dateTo }, date)
    },
    [commitPeriod, date, period.dateTo],
  )

  const setPeriodDateTo = React.useCallback(
    (value: string) => {
      const dateTo = value
      const dateFrom = value < period.dateFrom ? value : period.dateFrom
      commitPeriod({ preset: 'custom', dateFrom, dateTo }, date)
    },
    [commitPeriod, date, period.dateFrom],
  )

  const setScheduleLocationFilter = React.useCallback(
    (next: string[]) => {
      if (globalLocationScoped) return
      setLocationFilterIds(next)
      setServiceUserFilterIds([])
      setEmployeeFilterIds([])
      setRequiredCarersFilters([])
      updateUrl({
        locationIds: next,
        serviceUserIds: [],
        employeeIds: [],
        requiredCarersFilters: [],
      })
    },
    [globalLocationScoped, updateUrl],
  )

  const setScheduleServiceUserFilter = React.useCallback(
    (next: string[]) => {
      setServiceUserFilterIds(next)
      updateUrl({ serviceUserIds: next })
    },
    [updateUrl],
  )

  const setScheduleEmployeeFilter = React.useCallback(
    (next: string[]) => {
      setEmployeeFilterIds(next)
      updateUrl({ employeeIds: next })
    },
    [updateUrl],
  )

  const setScheduleRequiredCarersFilters = React.useCallback(
    (next: ScheduleJobsRequiredCarersFilterValue[]) => {
      setRequiredCarersFilters(next)
      updateUrl({ requiredCarersFilters: next })
    },
    [updateUrl],
  )

  const clearFilters = React.useCallback(() => {
    if (!globalLocationScoped) setLocationFilterIds([])
    setServiceUserFilterIds([])
    setEmployeeFilterIds([])
    setRequiredCarersFilters([])
    setJobOperationalFilters([])
    setJobOutcomeFilters(new Set(DEFAULT_SCHEDULE_JOB_OUTCOME_FILTERS))
    updateUrl({
      locationIds: globalLocationScoped && globalLocationId ? [globalLocationId] : [],
      serviceUserIds: [],
      employeeIds: [],
      requiredCarersFilters: [],
      jobOperationalFilters: [],
    })
  }, [globalLocationId, globalLocationScoped, updateUrl])

  const toggleJobOutcomeFilter = React.useCallback((filter: ScheduleJobOutcomeFilter) => {
    setJobOutcomeFilters((current) => {
      const next = new Set(current)
      if (next.has(filter)) next.delete(filter)
      else next.add(filter)
      return next
    })
  }, [])

  const toggleJobOperationalFilter = React.useCallback(
    (filter: ScheduleJobOperationalFilter) => {
      setJobOperationalFilters((current) => {
        const next = current.includes(filter)
          ? current.filter((entry) => entry !== filter)
          : [...current, filter]
        updateUrl({ jobOperationalFilters: next })
        return next
      })
    },
    [updateUrl],
  )

  const wasGlobalScopedRef = React.useRef(globalLocationScoped)

  React.useEffect(() => {
    if (globalLocationScoped && globalLocationId) {
      setLocationFilterIds([globalLocationId])
      updateUrl({ locationIds: [globalLocationId] })
    } else if (wasGlobalScopedRef.current && !globalLocationScoped) {
      setLocationFilterIds([])
      updateUrl({ locationIds: [] })
    }
    wasGlobalScopedRef.current = globalLocationScoped
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only follow header scope changes
  }, [globalLocationId, globalLocationScoped])

  React.useEffect(() => {
    const resolved = resolvePeriodAndFocus(search)
    setPeriod(resolved.period)
    setDate(resolved.date)
  }, [search.period, search.from, search.to, search.date])

  React.useEffect(() => {
    if (globalLocationScoped) return
    setLocationFilterIds(parseCommaSeparatedFilterIds(search.locationId))
  }, [search.locationId, globalLocationScoped])

  React.useEffect(() => {
    setServiceUserFilterIds(parseCommaSeparatedFilterIds(search.serviceUserId))
  }, [search.serviceUserId])

  React.useEffect(() => {
    setEmployeeFilterIds(parseCommaSeparatedFilterIds(search.employeeId))
  }, [search.employeeId])

  React.useEffect(() => {
    setRequiredCarersFilters(parseScheduleJobsRequiredCarersFilters(search.requiredCarers))
  }, [search.requiredCarers])

  React.useEffect(() => {
    setJobOperationalFilters(parseScheduleJobOperationalFilters(search.op))
  }, [search.op])

  const boardLinkSearch = React.useMemo(
    () => ({
      ...buildScheduleSharedFilterSearch({
        period,
        date,
        locationIds: effectiveLocationFilterIds,
        serviceUserIds: serviceUserFilterIds,
        employeeIds: employeeFilterIds,
        requiredCarersFilters,
      }),
      ...(jobOperationalFilters.length ? { op: jobOperationalFilters.join(',') } : {}),
    }),
    [
      period,
      date,
      effectiveLocationFilterIds,
      serviceUserFilterIds,
      employeeFilterIds,
      requiredCarersFilters,
      jobOperationalFilters,
    ],
  )

  const periodControls = React.useMemo(
    () => ({
      preset: period.preset,
      dateFrom: period.dateFrom,
      dateTo: period.dateTo,
      operationalToday: todayIsoLocal(),
      onPresetChange: setPeriodPreset,
      onApplyPreset: applyPeriodPreset,
      onDateFromChange: setPeriodDateFrom,
      onDateToChange: setPeriodDateTo,
    }),
    [
      period.preset,
      period.dateFrom,
      period.dateTo,
      setPeriodPreset,
      applyPeriodPreset,
      setPeriodDateFrom,
      setPeriodDateTo,
    ],
  )

  return {
    date,
    period,
    periodControls,
    locationFilterIds: effectiveLocationFilterIds,
    serviceUserFilterIds,
    employeeFilterIds,
    requiredCarersFilters,
    jobOutcomeFilters,
    jobOperationalFilters,
    locationFilterDisabled: globalLocationScoped,
    setScheduleDate,
    setScheduleLocationFilter,
    setScheduleServiceUserFilter,
    setScheduleEmployeeFilter,
    setScheduleRequiredCarersFilters,
    toggleJobOutcomeFilter,
    toggleJobOperationalFilter,
    clearFilters,
    boardLinkSearch,
  }
}
