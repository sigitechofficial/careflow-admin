import * as React from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import type { ScheduleVisitWorkspaceTab } from '@/features/scheduling/components/ScheduleVisitWorkspaceContent'
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
import {
  DEFAULT_SCHEDULE_JOB_OUTCOME_FILTERS,
  parseScheduleCarerOperationalFilters,
  parseScheduleJobOperationalFilters,
  type ScheduleCarerOperationalFilter,
  type ScheduleJobOperationalFilter,
  type ScheduleJobOutcomeFilter,
} from '@/features/scheduling/utils/schedule-job-board-filter.util'
import {
  parseScheduleJobsRequiredCarersFilters,
  type ScheduleJobsRequiredCarersFilterValue,
} from '@/features/scheduling/utils/schedule-jobs-required-carers-filter.util'
import { parseScheduleJobsTimeSensitiveFilter } from '@/features/scheduling/utils/schedule-job-time-sensitive.util'
import { parseScheduleJobsLayout, type ScheduleJobsLayout } from '@/features/scheduling/utils/schedule-jobs-layout.util'
import {
  parseScheduleJobsBoardRowAxis,
  type ScheduleJobsBoardRowAxis,
} from '@/features/scheduling/utils/schedule-jobs-board-axis.util'
import {
  buildScheduleJobsSearch,
  buildScheduleSharedFilterSearch,
  parseCommaSeparatedFilterIds,
} from '@/features/scheduling/utils/schedule-jobs-url-state.util'
import { clampIsoDateToRange } from '@/features/scheduling/utils/schedule-period-range.util'
import { useGlobalLocationScope } from '@/features/locations/hooks/useGlobalLocationScope'

export type ScheduleJobsPageSearch = {
  period?: string
  from?: string
  to?: string
  date?: string
  locationId?: string
  serviceUserId?: string
  employeeId?: string
  requiredCarers?: string
  op?: string
  carerOp?: string
  ts?: string
  layout?: string
  rowAxis?: string
  visitAction?: 'complete' | 'notes' | 'allocate' | 'workspace'
  actionJobId?: string
  visitTab?: ScheduleVisitWorkspaceTab
}

function resolvePeriodAndFocus(search: ScheduleJobsPageSearch): {
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
  const candidate = preferred ?? (today >= period.dateFrom && today <= period.dateTo ? today : period.dateTo)
  return clampIsoDateToRange(candidate, period.dateFrom, period.dateTo)
}

