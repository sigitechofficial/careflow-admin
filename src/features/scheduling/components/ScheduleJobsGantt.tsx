import * as React from 'react'
import { Clock } from 'lucide-react'
import { TooltipProvider } from '@/shared/ui/tooltip'
import { ScheduleCarerHoverCard } from '@/features/scheduling/components/ScheduleCarerHoverCard'
import { ScheduleJobsMarqueeOverlay } from '@/features/scheduling/components/ScheduleJobsMarqueeOverlay'
import { ScheduleJobsRunLegend } from '@/features/scheduling/components/ScheduleJobsRunLegend'
import { ScheduleServiceUserHoverCard } from '@/features/scheduling/components/ScheduleServiceUserHoverCard'
import type { ScheduleJobsGanttProps } from '@/features/scheduling/components/schedule-jobs-gantt/schedule-jobs-gantt.types'
import { scheduleJobsBoardMinWidth } from '@/features/scheduling/components/schedule-jobs-gantt/schedule-jobs-gantt.util'
import { ScheduleJobsGanttHeader } from '@/features/scheduling/components/schedule-jobs-gantt/ScheduleJobsGanttHeader'
import { ScheduleJobsGanttLegend } from '@/features/scheduling/components/schedule-jobs-gantt/ScheduleJobsGanttLegend'
import { ScheduleJobsGanttRow } from '@/features/scheduling/components/schedule-jobs-gantt/ScheduleJobsGanttRow'
import { useScheduleJobsDrag } from '@/features/scheduling/hooks/useScheduleJobsDrag'
import { useScheduleJobsMarqueeSelect } from '@/features/scheduling/hooks/useScheduleJobsMarqueeSelect'
import { useScheduleRunsDisplayPreferences } from '@/features/scheduling/hooks/useScheduleRunsDisplayPreferences'
import type { TimelineJob } from '@/features/scheduling/types/scheduling.types'
import {
  serviceUserBriefInitials,
  serviceUserRowSubtitle,
} from '@/features/scheduling/utils/schedule-jobs-board-axis.util'
import { parseScheduleJobsRowKey, scheduleJobsRowKey } from '@/features/scheduling/utils/schedule-jobs-drag.util'
import { resolveCarerDayAvailabilityBadge } from '@/features/scheduling/utils/schedule-jobs-availability.util'
import {
  filterScheduleJobsEmployeeRows,
  filterScheduleJobsServiceUserRows,
  normalizeScheduleJobsRowSearchQuery,
} from '@/features/scheduling/utils/schedule-jobs-row-search.util'
import {
  employeeBriefDisplayName,
  employeeBriefDuplicateNameIds,
  employeeBriefFullName,
  employeeBriefInitials,
  employeeBriefRowLabel,
  SCHEDULE_JOBS_CARER_COL_WIDTH,
  SCHEDULE_JOBS_HOUR_WIDTH,
} from '@/features/scheduling/utils/schedule-jobs-timeline.util'
import { resolveScheduleJobsTimelineViewport } from '@/features/scheduling/utils/schedule-jobs-timeline-viewport.util'
import { serviceUserLabel } from '@/features/scheduling/utils/scheduling-format'

export type { ScheduleJobsGanttProps } from '@/features/scheduling/components/schedule-jobs-gantt/schedule-jobs-gantt.types'

