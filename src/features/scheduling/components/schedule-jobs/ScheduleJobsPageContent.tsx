import * as React from 'react'
import { getApiBaseUrl } from '@/shared/lib/api-base'
import { ScheduleJobAllocateDialog } from '@/features/scheduling/components/ScheduleJobAllocateDialog'
import { ScheduleJobNotesDialog } from '@/features/scheduling/components/ScheduleJobNotesDialog'
import { ScheduleJobCompleteDialog } from '@/features/scheduling/components/ScheduleJobCompleteDialog'
import { ScheduleJobCancelDialog } from '@/features/scheduling/components/ScheduleJobCancelDialog'
import { ScheduleJobReinstateDialog } from '@/features/scheduling/components/ScheduleJobReinstateDialog'
import { ScheduleVisitWorkspaceSheet } from '@/features/scheduling/components/ScheduleVisitWorkspaceSheet'
import { ScheduleJobsGantt } from '@/features/scheduling/components/ScheduleJobsGantt'
import { ScheduleJobsToolbar } from '@/features/scheduling/components/ScheduleJobsToolbar'
import { ScheduleRunsPanel } from '@/features/scheduling/components/ScheduleRunsPanel'
import { ScheduleRunCreateDialog } from '@/features/scheduling/components/ScheduleRunCreateDialog'
import { ScheduleRunEditDialog } from '@/features/scheduling/components/ScheduleRunEditDialog'
import { ScheduleRunReassignDialog } from '@/features/scheduling/components/ScheduleRunReassignDialog'
import { ScheduleJobsActiveFiltersBanner } from '@/features/scheduling/components/schedule-jobs/ScheduleJobsActiveFiltersBanner'
import { ScheduleJobsBulkRotaHint } from '@/features/scheduling/components/schedule-jobs/ScheduleJobsBulkRotaHint'
import { ScheduleJobsCallPatternContractBanner } from '@/features/scheduling/components/schedule-jobs/ScheduleJobsCallPatternContractBanner'
import { ScheduleJobsPageHeaderCard } from '@/features/scheduling/components/schedule-jobs/ScheduleJobsPageHeaderCard'
import { ScheduleJobsLiveAlertsBanner } from '@/features/scheduling/components/schedule-jobs/ScheduleJobsLiveAlertsBanner'
import { useScheduleRunEditDialog } from '@/features/scheduling/hooks/useScheduleRunEditDialog'
import { useScheduleRunReassignDialog } from '@/features/scheduling/hooks/useScheduleRunReassignDialog'
import { useScheduleJobsBoardPreferences } from '@/features/scheduling/hooks/useScheduleJobsBoardPreferences'
import { useScheduleJobsBoardData } from '@/features/scheduling/hooks/useScheduleJobsBoardData'
import { useScheduleJobsPageActions } from '@/features/scheduling/hooks/useScheduleJobsPageActions'
import { useScheduleJobsPageDialogs } from '@/features/scheduling/hooks/useScheduleJobsPageDialogs'
import { useScheduleJobsUrlState } from '@/features/scheduling/hooks/useScheduleJobsUrlState'
import { useScheduleJobsLiveOfficeAlerts } from '@/features/scheduling/hooks/useScheduleJobsLiveOfficeAlerts'
import { jobScheduleDateIso, scheduleJobsRowKey } from '@/features/scheduling/utils/schedule-jobs-drag.util'
import {
  scrollScheduleJobsBoardToJob,
  scrollScheduleJobsBoardToRow,
} from '@/features/scheduling/utils/schedule-jobs-scroll.util'
import type { BoardLiveOfficeAlertKind } from '@/features/ecm/utils/ecm-urgent-alert.util'

