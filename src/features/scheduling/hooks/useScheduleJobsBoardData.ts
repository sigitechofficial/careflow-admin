import * as React from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useEmployeeLookups } from '@/features/employees/hooks/useEmployees'
import {
  useScheduleDayRuns,
  useScheduleEmployeesDay,
  useScheduleServiceUsersWeek,
  useScheduleAreas,
} from '@/features/scheduling/hooks/useScheduling'
import { useScheduleEmployeesCatalog } from '@/features/scheduling/hooks/useScheduleEmployeesCatalog'
import { useServiceUserLocations } from '@/features/settings/hooks/useLocationManagement'
import {
  buildBranchSummariesFromTimelineJobs,
  buildServiceUserBranchFilterOptions,
} from '@/features/settings/location-management/build-service-user-branch-filter-options'
import { mergeScheduleJobsEmployeeRoster } from '@/features/scheduling/utils/schedule-jobs-employee-roster.util'
import {
  buildEmployeeLocationCatalogMap,
  filterEmployeeDayRowsByLocation,
  filterTimelineJobsByLocation,
} from '@/features/scheduling/utils/schedule-jobs-location-filter.util'
import {
  buildCarersOverContract,
  buildServiceUsersOverPackage,
  mergedExcessWeeklyContractedJobIds,
  scheduleWeekStartIso,
  summarizeWeeklyContractUsage,
} from '@/features/scheduling/utils/schedule-jobs-contracted-hours.util'
import { useVisitPlanContractByServiceUser, useAcceptedCarePlansByServiceUser } from '@/features/service-users/visit-plan/hooks'
import { useGeneralSettings } from '@/features/settings/hooks/useGeneralSettings'
import { resolveTimeBetweenJobsBufferMinutes } from '@/features/scheduling/utils/schedule-job-travel-buffer.util'
import type { VisitPlanSlot } from '@/features/service-users/visit-plan/types'
import { buildEmployeeNameMap } from '@/features/employees/lib/employee-display-name'
import {
  buildScheduleJobsBoard,
  jobRequiredCarerMinutes,
} from '@/features/scheduling/utils/schedule-jobs-timeline.util'
import {
  applyScheduleJobsServiceUserFilter,
  buildScheduleJobsServiceUserOptions,
} from '@/features/scheduling/utils/schedule-jobs-service-user-filter.util'
import { activeJobAllocationCount } from '@/features/scheduling/utils/scheduling-format'
import { collectOutsidePatternJobIds } from '@/features/scheduling/utils/schedule-jobs-outside-pattern.util'
import {
  applyScheduleJobOutcomeFilters,
  applyScheduleOperationalFilters,
  countScheduleCarersOnLeaveToday,
  countScheduleJobsByOperationalFilter,
  countScheduleJobsByOutcome,
  countScheduleJobsWithOperationalIssues,
  type ScheduleCarerOperationalFilter,
  type ScheduleJobOperationalFilter,
  type ScheduleJobOutcomeFilter,
} from '@/features/scheduling/utils/schedule-job-board-filter.util'
import {
  applyScheduleJobsRequiredCarersFilter,
  buildScheduleJobsRequiredCarersOptions,
  countScheduleJobsByRequiredCarers,
  type ScheduleJobsRequiredCarersFilterValue,
} from '@/features/scheduling/utils/schedule-jobs-required-carers-filter.util'
import {
  applyScheduleJobsEmployeeFilter,
  buildCarerFilterOptionsFromJobs,
} from '@/features/scheduling/utils/schedule-shared-job-filters.util'
import {
  applyScheduleJobsTimeSensitiveFilter,
  countScheduleJobsTimeSensitive,
} from '@/features/scheduling/utils/schedule-job-time-sensitive.util'
import { buildScheduleJobsServiceUserRows } from '@/features/scheduling/utils/schedule-jobs-board-axis.util'
import { schedulingKeys } from '@/features/scheduling/keys'
import type { ScheduleJobsLayout } from '@/features/scheduling/utils/schedule-jobs-layout.util'
import type { ScheduleJobsBoardRowAxis } from '@/features/scheduling/utils/schedule-jobs-board-axis.util'

export type ScheduleJobsUrlUpdatePartial = {
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
}

export type UseScheduleJobsBoardDataParams = {
  hasApi: boolean
  date: string
  locationFilterIds: string[]
  serviceUserFilterIds: string[]
  employeeFilterIds: string[]
  requiredCarersFilters: ScheduleJobsRequiredCarersFilterValue[]
  jobOutcomeFilters: Set<ScheduleJobOutcomeFilter>
  jobOperationalFilters: ScheduleJobOperationalFilter[]
  carerOperationalFilters: ScheduleCarerOperationalFilter[]
  timeSensitiveFilter: boolean
  setServiceUserFilterIds: (ids: string[]) => void
  updateScheduleJobsUrl: (partial?: ScheduleJobsUrlUpdatePartial) => void
}