export function useScheduleJobsUrlState() {
  const navigate = useNavigate()
  const search = useSearch({ strict: false }) as ScheduleJobsPageSearch
  const { locationId: globalLocationId, isScoped: globalLocationScoped } =
    useGlobalLocationScope()

  const [period, setPeriod] = React.useState<EcmOperationalPeriod>(
    () => resolvePeriodAndFocus(search).period,
  )
  const [date, setDate] = React.useState(() => resolvePeriodAndFocus(search).date)
  const [layout, setLayout] = React.useState<ScheduleJobsLayout>(() => parseScheduleJobsLayout(search.layout))
  const [rowAxis, setRowAxis] = React.useState<ScheduleJobsBoardRowAxis>(() =>
    parseScheduleJobsBoardRowAxis(search.rowAxis),
  )
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
  const [carerOperationalFilters, setCarerOperationalFilters] = React.useState<
    ScheduleCarerOperationalFilter[]
  >(() => parseScheduleCarerOperationalFilters(search.carerOp))
  const [timeSensitiveFilter, setTimeSensitiveFilter] = React.useState(
    () => parseScheduleJobsTimeSensitiveFilter(search.ts),
  )

  const effectiveLocationFilterIds = React.useMemo(
    () => (globalLocationScoped && globalLocationId ? [globalLocationId] : locationFilterIds),
    [globalLocationScoped, globalLocationId, locationFilterIds],
  )

  const buildCurrentScheduleJobsSearch = React.useCallback(
    (partial?: {
      period?: EcmOperationalPeriod
      date?: string
      locationIds?: string[]
      serviceUserIds?: string[]
      employeeIds?: string[]
      requiredCarersFilters?: ScheduleJobsRequiredCarersFilterValue[]
      jobOperationalFilters?: ScheduleJobOperationalFilter[]
      carerOperationalFilters?: ScheduleCarerOperationalFilter[]
      timeSensitiveFilter?: boolean
      layout?: ScheduleJobsLayout
      rowAxis?: ScheduleJobsBoardRowAxis
    }) =>
      buildScheduleJobsSearch({
        period: partial?.period ?? period,
        date: partial?.date ?? date,
        locationIds: partial?.locationIds ?? effectiveLocationFilterIds,
        serviceUserIds: partial?.serviceUserIds ?? serviceUserFilterIds,
        employeeIds: partial?.employeeIds ?? employeeFilterIds,
        requiredCarersFilters: partial?.requiredCarersFilters ?? requiredCarersFilters,
        jobOperationalFilters: partial?.jobOperationalFilters ?? jobOperationalFilters,
        carerOperationalFilters: partial?.carerOperationalFilters ?? carerOperationalFilters,
        timeSensitiveFilter: partial?.timeSensitiveFilter ?? timeSensitiveFilter,
        layout: partial?.layout ?? layout,
        rowAxis: partial?.rowAxis ?? rowAxis,
      }),
    [
      period,
      date,
      effectiveLocationFilterIds,
      serviceUserFilterIds,
      employeeFilterIds,
      requiredCarersFilters,
      jobOperationalFilters,
      carerOperationalFilters,
      timeSensitiveFilter,
      layout,
      rowAxis,
    ],
  )

  const updateScheduleJobsUrl = React.useCallback(
    (partial?: Parameters<typeof buildCurrentScheduleJobsSearch>[0]) => {
      void navigate({
        to: '/scheduling/schedule-jobs',
        search: buildCurrentScheduleJobsSearch(partial),
      })
    },
    [buildCurrentScheduleJobsSearch, navigate],
  )

  const commitPeriod = React.useCallback(
    (next: EcmOperationalPeriod, preferredFocus?: string) => {
      const focus = focusForPeriod(next, preferredFocus)
      setPeriod(next)
      setDate(focus)
      updateScheduleJobsUrl({ period: next, date: focus })
    },
    [updateScheduleJobsUrl],
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
        updateScheduleJobsUrl({ period: nextPeriod, date: next })
        return
      }
      const clamped = clampIsoDateToRange(next, period.dateFrom, period.dateTo)
      setDate(clamped)
      updateScheduleJobsUrl({ date: clamped })
    },
    [period.dateFrom, period.dateTo, updateScheduleJobsUrl],
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

  const setScheduleRowAxis = React.useCallback(
    (next: ScheduleJobsBoardRowAxis) => {
      setRowAxis(next)
      updateScheduleJobsUrl({ rowAxis: next })
    },
    [updateScheduleJobsUrl],
  )

  const setScheduleLayout = React.useCallback(
    (next: ScheduleJobsLayout) => {
      setLayout(next)
      updateScheduleJobsUrl({ layout: next })
    },
    [updateScheduleJobsUrl],
  )

  const setScheduleLocationFilter = React.useCallback(
    (next: string[]) => {
      if (globalLocationScoped) return
      setLocationFilterIds(next)
      setServiceUserFilterIds([])
      setEmployeeFilterIds([])
      setRequiredCarersFilters([])
      updateScheduleJobsUrl({
        locationIds: next,
        serviceUserIds: [],
        employeeIds: [],
        requiredCarersFilters: [],
      })
    },
    [globalLocationScoped, updateScheduleJobsUrl],
  )

  const setScheduleServiceUserFilter = React.useCallback(
    (next: string[]) => {
      setServiceUserFilterIds(next)
      updateScheduleJobsUrl({ serviceUserIds: next })
    },
    [updateScheduleJobsUrl],
  )

  const setScheduleEmployeeFilter = React.useCallback(
    (next: string[]) => {
      setEmployeeFilterIds(next)
      updateScheduleJobsUrl({ employeeIds: next })
    },
    [updateScheduleJobsUrl],
  )

  const setScheduleRequiredCarersFilters = React.useCallback(
    (next: ScheduleJobsRequiredCarersFilterValue[]) => {
      setRequiredCarersFilters(next)
      updateScheduleJobsUrl({ requiredCarersFilters: next })
    },
    [updateScheduleJobsUrl],
  )

  const clearSharedFilters = React.useCallback(() => {
    if (!globalLocationScoped) setLocationFilterIds([])
    setServiceUserFilterIds([])
    setEmployeeFilterIds([])
    setRequiredCarersFilters([])
    updateScheduleJobsUrl({
      locationIds: globalLocationScoped && globalLocationId ? [globalLocationId] : [],
      serviceUserIds: [],
      employeeIds: [],
      requiredCarersFilters: [],
    })
  }, [globalLocationId, globalLocationScoped, updateScheduleJobsUrl])

  const toggleJobOperationalFilter = React.useCallback(
    (filter: ScheduleJobOperationalFilter) => {
      setJobOperationalFilters((current) => {
        const next = current.includes(filter)
          ? current.filter((entry) => entry !== filter)
          : [...current, filter]
        updateScheduleJobsUrl({ jobOperationalFilters: next })
        return next
      })
    },
    [updateScheduleJobsUrl],
  )

  const toggleCarerOperationalFilter = React.useCallback(
    (filter: ScheduleCarerOperationalFilter) => {
      setCarerOperationalFilters((current) => {
        const next = current.includes(filter)
          ? current.filter((entry) => entry !== filter)
          : [...current, filter]
        updateScheduleJobsUrl({ carerOperationalFilters: next })
        return next
      })
    },
    [updateScheduleJobsUrl],
  )

  const toggleTimeSensitiveFilter = React.useCallback(() => {
    setTimeSensitiveFilter((current) => {
      const next = !current
      updateScheduleJobsUrl({ timeSensitiveFilter: next })
      return next
    })
  }, [updateScheduleJobsUrl])

  const toggleJobOutcomeFilter = React.useCallback((filter: ScheduleJobOutcomeFilter) => {
    setJobOutcomeFilters((current) => {
      const next = new Set(current)
      if (next.has(filter)) {
        next.delete(filter)
      } else {
        next.add(filter)
      }
      return next
    })
  }, [])

  const wasGlobalScopedRef = React.useRef(globalLocationScoped)

  React.useEffect(() => {
    if (globalLocationScoped && globalLocationId) {
      setLocationFilterIds([globalLocationId])
      updateScheduleJobsUrl({ locationIds: [globalLocationId] })
    } else if (wasGlobalScopedRef.current && !globalLocationScoped) {
      setLocationFilterIds([])
      updateScheduleJobsUrl({ locationIds: [] })
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
    setLayout(parseScheduleJobsLayout(search.layout))
  }, [search.layout])

  React.useEffect(() => {
    setRowAxis(parseScheduleJobsBoardRowAxis(search.rowAxis))
  }, [search.rowAxis])

  React.useEffect(() => {
    setRequiredCarersFilters(parseScheduleJobsRequiredCarersFilters(search.requiredCarers))
  }, [search.requiredCarers])

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
    setJobOperationalFilters(parseScheduleJobOperationalFilters(search.op))
  }, [search.op])

  React.useEffect(() => {
    setCarerOperationalFilters(parseScheduleCarerOperationalFilters(search.carerOp))
  }, [search.carerOp])

  React.useEffect(() => {
    setTimeSensitiveFilter(parseScheduleJobsTimeSensitiveFilter(search.ts))
  }, [search.ts])

  const listLinkSearch = React.useMemo(
    () => ({
      ...buildScheduleSharedFilterSearch({
        period,
        date,
        locationIds: effectiveLocationFilterIds,
        serviceUserIds: serviceUserFilterIds,
        employeeIds: employeeFilterIds,
        requiredCarersFilters,
        timeSensitiveFilter,
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
      timeSensitiveFilter,
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
    search,
    date,
    period,
    periodControls,
    layout,
    rowAxis,
    locationFilterIds: effectiveLocationFilterIds,
    serviceUserFilterIds,
    employeeFilterIds,
    requiredCarersFilters,
    jobOutcomeFilters,
    jobOperationalFilters,
    carerOperationalFilters,
    timeSensitiveFilter,
    locationFilterDisabled: globalLocationScoped,
    setServiceUserFilterIds,
    setScheduleDate,
    setScheduleRowAxis,
    setScheduleLayout,
    setScheduleLocationFilter,
    setScheduleServiceUserFilter,
    setScheduleEmployeeFilter,
    setScheduleRequiredCarersFilters,
    clearSharedFilters,
    toggleJobOperationalFilter,
    toggleCarerOperationalFilter,
    toggleTimeSensitiveFilter,
    toggleJobOutcomeFilter,
    updateScheduleJobsUrl,
    listLinkSearch,
  }
}