export function ScheduleJobsPageContent() {
  const hasApi = !!getApiBaseUrl()
  const url = useScheduleJobsUrlState()
  const dialogs = useScheduleJobsPageDialogs()
  const { preferences: boardPreferences, setShowRunsOnBoard, setRotaGapDisplay } = useScheduleJobsBoardPreferences()

  const board = useScheduleJobsBoardData({
    hasApi,
    date: url.date,
    locationFilterIds: url.locationFilterIds,
    serviceUserFilterIds: url.serviceUserFilterIds,
    employeeFilterIds: url.employeeFilterIds,
    requiredCarersFilters: url.requiredCarersFilters,
    jobOutcomeFilters: url.jobOutcomeFilters,
    jobOperationalFilters: url.jobOperationalFilters,
    carerOperationalFilters: url.carerOperationalFilters,
    timeSensitiveFilter: url.timeSensitiveFilter,
    setServiceUserFilterIds: url.setServiceUserFilterIds,
    updateScheduleJobsUrl: url.updateScheduleJobsUrl,
  })

  const runEdit = useScheduleRunEditDialog({
    date: url.date,
    travelBufferMinutes: board.travelBufferMinutes,
    onChanged: () => void board.refreshBoard(),
  })

  const runReassign = useScheduleRunReassignDialog({
    date: url.date,
    runs: board.dayRuns,
    onChanged: () => void board.refreshBoard(),
    onOpenFullEditor: runEdit.openEditRunById,
  })

  const actions = useScheduleJobsPageActions({
    search: url.search,
    rowAxis: url.rowAxis,
    allJobs: board.allJobs,
    boardAfterRequiredCarersAllJobs: board.boardAfterRequiredCarers.allJobs,
    employeeLocationCatalog: board.employeeLocationCatalog,
    locationNameMap: board.locationNameMap,
    dialogs,
    updateScheduleJobsUrl: url.updateScheduleJobsUrl,
    refreshBoard: board.refreshBoard,
    dayBoardQueries: {
      employeesQuery: board.employeesQuery,
      dayRunsQuery: board.dayRunsQuery,
    },
    runEdit,
    runReassign,
  })

  const allocateJob = dialogs.allocateJobId
    ? board.allJobs.find((job) => job.id === dialogs.allocateJobId) ?? null
    : null
  const completeJob = dialogs.completeJobTarget
    ? board.allJobs.find((job) => job.id === dialogs.completeJobTarget?.id) ?? dialogs.completeJobTarget
    : null

  const handleViewServiceUserOverAllocationVisits = React.useCallback(
    (serviceUserId: string) => {
      const hasVisitToday = board.allDayJobs.some((job) => job.serviceUserId === serviceUserId)
      if (!hasVisitToday) {
        const nextVisitDate = board.weekJobs
          .filter((job) => job.serviceUserId === serviceUserId)
          .map((job) => jobScheduleDateIso(job))
          .sort()[0]
        if (nextVisitDate && nextVisitDate !== url.date) {
          url.setScheduleDate(nextVisitDate)
        }
      }
      url.setScheduleServiceUserFilter([serviceUserId])
      if (url.rowAxis !== 'service-users') {
        url.setScheduleRowAxis('service-users')
      }
      // Allow date/filter state to commit before scrolling the board.
      window.setTimeout(() => {
        scrollScheduleJobsBoardToRow(
          scheduleJobsRowKey({ kind: 'service-user', serviceUserId }),
        )
      }, 50)
    },
    [board.allDayJobs, board.weekJobs, url],
  )

  const handleViewCarerOverAllocationVisits = React.useCallback(
    (employeeId: string) => {
      if (url.rowAxis !== 'carers') {
        url.setScheduleRowAxis('carers')
      }
      scrollScheduleJobsBoardToRow(scheduleJobsRowKey({ kind: 'carer', employeeId }))
    },
    [url],
  )

  const boardJobIds = React.useMemo(
    () => new Set(board.allJobs.map((job) => job.id)),
    [board.allJobs],
  )
  const liveOfficeAlerts = useScheduleJobsLiveOfficeAlerts(url.date, boardJobIds)
  const handleLiveAlertKind = React.useCallback(
    (kind: BoardLiveOfficeAlertKind) => {
      const jobId = liveOfficeAlerts.counts.firstJobIdByKind[kind]
      if (jobId) scrollScheduleJobsBoardToJob(jobId)
    },
    [liveOfficeAlerts.counts.firstJobIdByKind],
  )

  return (
    <div className="flex h-full min-h-0 flex-col p-4 md:p-5">
      <ScheduleJobsPageHeaderCard layout={url.layout} />

      <ScheduleJobsToolbar
        date={url.date}
        onDateChange={url.setScheduleDate}
        period={url.periodControls}
        locationIds={url.locationFilterIds}
        branchFilterOptions={board.branchFilterOptions}
        allBranchesLabel={`All branches (${board.allDayJobs.length})`}
        onLocationChange={url.setScheduleLocationFilter}
        locationFilterDisabled={url.locationFilterDisabled}
        serviceUserIds={url.serviceUserFilterIds}
        serviceUsers={board.serviceUserOptions}
        allServiceUsersLabel={`All service users (${board.serviceUserOptions.length})`}
        onServiceUserChange={url.setScheduleServiceUserFilter}
        employeeIds={url.employeeFilterIds}
        carers={board.carerFilterOptions}
        allCarersLabel={`All carers (${board.carerFilterOptions.length})`}
        onEmployeeChange={url.setScheduleEmployeeFilter}
        requiredCarersFilters={url.requiredCarersFilters}
        requiredCarersOptions={board.requiredCarersOptions}
        onRequiredCarersFiltersChange={url.setScheduleRequiredCarersFilters}
        allVisitsLabel={`All visits (${board.boardAfterServiceUser.allJobs.length})`}
        onClearSharedFilters={url.clearSharedFilters}
        listLinkSearch={url.listLinkSearch}
        onRefresh={board.handleRefresh}
        isLoading={board.isLoading}
        hasError={board.employeesError || board.dayRunsError}
        requiredMinutes={board.requiredMinutes}
        bookedMinutes={board.bookedMinutes}
        overBookedMinutes={board.overBookedMinutes}
        carersOnBoard={board.employeeRows.length}
        carersWorking={board.carersWorking}
        unassignedCount={board.unassignedJobs.length}
        excessContractedCount={board.excessContractedOnDay}
        weeklyContractedMinutes={board.weeklyContractSummary.contractedMinutes}
        weeklyBookedVisitMinutes={board.weeklyContractSummary.bookedVisitMinutes}
        weeklyExcessContractMinutes={board.weeklyContractSummary.excessVisitMinutes}
        jobOutcomeFilters={url.jobOutcomeFilters}
        jobOutcomeCounts={board.jobOutcomeCounts}
        onToggleJobOutcomeFilter={url.toggleJobOutcomeFilter}
        jobOperationalFilters={url.jobOperationalFilters}
        jobOperationalCounts={board.jobOperationalCounts}
        onToggleJobOperationalFilter={url.toggleJobOperationalFilter}
        carerOperationalFilters={url.carerOperationalFilters}
        carerOnLeaveTodayCount={board.carerOnLeaveTodayCount}
        onToggleCarerOperationalFilter={url.toggleCarerOperationalFilter}
        timeSensitiveFilter={url.timeSensitiveFilter}
        timeSensitiveCount={board.timeSensitiveCount}
        onToggleTimeSensitiveFilter={url.toggleTimeSensitiveFilter}
        operationalIssuesCount={board.operationalIssuesCount}
        layout={url.layout}
        onLayoutChange={url.setScheduleLayout}
        rowAxis={url.rowAxis}
        onRowAxisChange={url.setScheduleRowAxis}
        showRunsOnBoard={boardPreferences.showRunsOnBoard}
        onShowRunsOnBoardChange={setShowRunsOnBoard}
        rotaGapDisplay={boardPreferences.rotaGapDisplay}
        onRotaGapDisplayChange={setRotaGapDisplay}
      />

      {url.layout === 'board' ? (
        <>
          <ScheduleJobsActiveFiltersBanner
            locationFilterIds={url.locationFilterIds}
            serviceUserFilterIds={url.serviceUserFilterIds}
            employeeFilterIds={url.employeeFilterIds}
            requiredCarersFilters={url.requiredCarersFilters}
            timeSensitiveFilter={url.timeSensitiveFilter}
            branchFilterOptions={board.branchFilterOptions}
            boardJobs={board.board.allJobs}
          />
          <ScheduleJobsCallPatternContractBanner
            serviceUserRows={board.serviceUsersOverPackage}
            carerRows={board.carersOverContract}
            allJobs={board.allJobs}
            weekJobs={board.weekJobs}
            employeeNameById={board.employeeNameById}
            onViewServiceUserVisits={handleViewServiceUserOverAllocationVisits}
            onViewCarerVisits={handleViewCarerOverAllocationVisits}
          />
          <ScheduleJobsBulkRotaHint />
        </>
      ) : null}

      {url.layout === 'board' ? (
        <ScheduleJobsLiveAlertsBanner
          counts={liveOfficeAlerts.counts}
          onSelectKind={handleLiveAlertKind}
        />
      ) : null}

      <div className="min-h-0 flex-1">
        {url.layout === 'runs' ? (
          <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <ScheduleRunsPanel
              embedded
              date={url.date}
              unassignedJobs={board.runlessJobs}
              onChanged={() => void board.refreshBoard()}
              onJobClick={actions.openAllocate}
              travelBufferMinutes={board.travelBufferMinutes}
              visitPlanSlotsByServiceUser={board.visitPlanSlotsByServiceUser}
              acceptedCarePlansByServiceUser={board.acceptedCarePlansByServiceUser}
            />
          </div>
        ) : (
          <ScheduleJobsGantt
            date={url.date}
            rowAxis={url.rowAxis}
            employeeRows={board.employeeRows}
            serviceUserRows={board.serviceUserRows}
            unassignedJobs={board.unassignedJobs}
            cancelledJobs={board.cancelledJobs}
            runs={board.dayRunsQuery.data?.runs ?? []}
            showRunsOnBoard={boardPreferences.showRunsOnBoard}
            rotaGapDisplay={boardPreferences.rotaGapDisplay}
            employeeCatalogById={board.employeeCatalogById}
            locationNames={board.locationNameMap}
            savingJobId={dialogs.savingJobId}
            excessContractedJobIds={board.excessContractedJobIds}
            outsidePatternJobIds={board.outsidePatternJobIds}
            overAllocatedJobIds={board.overAllocatedJobIds}
            visitPlanSlotsByServiceUser={board.visitPlanSlotsByServiceUser}
            acceptedCarePlansByServiceUser={board.acceptedCarePlansByServiceUser}
            travelBufferMinutes={board.travelBufferMinutes}
            liveAlertsByJobId={liveOfficeAlerts.alertsByJobId}
            onJobClick={actions.openAllocate}
            onJobAction={actions.handleJobAction}
            onOpenRun={runEdit.openEditRunById}
            onReassignRun={runReassign.openForRunId}
            onJobDrop={actions.handleJobDrop}
            onJobsSelectedForRun={(jobs) => {
              dialogs.setCreateRunJobs(jobs)
              dialogs.setCreateRunOpen(true)
            }}
          />
        )}
      </div>

      <ScheduleJobAllocateDialog
        open={dialogs.allocateOpen}
        onOpenChange={(open) => {
          dialogs.setAllocateOpen(open)
          if (!open) {
            dialogs.setAllocateJobId(null)
            dialogs.setAllocateDialogPanel('allocate')
          }
        }}
        job={allocateJob}
        initialPanel={dialogs.allocateDialogPanel}
        visitPlanSlotsByServiceUser={board.visitPlanSlotsByServiceUser}
        boardJobs={board.allJobs}
        onAllocated={() => {
          void board.refreshBoard()
        }}
      />

      <ScheduleVisitWorkspaceSheet
        open={dialogs.workspaceOpen}
        onOpenChange={(open) => {
          dialogs.setWorkspaceOpen(open)
          if (!open) dialogs.setWorkspaceJob(null)
        }}
        job={dialogs.workspaceJob}
        date={url.date}
        defaultTab={dialogs.workspaceTab}
        onCompleteVisit={(job) => {
          dialogs.setWorkspaceOpen(false)
          dialogs.openCompleteDialog(job)
        }}
        onMarkIncomplete={(job) => {
          dialogs.setWorkspaceOpen(false)
          dialogs.openCompleteDialog(job, 'PARTIALLY_COMPLETED')
        }}
        onAddNotes={(job) => {
          dialogs.setWorkspaceOpen(false)
          dialogs.setNotesJob(job)
          dialogs.setNotesOpen(true)
        }}
        onAllocate={(job) => {
          dialogs.setWorkspaceOpen(false)
          actions.openAllocate(job, 'allocate')
        }}
      />

      <ScheduleJobCompleteDialog
        open={dialogs.completeOpen}
        onOpenChange={(open) => {
          dialogs.setCompleteOpen(open)
          if (!open) {
            dialogs.setCompleteJobTarget(null)
            dialogs.setCompleteInitialStatus(null)
          }
        }}
        job={completeJob}
        initialVisitStatus={dialogs.completeInitialStatus}
        onCompleted={() => {
          void board.refreshBoard()
        }}
        onJobUpdated={() => {
          void board.refreshBoard()
        }}
      />

      <ScheduleJobCancelDialog
        open={dialogs.cancelOpen}
        onOpenChange={(open) => {
          dialogs.setCancelOpen(open)
          if (!open) dialogs.setCancelJobTarget(null)
        }}
        job={dialogs.cancelJobTarget}
        visitPlanSlotsByServiceUser={board.visitPlanSlotsByServiceUser}
        onCancelled={() => {
          void board.refreshBoard()
        }}
      />

      <ScheduleJobReinstateDialog
        open={dialogs.reinstateOpen}
        onOpenChange={(open) => {
          dialogs.setReinstateOpen(open)
          if (!open) dialogs.setReinstateJobTarget(null)
        }}
        job={dialogs.reinstateJobTarget}
        onReinstated={() => {
          void board.refreshBoard()
        }}
      />

      <ScheduleJobNotesDialog
        open={dialogs.notesOpen}
        onOpenChange={(open) => {
          dialogs.setNotesOpen(open)
          if (!open) dialogs.setNotesJob(null)
        }}
        job={dialogs.notesJob}
        onSaved={() => {
          void board.refreshBoard()
        }}
      />

      <ScheduleRunCreateDialog
        open={dialogs.createRunOpen}
        onOpenChange={(open) => {
          dialogs.setCreateRunOpen(open)
          if (!open) dialogs.setCreateRunJobs([])
        }}
        jobs={dialogs.createRunJobs}
        date={url.date}
        travelBufferMinutes={board.travelBufferMinutes}
        existingRunCount={board.dayRunsQuery.data?.runs.length ?? 0}
        onCreated={() => {
          void board.refreshBoard()
        }}
      />

      <ScheduleRunEditDialog {...runEdit.dialogProps} />
      <ScheduleRunReassignDialog {...runReassign.dialogProps} />
    </div>
  )
}
