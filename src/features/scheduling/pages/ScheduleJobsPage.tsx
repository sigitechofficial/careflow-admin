import * as React from 'react'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle } from 'lucide-react'
import { getApiBaseUrl } from '@/shared/lib/api-base'
import { PageHeader } from '@/shared/ui/page-elements'
import { listAllEmployees } from '@/features/employees/api'
import { employeeKeys } from '@/features/employees/keys'
import { useEmployeeLookups } from '@/features/employees/hooks/useEmployees'
import { ScheduleJobAllocateDialog } from '@/features/scheduling/components/ScheduleJobAllocateDialog'
import { ScheduleJobNotesDialog } from '@/features/scheduling/components/ScheduleJobNotesDialog'
import { ScheduleJobCompleteDialog } from '@/features/scheduling/components/ScheduleJobCompleteDialog'
import { ScheduleJobCancelDialog } from '@/features/scheduling/components/ScheduleJobCancelDialog'
import { ScheduleJobReinstateDialog } from '@/features/scheduling/components/ScheduleJobReinstateDialog'
import { ScheduleVisitWorkspaceSheet } from '@/features/scheduling/components/ScheduleVisitWorkspaceSheet'
import type { ScheduleVisitWorkspaceTab } from '@/features/scheduling/components/ScheduleVisitWorkspaceContent'
import { getScheduledJob } from '@/features/scheduling/api/scheduling.api'
import { ScheduleJobsGantt } from '@/features/scheduling/components/ScheduleJobsGantt'
import { ScheduleJobsToolbar } from '@/features/scheduling/components/ScheduleJobsToolbar'
import { ScheduleRunsPanel } from '@/features/scheduling/components/ScheduleRunsPanel'
import { ScheduleRunCreateDialog } from '@/features/scheduling/components/ScheduleRunCreateDialog'
import { ScheduleRunEditDialog } from '@/features/scheduling/components/ScheduleRunEditDialog'
import { ScheduleRunReassignDialog } from '@/features/scheduling/components/ScheduleRunReassignDialog'
import { useScheduleRunEditDialog } from '@/features/scheduling/hooks/useScheduleRunEditDialog'
import { useScheduleRunReassignDialog } from '@/features/scheduling/hooks/useScheduleRunReassignDialog'
import { useScheduleJobsBoardPreferences } from '@/features/scheduling/hooks/useScheduleJobsBoardPreferences'
import { useScheduleDayRuns, useScheduleEmployeesDay, useScheduleServiceUsersWeek, useScheduleAreas } from '@/features/scheduling/hooks/useScheduling'
import { useServiceUserLocations } from '@/features/settings/hooks/useLocationManagement'
import {
  buildBranchSummariesFromTimelineJobs,
  buildServiceUserBranchFilterOptions,
} from '@/features/settings/location-management/build-service-user-branch-filter-options'
import {
  useAllocateJob,
  useUnallocateJob,
  useUpdateScheduledJob,
} from '@/features/scheduling/hooks/useSchedulingMutations'
import type { TimelineJob } from '@/features/scheduling/types/scheduling.types'
import type {
  ScheduleJobAllocateDialogPanel,
  ScheduleJobContextAction,
} from '@/features/scheduling/types/schedule-job-context-actions.types'
import { isScheduleJobReadOnly } from '@/features/scheduling/types/schedule-job-context-actions.types'
import {
  rowsEqual,
  scheduleTimesChanged,
  type JobDropPayload,
} from '@/features/scheduling/utils/schedule-jobs-drag.util'
import { scheduleRunDragConflictMessage } from '@/features/scheduling/utils/schedule-run-drag.util'
import { mergeScheduleJobsEmployeeRoster } from '@/features/scheduling/utils/schedule-jobs-employee-roster.util'
import {
  buildEmployeeLocationCatalogMap,
  filterEmployeeDayRowsByLocation,
  filterTimelineJobsByLocation,
  scheduleJobCarerLocationConflictMessage,
} from '@/features/scheduling/utils/schedule-jobs-location-filter.util'
import {
  mergedExcessWeeklyContractedJobIds,
  scheduleWeekStartIso,
  summarizeWeeklyContractUsage,
} from '@/features/scheduling/utils/schedule-jobs-contracted-hours.util'
import { useVisitPlanContractByServiceUser, useAcceptedCarePlansByServiceUser } from '@/features/service-users/visit-plan/hooks'
import { useGeneralSettings } from '@/features/settings/hooks/useGeneralSettings'
import { resolveTimeBetweenJobsBufferMinutes } from '@/features/scheduling/utils/schedule-job-travel-buffer.util'
import type { VisitPlanSlot } from '@/features/service-users/visit-plan/types'
import { formatVisitPlanWeeklyHours, visitPlanWeeklyPlannedMinutes } from '@/features/service-users/visit-plan/visit-plan-weekly-hours.util'
import { toastApiError, toastSuccess, toastWarning } from '@/shared/lib/toast'
import {
  allocationWarningsSummary,
  isDragAllocationHardBlock,
  warningsFromAllocateError,
} from '@/features/scheduling/utils/allocate-job-warnings.util'
import {
  CARER_ROTA_CONFLICT_MESSAGE,
  scheduleJobCarerRotaConflictMessage,
} from '@/features/scheduling/utils/schedule-job-carer-rota-conflict.util'
import {
  buildScheduleJobsBoard,
  jobRequiredCarerMinutes,
  shiftIsoDate,
} from '@/features/scheduling/utils/schedule-jobs-timeline.util'
import {
  applyScheduleJobsServiceUserFilter,
  buildScheduleJobsServiceUserOptions,
  findScheduleJobsServiceUserBrief,
} from '@/features/scheduling/utils/schedule-jobs-service-user-filter.util'
import { serviceUserLabel, activeJobAllocationCount, todayIso } from '@/features/scheduling/utils/scheduling-format'
import { collectOutsidePatternJobIds } from '@/features/scheduling/utils/schedule-jobs-outside-pattern.util'
import {
  applyScheduleJobOutcomeFilters,
  applyScheduleOperationalFilters,
  countScheduleCarersOnLeaveToday,
  countScheduleJobsByOperationalFilter,
  countScheduleJobsByOutcome,
  countScheduleJobsWithOperationalIssues,
  DEFAULT_SCHEDULE_JOB_OUTCOME_FILTERS,
  parseScheduleCarerOperationalFilters,
  parseScheduleJobOperationalFilters,
  type ScheduleCarerOperationalFilter,
  type ScheduleJobOperationalFilter,
  type ScheduleJobOutcomeFilter,
} from '@/features/scheduling/utils/schedule-job-board-filter.util'
import {
  applyScheduleJobsRequiredCarersFilter,
  buildScheduleJobsRequiredCarersOptions,
  countScheduleJobsByRequiredCarers,
  parseScheduleJobsRequiredCarersFilters,
  scheduleJobsRequiredCarersFiltersLabel,
  type ScheduleJobsRequiredCarersFilterValue,
} from '@/features/scheduling/utils/schedule-jobs-required-carers-filter.util'
import {
  parseScheduleJobsLayout,
  type ScheduleJobsLayout,
} from '@/features/scheduling/utils/schedule-jobs-layout.util'
import {
  buildScheduleJobsServiceUserRows,
  parseScheduleJobsBoardRowAxis,
  type ScheduleJobsBoardRowAxis,
} from '@/features/scheduling/utils/schedule-jobs-board-axis.util'
import { schedulingKeys } from '@/features/scheduling/keys'
import { useQueryClient } from '@tanstack/react-query'

