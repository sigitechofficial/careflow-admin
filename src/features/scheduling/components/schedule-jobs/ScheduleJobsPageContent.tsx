import { getApiBaseUrl } from '@/shared/lib/api-base'
import { PageHeader } from '@/shared/ui/page-elements'
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
import { useScheduleRunEditDialog } from '@/features/scheduling/hooks/useScheduleRunEditDialog'
import { useScheduleRunReassignDialog } from '@/features/scheduling/hooks/useScheduleRunReassignDialog'
import { useScheduleJobsBoardPreferences } from '@/features/scheduling/hooks/useScheduleJobsBoardPreferences'
import { useScheduleJobsBoardData } from '@/features/scheduling/hooks/useScheduleJobsBoardData'
import { useScheduleJobsPageActions } from '@/features/scheduling/hooks/useScheduleJobsPageActions'
import { useScheduleJobsPageDialogs } from '@/features/scheduling/hooks/useScheduleJobsPageDialogs'
import { useScheduleJobsUrlState } from '@/features/scheduling/hooks/useScheduleJobsUrlState'
import { shiftIsoDate } from '@/features/scheduling/utils/schedule-jobs-timeline.util'
import { todayIso } from '@/features/scheduling/utils/scheduling-format'

export function ScheduleJobsPageContent() {
  const hasApi = !!getApiBaseUrl()
  const url = useScheduleJobsUrlState()
  const dialogs = useScheduleJobsPageDialogs()
  const { preferences: boardPreferences, setShowRunsOnBoard } = useScheduleJobsBoardPreferences()

  const board = useScheduleJobsBoardData({
    hasApi,
    date: url.date,
    locationFilterIds: url.locationFilterIds,
    serviceUserFilterIds: url.serviceUserFilterIds,
    requiredCarersFilters: url.requiredCarersFilters,
    jobOutcomeFilters: url.jobOutcomeFilters,
    jobOperationalFilters: url.jobOperationalFilters,
    carerOperationalFilters: url.carerOperationalFilters,
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

  return (
    <div className="flex h-full min-h-0 flex-col p-4 md:p-5">
      <PageHeader
        title="Schedule Jobs"
        description={
          url.layout === 'runs'
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
        date={url.date}
        locationIds={url.locationFilterIds}
        branchFilterOptions={board.branchFilterOptions}
        allBranchesLabel={`All branches (${board.allDayJobs.length})`}
        onLocationChange={url.setScheduleLocationFilter}
        serviceUserIds={url.serviceUserFilterIds}
        serviceUsers={board.serviceUserOptions}
        allServiceUsersLabel={`All service users (${board.serviceUserOptions.length})`}
        onServiceUserChange={url.setScheduleServiceUserFilter}
        requiredCarersFilters={url.requiredCarersFilters}
        requiredCarersOptions={board.requiredCarersOptions}
        onRequiredCarersFiltersChange={url.setScheduleRequiredCarersFilters}
        allVisitsLabel={`All visits (${board.boardAfterServiceUser.allJobs.length})`}
        onPrevDay={() => url.setScheduleDate(shiftIsoDate(url.date, -1))}
        onNextDay={() => url.setScheduleDate(shiftIsoDate(url.date, 1))}
        onToday={() => url.setScheduleDate(todayIso())}
        onDateChange={url.setScheduleDate}
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
        operationalIssuesCount={board.operationalIssuesCount}
        layout={url.layout}
        onLayoutChange={url.setScheduleLayout}
        rowAxis={url.rowAxis}
        onRowAxisChange={url.setScheduleRowAxis}
        showRunsOnBoard={boardPreferences.showRunsOnBoard}
        onShowRunsOnBoardChange={setShowRunsOnBoard}
      />

      {url.layout === 'board' ? (
        <>
          <ScheduleJobsActiveFiltersBanner
            locationFilterIds={url.locationFilterIds}
            serviceUserFilterIds={url.serviceUserFilterIds}
            requiredCarersFilters={url.requiredCarersFilters}
            branchFilterOptions={board.branchFilterOptions}
            boardJobs={board.board.allJobs}
          />
          <ScheduleJobsCallPatternContractBanner
            rows={board.callPatternOverContract}
            allJobs={board.allJobs}
            weekJobs={board.weekJobs}
          />
          <ScheduleJobsBulkRotaHint />
        </>
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
            employeeCatalogById={board.employeeCatalogById}
            locationNames={board.locationNameMap}
            savingJobId={dialogs.savingJobId}
            excessContractedJobIds={board.excessContractedJobIds}
            outsidePatternJobIds={board.outsidePatternJobIds}
            overAllocatedJobIds={board.overAllocatedJobIds}
            visitPlanSlotsByServiceUser={board.visitPlanSlotsByServiceUser}
            acceptedCarePlansByServiceUser={board.acceptedCarePlansByServiceUser}
            travelBufferMinutes={board.travelBufferMinutes}
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
          dialogs.setCompleteJobTarget(job)
          dialogs.setCompleteOpen(true)
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
          if (!open) dialogs.setCompleteJobTarget(null)
        }}
        job={completeJob}
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