export function ScheduleJobsGantt({
  date,
  rowAxis = 'carers',
  employeeRows,
  serviceUserRows = [],
  unassignedJobs,
  cancelledJobs,
  runs = [],
  showRunsOnBoard = false,
  rotaGapDisplay = 'both',
  employeeCatalogById,
  locationNames,
  savingJobId,
  excessContractedJobIds,
  outsidePatternJobIds,
  overAllocatedJobIds,
  visitPlanSlotsByServiceUser,
  acceptedCarePlansByServiceUser,
  travelBufferMinutes,
  onJobClick,
  onJobAction,
  onJobDrop,
  onJobsSelectedForRun,
  onOpenRun,
  onReassignRun,
}: ScheduleJobsGanttProps) {
  const byServiceUser = rowAxis === 'service-users'
  const jobLabelMode = byServiceUser ? 'service-user-row' : 'carer-row'
  const leftColumnLabel = byServiceUser ? 'Service user' : 'Carer'
  const { preferences: runDisplayPreferences } = useScheduleRunsDisplayPreferences()
  const locationNameMap = locationNames ?? new Map<string, string>()
  const [focusedPeriodBandId, setFocusedPeriodBandId] = React.useState<string | null>(null)
  const [scrollClientWidth, setScrollClientWidth] = React.useState(0)
  const focusedTimelineGridWidth = React.useMemo(() => {
    if (!focusedPeriodBandId || scrollClientWidth <= 0) return undefined
    return Math.max(0, scrollClientWidth - SCHEDULE_JOBS_CARER_COL_WIDTH)
  }, [focusedPeriodBandId, scrollClientWidth])
  const viewport = React.useMemo(
    () => resolveScheduleJobsTimelineViewport(focusedPeriodBandId, focusedTimelineGridWidth),
    [focusedPeriodBandId, focusedTimelineGridWidth],
  )
  const boardMinWidth = React.useMemo(
    () => scheduleJobsBoardMinWidth(viewport, scrollClientWidth),
    [scrollClientWidth, viewport],
  )

  const handlePeriodBandDoubleClick = React.useCallback((bandId: string) => {
    setFocusedPeriodBandId(bandId)
  }, [])

  const handleClearPeriodFocus = React.useCallback(() => {
    setFocusedPeriodBandId(null)
  }, [])

  const getRowJobsForKey = React.useCallback(
    (rowKey: string) => {
      const ref = parseScheduleJobsRowKey(rowKey)
      if (ref?.kind === 'carer') {
        const row = employeeRows.find((employeeRow) => employeeRow.employee.id === ref.employeeId)
        return row?.allocations.map((allocation) => allocation.job) ?? []
      }
      if (ref?.kind === 'service-user') {
        const row = serviceUserRows.find(
          (serviceUserRow) => serviceUserRow.serviceUser.id === ref.serviceUserId,
        )
        return row?.jobs ?? []
      }
      if (ref?.kind === 'unassigned') return unassignedJobs
      return []
    },
    [employeeRows, serviceUserRows, unassignedJobs],
  )

  const drag = useScheduleJobsDrag({
    date,
    viewport,
    rowAxis,
    travelBufferMinutes,
    getRowJobsForKey,
    onJobDrop,
  })

  const jobsById = React.useMemo(() => {
    const map = new Map<string, TimelineJob>()
    if (byServiceUser) {
      for (const row of serviceUserRows) {
        for (const job of row.jobs) map.set(job.id, job)
      }
      return map
    }
    for (const job of unassignedJobs) map.set(job.id, job)
    for (const job of cancelledJobs) map.set(job.id, job)
    for (const row of employeeRows) {
      for (const allocation of row.allocations) {
        map.set(allocation.job.id, allocation.job)
      }
    }
    return map
  }, [byServiceUser, employeeRows, serviceUserRows, unassignedJobs, cancelledJobs])

  const handleSelectionComplete = React.useCallback(
    (jobs: TimelineJob[]) => {
      onJobsSelectedForRun?.(jobs)
    },
    [onJobsSelectedForRun],
  )

  const marquee = useScheduleJobsMarqueeSelect({
    jobsById,
    onSelectionComplete: handleSelectionComplete,
    minJobs: 2,
  })

  const duplicateNameIds = React.useMemo(
    () => employeeBriefDuplicateNameIds(employeeRows),
    [employeeRows],
  )
  const [rowSearch, setRowSearch] = React.useState('')
  const rowSearchPlaceholder = byServiceUser ? 'Search service users…' : 'Search carers…'

  const filteredEmployeeRows = React.useMemo(
    () => filterScheduleJobsEmployeeRows(employeeRows, rowSearch, duplicateNameIds),
    [duplicateNameIds, employeeRows, rowSearch],
  )
  const filteredServiceUserRows = React.useMemo(
    () => filterScheduleJobsServiceUserRows(serviceUserRows, rowSearch),
    [rowSearch, serviceUserRows],
  )

  const scrollRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    const updateWidth = () => setScrollClientWidth(el.clientWidth)
    updateWidth()

    const observer = new ResizeObserver(updateWidth)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  React.useEffect(() => {
    setRowSearch('')
    setFocusedPeriodBandId(null)
  }, [date, rowAxis])

  React.useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollLeft = focusedPeriodBandId ? 0 : 7 * SCHEDULE_JOBS_HOUR_WIDTH
  }, [date, focusedPeriodBandId, viewport.trackWidth])

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || !focusedPeriodBandId) return
      event.preventDefault()
      setFocusedPeriodBandId(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [focusedPeriodBandId])

  return (
    <TooltipProvider delayDuration={200} disableHoverableContent={false}>
      <ScheduleJobsMarqueeOverlay rect={marquee.marqueeRect} />
      <div
        data-schedule-jobs-board
        className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm"
      >
        <div data-schedule-jobs-legend>
          <ScheduleJobsGanttLegend
            focusedPeriodBandId={focusedPeriodBandId}
            onPeriodBandDoubleClick={handlePeriodBandDoubleClick}
            onClearPeriodFocus={handleClearPeriodFocus}
          />
          {showRunsOnBoard ? (
            <ScheduleJobsRunLegend runs={runs} onReassignRun={onReassignRun} />
          ) : null}
        </div>
        <div ref={scrollRef} data-schedule-jobs-scroll className="min-h-0 flex-1 overflow-x-auto overflow-y-auto">
          <div style={{ width: boardMinWidth, minWidth: boardMinWidth }}>
            <ScheduleJobsGanttHeader
              leftColumnLabel={leftColumnLabel}
              rowSearch={rowSearch}
              onRowSearchChange={setRowSearch}
              rowSearchPlaceholder={rowSearchPlaceholder}
              viewport={viewport}
              focusedPeriodBandId={focusedPeriodBandId}
              onPeriodBandDoubleClick={handlePeriodBandDoubleClick}
              onClearPeriodFocus={handleClearPeriodFocus}
              boardMinWidth={boardMinWidth}
            />

            {byServiceUser ? (
              <>
                {filteredServiceUserRows.map((row, index) => {
                  const label = serviceUserLabel(row.serviceUser)
                  const rowKey = scheduleJobsRowKey({
                    kind: 'service-user',
                    serviceUserId: row.serviceUser.id,
                  })
                  return (
                    <ScheduleJobsGanttRow
                      key={row.serviceUser.id}
                      rowKey={rowKey}
                      sourceRow={{ kind: 'service-user', serviceUserId: row.serviceUser.id }}
                      label={label}
                      subtitle={serviceUserRowSubtitle(row.serviceUser, row.jobs.length)}
                      avatarInitials={serviceUserBriefInitials(row.serviceUser)}
                      jobs={row.jobs}
                      date={date}
                      savingJobId={savingJobId}
                      draggingJobId={drag.draggingJobId}
                      alignJobsTop
                      excessContractedJobIds={excessContractedJobIds}
                      outsidePatternJobIds={outsidePatternJobIds}
                      overAllocatedJobIds={overAllocatedJobIds}
                      visitPlanSlotsByServiceUser={visitPlanSlotsByServiceUser}
                      acceptedCarePlansByServiceUser={acceptedCarePlansByServiceUser}
                      travelBufferMinutes={travelBufferMinutes}
                      previewJobIds={marquee.previewJobIds}
                      runDisplayPreferences={runDisplayPreferences}
                      jobLabelMode={jobLabelMode}
                      showRunsOnBoard={showRunsOnBoard}
                      rotaGapDisplay={rotaGapDisplay}
                      viewport={viewport}
                      boardMinWidth={boardMinWidth}
                      zebra={index % 2 === 1}
                      onPointerDown={drag.startDrag}
                      onJobClick={onJobClick}
                      onJobAction={onJobAction}
                      onOpenRun={onOpenRun}
                      shouldIgnoreClick={drag.shouldIgnoreClick}
                      labelHoverCard={
                        <ScheduleServiceUserHoverCard
                          serviceUser={row.serviceUser}
                          jobCount={row.jobs.length}
                        />
                      }
                    />
                  )
                })}

                {normalizeScheduleJobsRowSearchQuery(rowSearch) &&
                serviceUserRows.length > 0 &&
                filteredServiceUserRows.length === 0 ? (
                  <div className="border-b border-border/70 px-4 py-6 text-center text-xs text-muted-foreground">
                    No service users match &ldquo;{rowSearch.trim()}&rdquo;.
                  </div>
                ) : null}

                {serviceUserRows.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                      <Clock className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium text-foreground">No jobs scheduled</p>
                    <p className="max-w-sm text-xs text-muted-foreground">
                      Generate a rota from a service user visit plan to populate this day.
                    </p>
                  </div>
                ) : null}
              </>
            ) : (
              <>
                <ScheduleJobsGanttRow
                  rowKey="unassigned"
                  sourceRow={{ kind: 'unassigned' }}
                  label="Unassigned"
                  subtitle={
                    unassignedJobs.length > 0
                      ? `${unassignedJobs.length} job${unassignedJobs.length === 1 ? '' : 's'} need carers`
                      : 'Jobs awaiting allocation'
                  }
                  muted
                  unassigned
                  jobs={unassignedJobs}
                  date={date}
                  savingJobId={savingJobId}
                  draggingJobId={drag.draggingJobId}
                  onPointerDown={drag.startDrag}
                  onJobClick={onJobClick}
                  onJobAction={onJobAction}
                  onOpenRun={onOpenRun}
                  shouldIgnoreClick={drag.shouldIgnoreClick}
                  alignJobsTop
                  excessContractedJobIds={excessContractedJobIds}
                  outsidePatternJobIds={outsidePatternJobIds}
                  overAllocatedJobIds={overAllocatedJobIds}
                  visitPlanSlotsByServiceUser={visitPlanSlotsByServiceUser}
                  acceptedCarePlansByServiceUser={acceptedCarePlansByServiceUser}
                  travelBufferMinutes={travelBufferMinutes}
                  previewJobIds={marquee.previewJobIds}
                  runDisplayPreferences={runDisplayPreferences}
                  jobLabelMode={jobLabelMode}
                  showRunsOnBoard={showRunsOnBoard}
                  rotaGapDisplay={rotaGapDisplay}
                  viewport={viewport}
                  boardMinWidth={boardMinWidth}
                  trackClassName="bg-amber-50/30 dark:bg-amber-950/10"
                />

                <ScheduleJobsGanttRow
                  rowKey="cancelled"
                  sourceRow={{ kind: 'cancelled' }}
                  label="Cancelled visits"
                  subtitle={
                    cancelledJobs.length > 0
                      ? `${cancelledJobs.length} cancelled or called-off visit${cancelledJobs.length === 1 ? '' : 's'}`
                      : 'No cancelled visits on this day'
                  }
                  muted
                  cancelled
                  jobs={cancelledJobs}
                  date={date}
                  savingJobId={savingJobId}
                  draggingJobId={drag.draggingJobId}
                  onPointerDown={drag.startDrag}
                  onJobClick={onJobClick}
                  onJobAction={onJobAction}
                  onOpenRun={onOpenRun}
                  shouldIgnoreClick={drag.shouldIgnoreClick}
                  alignJobsTop
                  excessContractedJobIds={excessContractedJobIds}
                  outsidePatternJobIds={outsidePatternJobIds}
                  overAllocatedJobIds={overAllocatedJobIds}
                  visitPlanSlotsByServiceUser={visitPlanSlotsByServiceUser}
                  acceptedCarePlansByServiceUser={acceptedCarePlansByServiceUser}
                  travelBufferMinutes={travelBufferMinutes}
                  previewJobIds={marquee.previewJobIds}
                  runDisplayPreferences={runDisplayPreferences}
                  jobLabelMode={jobLabelMode}
                  showRunsOnBoard={showRunsOnBoard}
                  rotaGapDisplay={rotaGapDisplay}
                  viewport={viewport}
                  boardMinWidth={boardMinWidth}
                  trackClassName="bg-slate-50/40 dark:bg-slate-950/15"
                />

                {filteredEmployeeRows.map((row, index) => {
                  const display = employeeBriefDisplayName(row.employee)
                  const full = employeeBriefFullName(row.employee)
                  const { label, subtitle } = employeeBriefRowLabel(
                    row.employee,
                    duplicateNameIds.has(row.employee.id),
                  )
                  const rowKey = scheduleJobsRowKey({ kind: 'carer', employeeId: row.employee.id })
                  const hasJobs = row.allocations.length > 0
                  const availabilityBadge = resolveCarerDayAvailabilityBadge(row.dayPattern, row.onHoliday)
                  const showRoleSubtitle = !row.onHoliday && !availabilityBadge
                  return (
                    <ScheduleJobsGanttRow
                      key={row.employee.id}
                      rowKey={rowKey}
                      sourceRow={{ kind: 'carer', employeeId: row.employee.id }}
                      label={label}
                      fullName={full !== display ? full : undefined}
                      subtitle={showRoleSubtitle ? subtitle : undefined}
                      avatarInitials={employeeBriefInitials(row.employee)}
                      showCar={!row.employee.isAgencyStaff}
                      jobs={row.allocations.map((allocation) => allocation.job)}
                      date={date}
                      savingJobId={savingJobId}
                      draggingJobId={drag.draggingJobId}
                      dayPattern={row.dayPattern}
                      showCarerAvailability
                      onHoliday={row.onHoliday}
                      holidayEndDate={row.holidayEndDate}
                      excessContractedJobIds={excessContractedJobIds}
                      outsidePatternJobIds={outsidePatternJobIds}
                      overAllocatedJobIds={overAllocatedJobIds}
                      visitPlanSlotsByServiceUser={visitPlanSlotsByServiceUser}
                      acceptedCarePlansByServiceUser={acceptedCarePlansByServiceUser}
                      travelBufferMinutes={travelBufferMinutes}
                      previewJobIds={marquee.previewJobIds}
                      runDisplayPreferences={runDisplayPreferences}
                      jobLabelMode={jobLabelMode}
                      showRunsOnBoard={showRunsOnBoard}
                      rotaGapDisplay={rotaGapDisplay}
                      carerCoordinates={null}
                      viewport={viewport}
                      boardMinWidth={boardMinWidth}
                      zebra={index % 2 === 1}
                      onPointerDown={drag.startDrag}
                      onJobClick={onJobClick}
                      onJobAction={onJobAction}
                      onOpenRun={onOpenRun}
                      shouldIgnoreClick={drag.shouldIgnoreClick}
                      trackClassName={
                        row.onHoliday
                          ? 'bg-orange-100/25 dark:bg-orange-950/20'
                          : availabilityBadge?.kind === 'not-available'
                            ? 'bg-slate-200/30 dark:bg-slate-900/35'
                            : availabilityBadge?.kind === 'partial'
                              ? 'bg-amber-100/30 dark:bg-amber-950/20'
                              : hasJobs
                                ? undefined
                                : 'bg-sky-50/35 dark:bg-sky-950/10'
                      }
                      labelHoverCard={
                        <ScheduleCarerHoverCard
                          row={row}
                          catalog={employeeCatalogById?.get(row.employee.id)}
                          locationNames={locationNameMap}
                        />
                      }
                    />
                  )
                })}

                {normalizeScheduleJobsRowSearchQuery(rowSearch) &&
                employeeRows.length > 0 &&
                filteredEmployeeRows.length === 0 ? (
                  <div className="border-b border-border/70 px-4 py-6 text-center text-xs text-muted-foreground">
                    No carers match &ldquo;{rowSearch.trim()}&rdquo;.
                  </div>
                ) : null}

                {employeeRows.length === 0 && unassignedJobs.length === 0 && cancelledJobs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                      <Clock className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium text-foreground">No jobs scheduled</p>
                    <p className="max-w-sm text-xs text-muted-foreground">
                      Generate a rota from a service user visit plan to populate this day.
                    </p>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