export function useScheduleJobsBoardData({
  hasApi,
  date,
  locationFilterIds,
  serviceUserFilterIds,
  employeeFilterIds,
  requiredCarersFilters,
  jobOutcomeFilters,
  jobOperationalFilters,
  carerOperationalFilters,
  timeSensitiveFilter,
  setServiceUserFilterIds,
  updateScheduleJobsUrl,
}: UseScheduleJobsBoardDataParams) {
  const queryClient = useQueryClient()

  const lookupsQuery = useEmployeeLookups(hasApi)
  const locations = lookupsQuery.data?.locations ?? []
  const scheduleAreasQuery = useScheduleAreas()
  const serviceUserLocationsQuery = useServiceUserLocations(hasApi)

  const employeesQuery = useScheduleEmployeesDay(date, hasApi)
  const dayRunsQuery = useScheduleDayRuns(date, hasApi, { limit: 300 })
  const weekStart = scheduleWeekStartIso(date)
  const weekTimelineQuery = useScheduleServiceUsersWeek(weekStart, hasApi)
  const employeeCatalogQuery = useScheduleEmployeesCatalog({ enabled: hasApi })

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

  const employeeCatalogById = employeeCatalogQuery.catalogById

  const employeeLocationCatalog = React.useMemo(
    () => buildEmployeeLocationCatalogMap(employeeCatalogQuery.employees),
    [employeeCatalogQuery.employees],
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
          employeeCatalogQuery.employees,
          [...filteredRunJobs, ...filteredRunlessJobs],
        ),
        locationFilterIds,
        employeeLocationCatalog,
      ),
    [
      employeesQuery.data?.employees,
      employeeCatalogQuery.employees,
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
    setServiceUserFilterIds,
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

  const carerFilterOptions = React.useMemo(
    () => buildCarerFilterOptionsFromJobs(boardAfterRequiredCarers.allJobs),
    [boardAfterRequiredCarers.allJobs],
  )

  const boardAfterEmployees = React.useMemo(
    () => applyScheduleJobsEmployeeFilter(boardAfterRequiredCarers, employeeFilterIds),
    [boardAfterRequiredCarers, employeeFilterIds],
  )

  const jobOutcomeCounts = React.useMemo(
    () => countScheduleJobsByOutcome(boardAfterEmployees.allJobs),
    [boardAfterEmployees.allJobs],
  )

  const outsidePatternJobIds = React.useMemo(
    () => collectOutsidePatternJobIds(boardAfterEmployees.employeeRows),
    [boardAfterEmployees.employeeRows],
  )

  const jobOperationalCounts = React.useMemo(
    () => countScheduleJobsByOperationalFilter(boardAfterEmployees.allJobs, outsidePatternJobIds),
    [boardAfterEmployees.allJobs, outsidePatternJobIds],
  )

  const carerOnLeaveTodayCount = React.useMemo(
    () => countScheduleCarersOnLeaveToday(boardAfterEmployees.employeeRows),
    [boardAfterEmployees.employeeRows],
  )

  const operationalIssuesCount = React.useMemo(
    () => countScheduleJobsWithOperationalIssues(boardAfterEmployees.allJobs),
    [boardAfterEmployees.allJobs],
  )

  const timeSensitiveCount = React.useMemo(
    () => countScheduleJobsTimeSensitive(boardAfterEmployees.allJobs, visitPlanSlotsByServiceUser),
    [boardAfterEmployees.allJobs, visitPlanSlotsByServiceUser],
  )

  const filteredBoard = React.useMemo(() => {
    const afterOutcome = applyScheduleJobOutcomeFilters(boardAfterEmployees, jobOutcomeFilters)
    const afterIssues = applyScheduleOperationalFilters(
      afterOutcome,
      new Set(jobOperationalFilters),
      new Set(carerOperationalFilters),
      outsidePatternJobIds,
    )
    return applyScheduleJobsTimeSensitiveFilter(
      afterIssues,
      timeSensitiveFilter,
      visitPlanSlotsByServiceUser,
    )
  }, [
    boardAfterEmployees,
    jobOutcomeFilters,
    jobOperationalFilters,
    carerOperationalFilters,
    outsidePatternJobIds,
    timeSensitiveFilter,
    visitPlanSlotsByServiceUser,
  ])

  const { employeeRows, unassignedJobs, cancelledJobs } = filteredBoard
  const allJobs = board.allJobs

  const carers = board.carers

  const generalSettingsQuery = useGeneralSettings(hasApi)
  const travelBufferMinutes = React.useMemo(
    () => resolveTimeBetweenJobsBufferMinutes(generalSettingsQuery.data?.domCareAllocationRules),
    [generalSettingsQuery.data?.domCareAllocationRules],
  )
  const weekJobs = React.useMemo(
    () => filterTimelineJobsByLocation(
      weekTimelineQuery.data?.serviceUsers.flatMap((row) => row.jobs) ?? [],
      locationFilterIds,
    ),
    [weekTimelineQuery.data, locationFilterIds],
  )
  const weekRosterJobsForAxis = React.useMemo(() => {
    if (!serviceUserFilterIds.length) return weekJobs
    const allowed = new Set(serviceUserFilterIds)
    return weekJobs.filter((job) => allowed.has(job.serviceUserId))
  }, [serviceUserFilterIds, weekJobs])
  const serviceUserRows = React.useMemo(
    () => buildScheduleJobsServiceUserRows(filteredBoard.allJobs, weekRosterJobsForAxis),
    [filteredBoard.allJobs, weekRosterJobsForAxis],
  )
  const contractedWeeklyHoursByEmployee = React.useMemo(() => {
    const map = new Map<string, number>()
    const setIfPresent = (employee: { id: string; contractedWeeklyHours?: number | null }) => {
      const hours = employee.contractedWeeklyHours
      if (hours != null && hours > 0) map.set(employee.id, Number(hours))
    }
    for (const row of employees) {
      setIfPresent(row.employee)
    }
    for (const job of weekJobs) {
      for (const allocation of job.allocations ?? []) {
        if (allocation.employee?.id) setIfPresent(allocation.employee)
      }
    }
    return map
  }, [employees, weekJobs])
  const contractedHoursByServiceUser = React.useMemo(() => {
    const map = new Map<string, number>()
    for (const [serviceUserId, context] of visitPlanContractByServiceUser) {
      if (context.contractedHours != null) map.set(serviceUserId, context.contractedHours)
    }
    return map
  }, [visitPlanContractByServiceUser])
  const employeeNameById = React.useMemo(
    () => buildEmployeeNameMap(employeeCatalogQuery.employees),
    [employeeCatalogQuery.employees],
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
  const serviceUsersOverPackage = React.useMemo(
    () => buildServiceUsersOverPackage(weekJobs, contractedHoursByServiceUser),
    [weekJobs, contractedHoursByServiceUser],
  )
  const carersOverContract = React.useMemo(
    () => buildCarersOverContract(weekJobs, contractedWeeklyHoursByEmployee),
    [weekJobs, contractedWeeklyHoursByEmployee],
  )
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

  const refreshBoard = React.useCallback(async () => {
    await Promise.all([
      employeesQuery.refetch(),
      dayRunsQuery.refetch(),
      employeeCatalogQuery.refetch(),
      weekTimelineQuery.refetch(),
      queryClient.invalidateQueries({ queryKey: schedulingKeys.runs({ runDate: date }) }),
    ])
  }, [date, dayRunsQuery, employeeCatalogQuery, employeesQuery, queryClient, weekTimelineQuery])

  const dayRuns = dayRunsQuery.data?.runs ?? []

  const handleRefresh = () => {
    void Promise.all([
      employeesQuery.refetch(),
      dayRunsQuery.refetch(),
      employeeCatalogQuery.refetch(),
      weekTimelineQuery.refetch(),
    ])
  }

  return {
    lookupsQuery,
    scheduleAreasQuery,
    serviceUserLocationsQuery,
    employeesQuery,
    dayRunsQuery,
    weekTimelineQuery,
    employeeCatalogQuery,
    generalSettingsQuery,
    isLoading,
    employeesError,
    dayRunsError,
    branchFilterOptions,
    locationNameMap,
    employeeCatalogById,
    employeeLocationCatalog,
    employeeRows,
    unassignedJobs,
    cancelledJobs,
    serviceUserRows,
    board,
    boardAfterServiceUser,
    allJobs,
    runlessJobs,
    runJobs,
    allDayJobs,
    jobOutcomeCounts,
    jobOperationalCounts,
    carerOnLeaveTodayCount,
    operationalIssuesCount,
    timeSensitiveCount,
    requiredCarersOptions,
    carerFilterOptions,
    serviceUserOptions,
    outsidePatternJobIds,
    boardAfterRequiredCarers,
    boardAfterEmployees,
    weekJobs,
    excessContractedJobIds,
    overAllocatedJobIds,
    serviceUsersOverPackage,
    carersOverContract,
    employeeNameById,
    excessContractedOnDay,
    weeklyContractSummary,
    requiredMinutes,
    bookedMinutes,
    overBookedMinutes,
    carersWorking,
    visitPlanSlotsByServiceUser,
    acceptedCarePlansByServiceUser,
    travelBufferMinutes,
    dayRuns,
    refreshBoard,
    handleRefresh,
  }
}