function parseCommaSeparatedFilterIds(value?: string | null): string[] {
  if (!value?.trim()) return []
  return value.split(',').map((id) => id.trim()).filter(Boolean)
}

function buildScheduleJobsSearch(params: {
  date: string
  locationIds: string[]
  serviceUserIds: string[]
  requiredCarersFilters: ScheduleJobsRequiredCarersFilterValue[]
  jobOperationalFilters?: ScheduleJobOperationalFilter[]
  carerOperationalFilters?: ScheduleCarerOperationalFilter[]
  layout?: ScheduleJobsLayout
  rowAxis?: ScheduleJobsBoardRowAxis
}) {
  return {
    date: params.date,
    ...(params.locationIds.length ? { locationId: params.locationIds.join(',') } : {}),
    ...(params.serviceUserIds.length ? { serviceUserId: params.serviceUserIds.join(',') } : {}),
    ...(params.requiredCarersFilters.length
      ? { requiredCarers: params.requiredCarersFilters.join(',') }
      : {}),
    ...(params.jobOperationalFilters?.length
      ? { op: params.jobOperationalFilters.join(',') }
      : {}),
    ...(params.carerOperationalFilters?.length
      ? { carerOp: params.carerOperationalFilters.join(',') }
      : {}),
    ...(params.layout && params.layout !== 'board' ? { layout: params.layout } : {}),
    ...(params.rowAxis && params.rowAxis !== 'carers' ? { rowAxis: params.rowAxis } : {}),
  }
}

