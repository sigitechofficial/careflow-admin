import * as React from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import type { ScheduleVisitWorkspaceTab } from '@/features/scheduling/components/ScheduleVisitWorkspaceContent'
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
import { parseScheduleJobsLayout, type ScheduleJobsLayout } from '@/features/scheduling/utils/schedule-jobs-layout.util'
import {
  parseScheduleJobsBoardRowAxis,
  type ScheduleJobsBoardRowAxis,
} from '@/features/scheduling/utils/schedule-jobs-board-axis.util'
import {
  buildScheduleJobsSearch,
  parseCommaSeparatedFilterIds,
} from '@/features/scheduling/utils/schedule-jobs-url-state.util'
import { todayIso } from '@/features/scheduling/utils/scheduling-format'
import { useGlobalLocationScope } from '@/features/locations/hooks/useGlobalLocationScope'

export type ScheduleJobsPageSearch = {
  date?: string
  locationId?: string
  serviceUserId?: string
  requiredCarers?: string
  op?: string
  carerOp?: string
  layout?: string
  rowAxis?: string
  visitAction?: 'complete' | 'notes' | 'allocate' | 'workspace'
  actionJobId?: string
  visitTab?: ScheduleVisitWorkspaceTab
}

export function useScheduleJobsUrlState() {
  const navigate = useNavigate()
  const search = useSearch({ strict: false }) as ScheduleJobsPageSearch
  const { locationId: globalLocationId, isScoped: globalLocationScoped } =
    useGlobalLocationScope()

  const [date, setDate] = React.useState(search.date ?? todayIso())
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

  const effectiveLocationFilterIds = React.useMemo(
    () => (globalLocationScoped && globalLocationId ? [globalLocationId] : locationFilterIds),
    [globalLocationScoped, globalLocationId, locationFilterIds],
  )

  const buildCurrentScheduleJobsSearch = React.useCallback(
    (partial?: {
      date?: string
      locationIds?: string[]
      serviceUserIds?: string[]
      requiredCarersFilters?: ScheduleJobsRequiredCarersFilterValue[]
      jobOperationalFilters?: ScheduleJobOperationalFilter[]
      carerOperationalFilters?: ScheduleCarerOperationalFilter[]
      layout?: ScheduleJobsLayout
      rowAxis?: ScheduleJobsBoardRowAxis
    }) =>
      buildScheduleJobsSearch({
        date: partial?.date ?? date,
        locationIds: partial?.locationIds ?? effectiveLocationFilterIds,
        serviceUserIds: partial?.serviceUserIds ?? serviceUserFilterIds,
        requiredCarersFilters: partial?.requiredCarersFilters ?? requiredCarersFilters,
        jobOperationalFilters: partial?.jobOperationalFilters ?? jobOperationalFilters,
        carerOperationalFilters: partial?.carerOperationalFilters ?? carerOperationalFilters,
        layout: partial?.layout ?? layout,
        rowAxis: partial?.rowAxis ?? rowAxis,
      }),
    [
      date,
      effectiveLocationFilterIds,
      serviceUserFilterIds,
      requiredCarersFilters,
      jobOperationalFilters,
      carerOperationalFilters,
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

  const setScheduleDate = React.useCallback(
    (next: string) => {
      setDate(next)
      updateScheduleJobsUrl({ date: next })
    },
    [updateScheduleJobsUrl],
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
      setRequiredCarersFilters([])
      updateScheduleJobsUrl({
        locationIds: next,
        serviceUserIds: [],
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

  const setScheduleRequiredCarersFilters = React.useCallback(
    (next: ScheduleJobsRequiredCarersFilterValue[]) => {
      setRequiredCarersFilters(next)
      updateScheduleJobsUrl({ requiredCarersFilters: next })
    },
    [updateScheduleJobsUrl],
  )

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
      // Header switched back to All locations — clear forced board filter.
      setLocationFilterIds([])
      updateScheduleJobsUrl({ locationIds: [] })
    }
    wasGlobalScopedRef.current = globalLocationScoped
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only follow header scope changes
  }, [globalLocationId, globalLocationScoped])

  React.useEffect(() => {
    if (search.date) setDate(search.date)
  }, [search.date])

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
    setJobOperationalFilters(parseScheduleJobOperationalFilters(search.op))
  }, [search.op])

  React.useEffect(() => {
    setCarerOperationalFilters(parseScheduleCarerOperationalFilters(search.carerOp))
  }, [search.carerOp])

  return {
    search,
    date,
    layout,
    rowAxis,
    locationFilterIds: effectiveLocationFilterIds,
    serviceUserFilterIds,
    requiredCarersFilters,
    jobOutcomeFilters,
    jobOperationalFilters,
    carerOperationalFilters,
    setServiceUserFilterIds,
    setScheduleDate,
    setScheduleRowAxis,
    setScheduleLayout,
    setScheduleLocationFilter,
    setScheduleServiceUserFilter,
    setScheduleRequiredCarersFilters,
    toggleJobOperationalFilter,
    toggleCarerOperationalFilter,
    toggleJobOutcomeFilter,
    updateScheduleJobsUrl,
  }
}