export default function ScheduleJobsPage() {
  const hasApi = !!getApiBaseUrl()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const search = useSearch({ strict: false }) as {
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
  const [allocateJobId, setAllocateJobId] = React.useState<string | null>(null)
  const [allocateDialogPanel, setAllocateDialogPanel] =
    React.useState<ScheduleJobAllocateDialogPanel>('allocate')
  const [allocateOpen, setAllocateOpen] = React.useState(false)
  const [notesJob, setNotesJob] = React.useState<TimelineJob | null>(null)
  const [notesOpen, setNotesOpen] = React.useState(false)
  const [completeJobTarget, setCompleteJobTarget] = React.useState<TimelineJob | null>(null)
  const [completeOpen, setCompleteOpen] = React.useState(false)
  const [cancelJobTarget, setCancelJobTarget] = React.useState<TimelineJob | null>(null)
  const [cancelOpen, setCancelOpen] = React.useState(false)
  const [reinstateJobTarget, setReinstateJobTarget] = React.useState<TimelineJob | null>(null)
  const [reinstateOpen, setReinstateOpen] = React.useState(false)
  const [workspaceJob, setWorkspaceJob] = React.useState<TimelineJob | null>(null)
  const [workspaceOpen, setWorkspaceOpen] = React.useState(false)
  const [workspaceTab, setWorkspaceTab] = React.useState<ScheduleVisitWorkspaceTab>('overview')
  const [savingJobId, setSavingJobId] = React.useState<string | null>(null)
  const [jobOutcomeFilters, setJobOutcomeFilters] = React.useState(
    () => new Set(DEFAULT_SCHEDULE_JOB_OUTCOME_FILTERS),
  )
  const [jobOperationalFilters, setJobOperationalFilters] = React.useState<
    ScheduleJobOperationalFilter[]
  >(() => parseScheduleJobOperationalFilters(search.op))
  const [carerOperationalFilters, setCarerOperationalFilters] = React.useState<
    ScheduleCarerOperationalFilter[]
  >(() => parseScheduleCarerOperationalFilters(search.carerOp))
  const [createRunOpen, setCreateRunOpen] = React.useState(false)
  const [createRunJobs, setCreateRunJobs] = React.useState<TimelineJob[]>([])
  const { preferences: boardPreferences, setShowRunsOnBoard } = useScheduleJobsBoardPreferences()

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
        locationIds: partial?.locationIds ?? locationFilterIds,
        serviceUserIds: partial?.serviceUserIds ?? serviceUserFilterIds,
        requiredCarersFilters: partial?.requiredCarersFilters ?? requiredCarersFilters,
        jobOperationalFilters: partial?.jobOperationalFilters ?? jobOperationalFilters,
        carerOperationalFilters: partial?.carerOperationalFilters ?? carerOperationalFilters,
        layout: partial?.layout ?? layout,
        rowAxis: partial?.rowAxis ?? rowAxis,
      }),
    [
      date,
      locationFilterIds,
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

  const updateJob = useUpdateScheduledJob()
  const allocate = useAllocateJob()
  const unallocate = useUnallocateJob()
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
      setLocationFilterIds(next)
      setServiceUserFilterIds([])
      setRequiredCarersFilters([])
      updateScheduleJobsUrl({
        locationIds: next,
        serviceUserIds: [],
        requiredCarersFilters: [],
      })
    },
    [updateScheduleJobsUrl],
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
    setLocationFilterIds(parseCommaSeparatedFilterIds(search.locationId))
  }, [search.locationId])

  React.useEffect(() => {
    setServiceUserFilterIds(parseCommaSeparatedFilterIds(search.serviceUserId))
  }, [search.serviceUserId])

  React.useEffect(() => {
    setJobOperationalFilters(parseScheduleJobOperationalFilters(search.op))
  }, [search.op])

  React.useEffect(() => {
    setCarerOperationalFilters(parseScheduleCarerOperationalFilters(search.carerOp))
  }, [search.carerOp])

  const lookupsQuery = useEmployeeLookups(hasApi)
  const locations = lookupsQuery.data?.locations ?? []
  const scheduleAreasQuery = useScheduleAreas()
  const serviceUserLocationsQuery = useServiceUserLocations(hasApi)

  const employeesQuery = useScheduleEmployeesDay(date, hasApi)
  const dayRunsQuery = useScheduleDayRuns(date, hasApi, { limit: 300 })
  const weekStart = scheduleWeekStartIso(date)
  const weekTimelineQuery = useScheduleServiceUsersWeek(weekStart, hasApi)
  const employeeCatalogQuery = useQuery({
    queryKey: employeeKeys.allList({}),
    queryFn: () => listAllEmployees({}),
    enabled: hasApi,
    staleTime: 60_000,
  })

  const isLoading =
    employeesQuery.isLoading ||
    dayRunsQuery.isLoading ||
    employeeCatalogQuery.isLoading ||
    weekTimelineQuery.isLoading
  const employeesError = employeesQuery.isError || employeeCatalogQuery.isError
  const dayRunsError = dayRunsQuery.isError

  const runJobs = dayRunsQuery.data?.runs.flatMap((run) => run.jobs) ?? []
  const runlessJobs = dayRunsQuery.data?.unassignedJobs ?? []
  const allDayJobs = React.useMemo(() => [...runJobs, ...runlessJobs], [runJobs, runlessJobs])

  const branchFilterOptions = React.useMemo(() => {
    const summariesByLocationId = buildBranchSummariesFromTimelineJobs(allDayJobs)
    return buildServiceUserBranchFilterOptions({
      scheduleAreas: scheduleAreasQuery.data ?? [],
      zones: serviceUserLocationsQuery.data?.zones,
      summariesByLocationId,
    })
  }, [
    allDayJobs,
    scheduleAreasQuery.data,
    serviceUserLocationsQuery.data?.zones,
  ])

  const locationNameMap = React.useMemo(() => {
    const map = new Map(locations.map((loc) => [loc.id, loc.name]))
    for (const option of branchFilterOptions) {
      map.set(option.id, option.displayLabel)
    }
    return map
  }, [branchFilterOptions, locations])

  const employeeCatalogById = React.useMemo(
    () => new Map((employeeCatalogQuery.data ?? []).map((row) => [row.id, row])),
    [employeeCatalogQuery.data],
  )

  const employeeLocationCatalog = React.useMemo(
    () => buildEmployeeLocationCatalogMap(employeeCatalogQuery.data ?? []),
    [employeeCatalogQuery.data],
  )

  const filteredRunJobs = React.useMemo(
    () => filterTimelineJobsByLocation(runJobs, locationFilterIds),
    [locationFilterIds, runJobs],
  )
  const filteredRunlessJobs = React.useMemo(
    () => filterTimelineJobsByLocation(runlessJobs, locationFilterIds),
    [locationFilterIds, runlessJobs],
  )

  const employees = React.useMemo(
    () =>
      filterEmployeeDayRowsByLocation(
        mergeScheduleJobsEmployeeRoster(
          employeesQuery.data?.employees ?? [],
          employeeCatalogQuery.data ?? [],
          [...filteredRunJobs, ...filteredRunlessJobs],
        ),
        locationFilterIds,
        employeeLocationCatalog,
      ),
    [
      employeesQuery.data?.employees,
      employeeCatalogQuery.data,
      filteredRunJobs,
      filteredRunlessJobs,
      locationFilterIds,
      employeeLocationCatalog,
    ],
  )

  const board = React.useMemo(
    () => buildScheduleJobsBoard(employees, filteredRunJobs, filteredRunlessJobs),
    [employees, filteredRunJobs, filteredRunlessJobs],
  )

  const visitPlanLookupServiceUserIds = React.useMemo(() => {
    const weekSuIds =
      weekTimelineQuery.data?.serviceUsers.map((row) => row.serviceUser.id) ?? []
    const daySuIds = board.allJobs.map((job) => job.serviceUserId)
    return [...new Set([...daySuIds, ...weekSuIds, ...serviceUserFilterIds].filter(Boolean))]
  }, [board.allJobs, weekTimelineQuery.data, serviceUserFilterIds])

  const visitPlanContractByServiceUser = useVisitPlanContractByServiceUser(
    visitPlanLookupServiceUserIds,
  )
  const acceptedCarePlansByServiceUser = useAcceptedCarePlansByServiceUser(
    visitPlanLookupServiceUserIds,
  )
  const visitPlanSlotsByServiceUser = React.useMemo(() => {
    const map = new Map<string, VisitPlanSlot[]>()
    for (const [serviceUserId, context] of visitPlanContractByServiceUser) {
      if (context.slots.length > 0) map.set(serviceUserId, context.slots)
    }
    return map
  }, [visitPlanContractByServiceUser])

  const serviceUserOptions = React.useMemo(
    () => buildScheduleJobsServiceUserOptions(board.allJobs),
    [board.allJobs],
  )

  React.useEffect(() => {
    if (!serviceUserFilterIds.length) return
    const valid = serviceUserFilterIds.filter((id) =>
      serviceUserOptions.some((option) => option.id === id),
    )
    if (valid.length !== serviceUserFilterIds.length) {
      setServiceUserFilterIds(valid)
      updateScheduleJobsUrl({ serviceUserIds: valid })
    }
  }, [
    serviceUserFilterIds,
    serviceUserOptions,
    updateScheduleJobsUrl,
  ])

  const boardAfterServiceUser = React.useMemo(
    () =>
      applyScheduleJobsServiceUserFilter(board, serviceUserFilterIds, {
        visitPlanSlotsByServiceUser,
        employeeCatalogById,
      }),
    [board, serviceUserFilterIds, visitPlanSlotsByServiceUser, employeeCatalogById],
  )

  const requiredCarersCounts = React.useMemo(
    () => countScheduleJobsByRequiredCarers(boardAfterServiceUser.allJobs),
    [boardAfterServiceUser.allJobs],
  )

  const requiredCarersOptions = React.useMemo(
    () => buildScheduleJobsRequiredCarersOptions(requiredCarersCounts),
    [requiredCarersCounts],
  )

  const boardAfterRequiredCarers = React.useMemo(
    () => applyScheduleJobsRequiredCarersFilter(boardAfterServiceUser, requiredCarersFilters),
    [boardAfterServiceUser, requiredCarersFilters],
  )

  const jobOutcomeCounts = React.useMemo(
    () => countScheduleJobsByOutcome(boardAfterRequiredCarers.allJobs),
    [boardAfterRequiredCarers.allJobs],
  )

  const outsidePatternJobIds = React.useMemo(
    () => collectOutsidePatternJobIds(boardAfterRequiredCarers.employeeRows),
    [boardAfterRequiredCarers.employeeRows],
  )

  const jobOperationalCounts = React.useMemo(
    () => countScheduleJobsByOperationalFilter(boardAfterRequiredCarers.allJobs, outsidePatternJobIds),
    [boardAfterRequiredCarers.allJobs, outsidePatternJobIds],
  )

  const carerOnLeaveTodayCount = React.useMemo(
    () => countScheduleCarersOnLeaveToday(boardAfterRequiredCarers.employeeRows),
    [boardAfterRequiredCarers.employeeRows],
  )

  const operationalIssuesCount = React.useMemo(
    () => countScheduleJobsWithOperationalIssues(boardAfterRequiredCarers.allJobs),
    [boardAfterRequiredCarers.allJobs],
  )

  const filteredBoard = React.useMemo(() => {
    const afterOutcome = applyScheduleJobOutcomeFilters(boardAfterRequiredCarers, jobOutcomeFilters)
    return applyScheduleOperationalFilters(
      afterOutcome,
      new Set(jobOperationalFilters),
      new Set(carerOperationalFilters),
      outsidePatternJobIds,
    )
  }, [
    boardAfterRequiredCarers,
    jobOutcomeFilters,
    jobOperationalFilters,
    carerOperationalFilters,
    outsidePatternJobIds,
  ])

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

  const { employeeRows, unassignedJobs, cancelledJobs } = filteredBoard
  const serviceUserRows = React.useMemo(
    () => buildScheduleJobsServiceUserRows(filteredBoard.allJobs),
    [filteredBoard.allJobs],
  )
  const allJobs = board.allJobs

  const openVisitWorkspace = React.useCallback(
    (job: TimelineJob, tab: ScheduleVisitWorkspaceTab = 'overview') => {
      setWorkspaceJob(job)
      setWorkspaceTab(tab)
      setWorkspaceOpen(true)
    },
    [],
  )

  const resolveJobForAction = React.useCallback(
    async (jobId: string): Promise<TimelineJob | null> => {
      const fromBoard = allJobs.find((row) => row.id === jobId)
      if (fromBoard) return fromBoard
      try {
        return await getScheduledJob(jobId)
      } catch {
        return null
      }
    },
    [allJobs],
  )

  React.useEffect(() => {
    const jobId = search.actionJobId
    const action = search.visitAction
    if (!jobId || !action) return

    let cancelled = false
    void resolveJobForAction(jobId).then((job) => {
      if (cancelled || !job) return
      if (action === 'workspace') {
        openVisitWorkspace(job, search.visitTab ?? 'overview')
      } else if (action === 'complete') {
        setCompleteJobTarget(job)
        setCompleteOpen(true)
      } else if (action === 'notes') {
        setNotesJob(job)
        setNotesOpen(true)
      } else if (action === 'allocate') {
        setAllocateJobId(job.id)
        setAllocateDialogPanel('allocate')
        setAllocateOpen(true)
      }
      updateScheduleJobsUrl()
    })

    return () => {
      cancelled = true
    }
  }, [
    search.actionJobId,
    search.visitAction,
    search.visitTab,
    resolveJobForAction,
    openVisitWorkspace,
    updateScheduleJobsUrl,
  ])
  const carers = board.carers

  const generalSettingsQuery = useGeneralSettings(hasApi)
  const travelBufferMinutes = React.useMemo(
    () => resolveTimeBetweenJobsBufferMinutes(generalSettingsQuery.data?.domCareAllocationRules),
    [generalSettingsQuery.data?.domCareAllocationRules],
  )
  const contractedHoursByServiceUser = React.useMemo(() => {
    const map = new Map<string, number>()
    for (const [serviceUserId, context] of visitPlanContractByServiceUser) {
      if (context.contractedHours != null) map.set(serviceUserId, context.contractedHours)
    }
    return map
  }, [visitPlanContractByServiceUser])
  const weekJobs = React.useMemo(
    () => filterTimelineJobsByLocation(
      weekTimelineQuery.data?.serviceUsers.flatMap((row) => row.jobs) ?? [],
      locationFilterIds,
    ),
    [weekTimelineQuery.data, locationFilterIds],
  )
  const excessContractedJobIds = React.useMemo(
    () =>
      mergedExcessWeeklyContractedJobIds(
        weekJobs,
        contractedHoursByServiceUser,
        visitPlanSlotsByServiceUser,
        weekStart,
        date,
      ),
    [
      weekJobs,
      contractedHoursByServiceUser,
      visitPlanSlotsByServiceUser,
      weekStart,
      date,
    ],
  )
  const callPatternOverContract = React.useMemo(() => {
    return [...visitPlanContractByServiceUser.entries()]
      .map(([serviceUserId, context]) => {
        const plannedMinutes = visitPlanWeeklyPlannedMinutes(context.slots, { anchorIso: date })
        const contractedHours = context.contractedHours
        if (contractedHours == null || contractedHours <= 0) return null
        const contractedMinutes = Math.round(contractedHours * 60)
        if (plannedMinutes <= contractedMinutes) return null
        return {
          serviceUserId,
          plannedMinutes,
          contractedHours,
          excessMinutes: plannedMinutes - contractedMinutes,
        }
      })
      .filter((row): row is NonNullable<typeof row> => row != null)
  }, [visitPlanContractByServiceUser, date])
  const excessContractedOnDay = React.useMemo(
    () => allJobs.filter((job) => excessContractedJobIds.has(job.id)).length,
    [allJobs, excessContractedJobIds],
  )
  const weeklyContractSummary = React.useMemo(
    () => summarizeWeeklyContractUsage(weekJobs, contractedHoursByServiceUser),
    [weekJobs, contractedHoursByServiceUser],
  )

  const requiredMinutes = allJobs.reduce((sum, job) => sum + jobRequiredCarerMinutes(job), 0)
  const bookedMinutes = carers.reduce((sum, row) => sum + row.totalMinutes, 0)
  const overBookedMinutes = Math.max(0, bookedMinutes - requiredMinutes)
  const overAllocatedJobIds = React.useMemo(
    () =>
      new Set(
        allJobs
          .filter((job) => activeJobAllocationCount(job) > job.requiredCarers)
          .map((job) => job.id),
      ),
    [allJobs],
  )
  const carersWorking = carers.length

  const allocateJob = allocateJobId ? allJobs.find((j) => j.id === allocateJobId) ?? null : null
  const completeJob = completeJobTarget
    ? allJobs.find((job) => job.id === completeJobTarget.id) ?? completeJobTarget
    : null

  const refreshBoard = React.useCallback(async () => {
    await Promise.all([
      employeesQuery.refetch(),
      dayRunsQuery.refetch(),
      employeeCatalogQuery.refetch(),
      weekTimelineQuery.refetch(),
      queryClient.invalidateQueries({ queryKey: schedulingKeys.runs({ runDate: date }) }),
    ])
  }, [date, dayRunsQuery, employeeCatalogQuery, employeesQuery, queryClient, weekTimelineQuery])

  const runEdit = useScheduleRunEditDialog({
    date,
    travelBufferMinutes,
    onChanged: () => void refreshBoard(),
  })

  const dayRuns = dayRunsQuery.data?.runs ?? []
  const runReassign = useScheduleRunReassignDialog({
    date,
    runs: dayRuns,
    onChanged: () => void refreshBoard(),
    onOpenFullEditor: runEdit.openEditRunById,
  })

  const openAllocate = React.useCallback(
    (job: TimelineJob, panel: ScheduleJobAllocateDialogPanel = 'allocate') => {
      setAllocateJobId(job.id)
      setAllocateDialogPanel(panel)
      setAllocateOpen(true)
    },
    [],
  )

  const handleUnallocateJob = React.useCallback(
    async (job: TimelineJob) => {
      const employeeIds = (job.allocations ?? []).map((allocation) => allocation.employeeId)
      if (employeeIds.length === 0) return
      setSavingJobId(job.id)
      try {
        for (const employeeId of employeeIds) {
          await unallocate.mutateAsync({ jobId: job.id, employeeId })
        }
        toastSuccess('Job unallocated', 'All carers were removed from this job.')
        await refreshBoard()
      } catch (error) {
        toastApiError(error, 'Could not unallocate job')
        await refreshBoard()
      } finally {
        setSavingJobId(null)
      }
    },
    [refreshBoard, unallocate],
  )

  const handleJobAction = React.useCallback(
    (job: TimelineJob, action: ScheduleJobContextAction) => {
      const readOnly = isScheduleJobReadOnly(job)
      if (
        readOnly &&
        action !== 'allocate-employees' &&
        action !== 'add-notes' &&
        action !== 'open-visit-workspace' &&
        action !== 'open-run' &&
        action !== 'reassign-run' &&
        action !== 'reinstate-job'
      ) {
        return
      }
      if (readOnly && action === 'add-notes') {
        setNotesJob(job)
        setNotesOpen(true)
        return
      }

      switch (action) {
        case 'open-visit-workspace':
          openVisitWorkspace(job)
          return
        case 'open-run':
          if (job.scheduleRunId) runEdit.openEditRunById(job.scheduleRunId)
          return
        case 'reassign-run':
          if (job.scheduleRunId) runReassign.openForRunId(job.scheduleRunId)
          return
        case 'unallocate-job':
          void handleUnallocateJob(job)
          return
        case 'complete-job':
          setCompleteJobTarget(job)
          setCompleteOpen(true)
          return
        case 'cancel-job':
          setCancelJobTarget(job)
          setCancelOpen(true)
          return
        case 'reinstate-job':
          setReinstateJobTarget(job)
          setReinstateOpen(true)
          return
        case 'add-notes':
          setNotesJob(job)
          setNotesOpen(true)
          return
        case 'allocate-employees':
          openAllocate(job, 'allocate')
          return
        case 'unallocate-employees':
          openAllocate(job, 'unallocate')
          return
        case 'change-time':
          openAllocate(job, 'time')
          return
        default:
          return
      }
    },
    [handleUnallocateJob, openAllocate, openVisitWorkspace, refreshBoard, runEdit.openEditRunById, runReassign.openForRunId],
  )

  const handleRefresh = () => {
    void Promise.all([
      employeesQuery.refetch(),
      dayRunsQuery.refetch(),
      employeeCatalogQuery.refetch(),
      weekTimelineQuery.refetch(),
    ])
  }

  const handleJobDrop = React.useCallback(
    async (payload: JobDropPayload) => {
      const { job, sourceRow, targetRow, scheduledStartDateTime, scheduledEndDateTime } = payload
      if (isScheduleJobReadOnly(job)) {
        toastWarning('Cannot move job', 'Completed and cancelled jobs are read only.')
        return
      }

      if (rowAxis === 'service-users') {
        if (targetRow.kind === 'service-user' && targetRow.serviceUserId !== job.serviceUserId) {
          toastWarning('Cannot move visit', 'This visit stays on its service user row.')
          return
        }
        if (targetRow.kind === 'unassigned' || targetRow.kind === 'cancelled') {
          return
        }
        if (!scheduleTimesChanged(job, { scheduledStartDateTime, scheduledEndDateTime })) {
          return
        }
        const runConflict = scheduleRunDragConflictMessage(job, {
          targetRow,
          scheduledStartDateTime,
        })
        if (runConflict) {
          toastWarning('Run schedule conflict', runConflict)
        }
        setSavingJobId(job.id)
        try {
          await updateJob.mutateAsync({
            jobId: job.id,
            scheduledStartDateTime,
            scheduledEndDateTime,
          })
          toastSuccess('Schedule updated')
          await Promise.all([employeesQuery.refetch(), dayRunsQuery.refetch()])
        } catch (error) {
          toastApiError(error, 'Could not update schedule')
          await Promise.all([employeesQuery.refetch(), dayRunsQuery.refetch()])
        } finally {
          setSavingJobId(null)
        }
        return
      }

      if (targetRow.kind === 'cancelled') {
        toastWarning('Cannot move job', 'Cancelled visits stay on the Cancelled row.')
        return
      }
      const timesChanged = scheduleTimesChanged(job, { scheduledStartDateTime, scheduledEndDateTime })
      const rowChanged = !rowsEqual(sourceRow, targetRow)
      if (!timesChanged && !rowChanged) return

      const sourceCarerId = sourceRow.kind === 'carer' ? sourceRow.employeeId : null
      const targetCarerId = targetRow.kind === 'carer' ? targetRow.employeeId : null

      if (targetCarerId && targetCarerId !== sourceCarerId && targetRow.kind === 'carer') {
        const locationConflict = scheduleJobCarerLocationConflictMessage(
          job,
          targetRow,
          employeeLocationCatalog,
          locationNameMap,
        )
        if (locationConflict) {
          toastWarning('Different location', locationConflict)
          return
        }
      }

      const assignCarerId =
        targetRow.kind === 'carer'
          ? targetCarerId
          : sourceRow.kind === 'carer' && !targetCarerId
            ? sourceCarerId
            : null
      if (assignCarerId) {
        const rotaConflict = scheduleJobCarerRotaConflictMessage(
          job,
          assignCarerId,
          boardAfterRequiredCarers.allJobs,
          { scheduledStartDateTime, scheduledEndDateTime },
        )
        if (rotaConflict) {
          toastWarning('Carer not assigned', rotaConflict)
          return
        }
      }

      const runConflict = scheduleRunDragConflictMessage(job, {
        targetRow,
        scheduledStartDateTime,
      })
      if (runConflict) {
        toastWarning('Run schedule conflict', runConflict)
      }

      setSavingJobId(job.id)
      try {
        if (timesChanged) {
          await updateJob.mutateAsync({
            jobId: job.id,
            scheduledStartDateTime,
            scheduledEndDateTime,
          })
        }

        if (targetCarerId && targetCarerId !== sourceCarerId) {
          if (sourceCarerId) {
            await unallocate.mutateAsync({ jobId: job.id, employeeId: sourceCarerId })
          }
          try {
            await allocate.mutateAsync({ jobId: job.id, employeeId: targetCarerId, force: false })
          } catch (allocateError) {
            const warnings = warningsFromAllocateError(allocateError)
            if (warnings.length > 0) {
              if (!isDragAllocationHardBlock(warnings)) {
                await allocate.mutateAsync({
                  jobId: job.id,
                  employeeId: targetCarerId,
                  force: true,
                })
              } else {
                toastWarning(
                  'Carer not assigned',
                  allocationWarningsSummary(warnings) || CARER_ROTA_CONFLICT_MESSAGE,
                )
                if (sourceCarerId) {
                  await allocate.mutateAsync({
                    jobId: job.id,
                    employeeId: sourceCarerId,
                    force: true,
                  })
                }
                await Promise.all([employeesQuery.refetch(), dayRunsQuery.refetch()])
                return
              }
            } else {
              throw allocateError
            }
          }
        } else if (!targetCarerId && sourceCarerId) {
          await unallocate.mutateAsync({ jobId: job.id, employeeId: sourceCarerId })
        }

        toastSuccess('Schedule updated')
        await Promise.all([employeesQuery.refetch(), dayRunsQuery.refetch()])
      } catch (error) {
        toastApiError(error, 'Could not update schedule')
        await Promise.all([employeesQuery.refetch(), dayRunsQuery.refetch()])
      } finally {
        setSavingJobId(null)
      }
    },
    [
      allocate,
      boardAfterRequiredCarers.allJobs,
      dayRunsQuery,
      employeeLocationCatalog,
      employeesQuery,
      locationNameMap,
      rowAxis,
      unallocate,
      updateJob,
    ],
  )

  if (!hasApi) {
    return (
      <div className="p-6 text-sm text-muted-foreground">Configure VITE_API_BASE_URL to load the schedule.</div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col p-4 md:p-5">
      <PageHeader
        title="Schedule Jobs"
        description={
          layout === 'runs'
            ? 'Group and order visits into carer runs for the day — table view with route stats.'
            : 'Daily rota board — drag jobs to reschedule, drag on the timeline to group visits into a run.'
        }
        breadcrumb={[
          { label: 'Home', href: '/' },
          { label: 'Scheduling', href: '/scheduling/view' },
          { label: 'Schedule Jobs' },
        ]}
        className="shrink-0"
      />

      <ScheduleJobsToolbar
        date={date}
        locationIds={locationFilterIds}
        branchFilterOptions={branchFilterOptions}
        allBranchesLabel={`All branches (${allDayJobs.length})`}
        onLocationChange={setScheduleLocationFilter}
        serviceUserIds={serviceUserFilterIds}
        serviceUsers={serviceUserOptions}
        allServiceUsersLabel={`All service users (${serviceUserOptions.length})`}
        onServiceUserChange={setScheduleServiceUserFilter}
        requiredCarersFilters={requiredCarersFilters}
        requiredCarersOptions={requiredCarersOptions}
        onRequiredCarersFiltersChange={setScheduleRequiredCarersFilters}
        allVisitsLabel={`All visits (${boardAfterServiceUser.allJobs.length})`}
        onPrevDay={() => setScheduleDate(shiftIsoDate(date, -1))}
        onNextDay={() => setScheduleDate(shiftIsoDate(date, 1))}
        onToday={() => setScheduleDate(todayIso())}
        onDateChange={setScheduleDate}
        onRefresh={handleRefresh}
        isLoading={isLoading}
        hasError={employeesError || dayRunsError}
        requiredMinutes={requiredMinutes}
        bookedMinutes={bookedMinutes}
        overBookedMinutes={overBookedMinutes}
        carersOnBoard={employeeRows.length}
        carersWorking={carersWorking}
        unassignedCount={unassignedJobs.length}
        excessContractedCount={excessContractedOnDay}
        weeklyContractedMinutes={weeklyContractSummary.contractedMinutes}
        weeklyBookedVisitMinutes={weeklyContractSummary.bookedVisitMinutes}
        weeklyExcessContractMinutes={weeklyContractSummary.excessVisitMinutes}
        jobOutcomeFilters={jobOutcomeFilters}
        jobOutcomeCounts={jobOutcomeCounts}
        onToggleJobOutcomeFilter={toggleJobOutcomeFilter}
        jobOperationalFilters={jobOperationalFilters}
        jobOperationalCounts={jobOperationalCounts}
        onToggleJobOperationalFilter={toggleJobOperationalFilter}
        carerOperationalFilters={carerOperationalFilters}
        carerOnLeaveTodayCount={carerOnLeaveTodayCount}
        onToggleCarerOperationalFilter={toggleCarerOperationalFilter}
        operationalIssuesCount={operationalIssuesCount}
        layout={layout}
        onLayoutChange={setScheduleLayout}
        rowAxis={rowAxis}
        onRowAxisChange={setScheduleRowAxis}
        showRunsOnBoard={boardPreferences.showRunsOnBoard}
        onShowRunsOnBoardChange={setShowRunsOnBoard}
      />

      {layout === 'board' &&
      (locationFilterIds.length > 0 ||
        serviceUserFilterIds.length > 0 ||
        requiredCarersFilters.length > 0) ? (
        <p className="mb-2 shrink-0 text-xs text-muted-foreground">
          {locationFilterIds.length > 0 ? (
            <>
              Showing carers at selected branches (primary or base) and jobs for service users assigned to{' '}
              <span className="font-medium text-foreground">
                {branchFilterOptions
                  .filter((option) => locationFilterIds.includes(option.id))
                  .map((option) => option.displayLabel)
                  .join(' · ') || 'selected branches'}
              </span>
              {serviceUserFilterIds.length > 0 || requiredCarersFilters.length > 0 ? '. ' : '.'}
            </>
          ) : null}
          {serviceUserFilterIds.length > 0 ? (
            <>
              Showing visits for{' '}
              <span className="font-medium text-foreground">
                {serviceUserFilterIds
                  .map((id) => {
                    const su =
                      findScheduleJobsServiceUserBrief(board.allJobs, id) ?? {
                        id,
                        firstName: 'Service',
                        lastName: 'user',
                      }
                    return serviceUserLabel(su)
                  })
                  .join(' · ')}
              </span>
              {requiredCarersFilters.length > 0 ? '. ' : '.'}
            </>
          ) : null}
          {requiredCarersFilters.length > 0 ? (
            <>
              Showing{' '}
              <span className="font-medium text-foreground">
                {scheduleJobsRequiredCarersFiltersLabel(requiredCarersFilters).toLowerCase()}
              </span>{' '}
              visits only.
            </>
          ) : null}
        </p>
      ) : null}

      {layout === 'board' && callPatternOverContract.length > 0 ? (
        <div className="mb-3 shrink-0 rounded-lg border border-amber-300 bg-amber-50/90 px-4 py-3 dark:border-amber-900 dark:bg-amber-950/30">
          <div className="flex gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" />
            <div className="min-w-0 space-y-1 text-sm">
              <p className="font-medium text-amber-950 dark:text-amber-50">
                Call pattern exceeds weekly contracted hours
              </p>
              {callPatternOverContract.map((row) => {
                const suName =
                  allJobs.find((job) => job.serviceUserId === row.serviceUserId)?.serviceUser ??
                  weekJobs.find((job) => job.serviceUserId === row.serviceUserId)?.serviceUser
                const label = suName
                  ? [suName.firstName, suName.lastName].filter(Boolean).join(' ').trim()
                  : 'Service user'
                return (
                  <p key={row.serviceUserId} className="text-xs text-amber-900 dark:text-amber-100">
                    <strong className="font-semibold">{label}</strong>: call pattern plans{' '}
                    {formatVisitPlanWeeklyHours(row.plannedMinutes)}/week but contract is{' '}
                    {row.contractedHours}h ({formatVisitPlanWeeklyHours(row.excessMinutes)} over). Jobs
                    beyond the contract show <strong className="font-semibold">amber stripes</strong> on
                    the board — the rota is not blocked automatically.
                  </p>
                )
              })}
            </div>
          </div>
        </div>
      ) : null}

      {layout === 'board' ? (
        <p className="mb-3 shrink-0 text-xs text-muted-foreground">
          Jobs come from generated rota. After changing call pattern on a visit plan, save the plan and use{' '}
          <Link to="/scheduling/bulk-generate-rota" className="font-medium text-foreground underline-offset-2 hover:underline">
            Bulk generate rota
          </Link>{' '}
          or <strong className="font-medium text-foreground">Generate rota</strong> on each visit plan — then refresh
          this board.
        </p>
      ) : null}

      <div className="min-h-0 flex-1">
        {layout === 'runs' ? (
          <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <ScheduleRunsPanel
              embedded
              date={date}
              unassignedJobs={runlessJobs}
              onChanged={() => void refreshBoard()}
              onJobClick={openAllocate}
              travelBufferMinutes={travelBufferMinutes}
              visitPlanSlotsByServiceUser={visitPlanSlotsByServiceUser}
              acceptedCarePlansByServiceUser={acceptedCarePlansByServiceUser}
            />
          </div>
        ) : (
        <ScheduleJobsGantt
          date={date}
          rowAxis={rowAxis}
          employeeRows={employeeRows}
          serviceUserRows={serviceUserRows}
          unassignedJobs={unassignedJobs}
          cancelledJobs={cancelledJobs}
          runs={dayRunsQuery.data?.runs ?? []}
          showRunsOnBoard={boardPreferences.showRunsOnBoard}
          employeeCatalogById={employeeCatalogById}
          locationNames={locationNameMap}
          savingJobId={savingJobId}
          excessContractedJobIds={excessContractedJobIds}
          outsidePatternJobIds={outsidePatternJobIds}
          overAllocatedJobIds={overAllocatedJobIds}
          visitPlanSlotsByServiceUser={visitPlanSlotsByServiceUser}
          acceptedCarePlansByServiceUser={acceptedCarePlansByServiceUser}
          travelBufferMinutes={travelBufferMinutes}
          onJobClick={openAllocate}
          onJobAction={handleJobAction}
          onOpenRun={runEdit.openEditRunById}
          onReassignRun={runReassign.openForRunId}
          onJobDrop={handleJobDrop}
          onJobsSelectedForRun={(jobs) => {
            setCreateRunJobs(jobs)
            setCreateRunOpen(true)
          }}
        />
        )}
      </div>

      <ScheduleJobAllocateDialog
        open={allocateOpen}
        onOpenChange={(open) => {
          setAllocateOpen(open)
          if (!open) {
            setAllocateJobId(null)
            setAllocateDialogPanel('allocate')
          }
        }}
        job={allocateJob}
        initialPanel={allocateDialogPanel}
        visitPlanSlotsByServiceUser={visitPlanSlotsByServiceUser}
        boardJobs={allJobs}
        onAllocated={() => {
          void refreshBoard()
        }}
      />

      <ScheduleVisitWorkspaceSheet
        open={workspaceOpen}
        onOpenChange={(open) => {
          setWorkspaceOpen(open)
          if (!open) setWorkspaceJob(null)
        }}
        job={workspaceJob}
        date={date}
        defaultTab={workspaceTab}
        onCompleteVisit={(job) => {
          setWorkspaceOpen(false)
          setCompleteJobTarget(job)
          setCompleteOpen(true)
        }}
        onAddNotes={(job) => {
          setWorkspaceOpen(false)
          setNotesJob(job)
          setNotesOpen(true)
        }}
        onAllocate={(job) => {
          setWorkspaceOpen(false)
          openAllocate(job, 'allocate')
        }}
      />

      <ScheduleJobCompleteDialog
        open={completeOpen}
        onOpenChange={(open) => {
          setCompleteOpen(open)
          if (!open) setCompleteJobTarget(null)
        }}
        job={completeJob}
        onCompleted={() => {
          void refreshBoard()
        }}
        onJobUpdated={() => {
          void refreshBoard()
        }}
      />

      <ScheduleJobCancelDialog
        open={cancelOpen}
        onOpenChange={(open) => {
          setCancelOpen(open)
          if (!open) setCancelJobTarget(null)
        }}
        job={cancelJobTarget}
        visitPlanSlotsByServiceUser={visitPlanSlotsByServiceUser}
        onCancelled={() => {
          void refreshBoard()
        }}
      />

      <ScheduleJobReinstateDialog
        open={reinstateOpen}
        onOpenChange={(open) => {
          setReinstateOpen(open)
          if (!open) setReinstateJobTarget(null)
        }}
        job={reinstateJobTarget}
        onReinstated={() => {
          void refreshBoard()
        }}
      />

      <ScheduleJobNotesDialog
        open={notesOpen}
        onOpenChange={(open) => {
          setNotesOpen(open)
          if (!open) setNotesJob(null)
        }}
        job={notesJob}
        onSaved={() => {
          void refreshBoard()
        }}
      />

      <ScheduleRunCreateDialog
        open={createRunOpen}
        onOpenChange={(open) => {
          setCreateRunOpen(open)
          if (!open) setCreateRunJobs([])
        }}
        jobs={createRunJobs}
        date={date}
        travelBufferMinutes={travelBufferMinutes}
        existingRunCount={dayRunsQuery.data?.runs.length ?? 0}
        onCreated={() => {
          void refreshBoard()
        }}
      />

      <ScheduleRunEditDialog {...runEdit.dialogProps} />
      <ScheduleRunReassignDialog {...runReassign.dialogProps} />
    </div>
  )
}
