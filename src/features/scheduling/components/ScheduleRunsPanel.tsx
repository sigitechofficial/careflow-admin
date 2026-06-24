import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowDown, ArrowUp, Loader2, Map, Pencil, Plus, Route, Table2, X } from 'lucide-react'
import { listAllEmployees } from '@/features/employees/api'
import {
  useScheduleRunMutations,
  useScheduleRunsList,
} from '@/features/scheduling/hooks/useScheduleRuns'
import type { ScheduleRunRow, ScheduleRunStatus, TimelineJob } from '@/features/scheduling/types/scheduling.types'
import { ScheduleRunEditDialog } from '@/features/scheduling/components/ScheduleRunEditDialog'
import { ScheduleRunsTable } from '@/features/scheduling/components/ScheduleRunsTable'
import { ScheduleRunsMapView } from '@/features/scheduling/components/ScheduleRunsMapView'
import {
  ScheduleRunsDisplaySettingsButton,
  ScheduleRunsDisplaySettingsDialog,
} from '@/features/scheduling/components/ScheduleRunsDisplaySettingsDialog'
import { useScheduleRunsDisplayPreferences } from '@/features/scheduling/hooks/useScheduleRunsDisplayPreferences'
import { computeScheduleRunStats } from '@/features/scheduling/utils/schedule-run-stats.util'
import type { AcceptedCarePlanItem } from '@/features/service-users/initial-assessment/api'
import type { VisitPlanSlot } from '@/features/service-users/visit-plan/types'
import { activeJobAllocationCount, serviceUserLabel } from '@/features/scheduling/utils/scheduling-format'
import { useScheduleJobsDisplayFormat } from '@/features/scheduling/context/schedule-jobs-display-format.context'
import { Button } from '@/shared/ui/button'
import { Combobox } from '@/shared/ui/combobox'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { FormField, Textarea } from '@/shared/ui/form-field'
import { Input } from '@/shared/ui/input'
import { toastApiError, toastSuccess, toastWarning } from '@/shared/lib/toast'

const RUN_STATUS_LABELS: Record<ScheduleRunStatus, string> = {
  DRAFT: 'Draft',
  PUBLISHED: 'Published',
  IN_PROGRESS: 'In progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
}

type ScheduleRunsPanelProps = {
  date: string
  unassignedJobs: TimelineJob[]
  onChanged?: () => void
  onJobClick?: (job: TimelineJob) => void
  travelBufferMinutes?: number
  visitPlanSlotsByServiceUser?: Map<string, VisitPlanSlot[]>
  acceptedCarePlansByServiceUser?: Map<string, AcceptedCarePlanItem[]>
  /** Fills parent height (e.g. schedule-jobs side sheet) instead of a compact card. */
  embedded?: boolean
}

export function ScheduleRunsPanel({
  date,
  unassignedJobs,
  onChanged,
  onJobClick,
  travelBufferMinutes = 0,
  visitPlanSlotsByServiceUser,
  acceptedCarePlansByServiceUser,
  embedded,
}: ScheduleRunsPanelProps) {
  const displayFormat = useScheduleJobsDisplayFormat()
  const formatJobTimeDisplay = React.useCallback(
    (job: TimelineJob) =>
      `${displayFormat.formatTime(job.scheduledStartDateTime)}–${displayFormat.formatTime(job.scheduledEndDateTime ?? job.scheduledStartDateTime)}`,
    [displayFormat],
  )
  const runsQuery = useScheduleRunsList({ runDate: date }, Boolean(date))
  const mutations = useScheduleRunMutations(date)
  const { preferences: runDisplayPreferences, updatePreferences, resetPreferences } =
    useScheduleRunsDisplayPreferences()
  const [displaySettingsOpen, setDisplaySettingsOpen] = React.useState(false)
  const [createOpen, setCreateOpen] = React.useState(false)
  const [editRun, setEditRun] = React.useState<ScheduleRunRow | null>(null)
  const [editRunInitialTab, setEditRunInitialTab] = React.useState<'run' | 'map'>('run')
  const [runsViewMode, setRunsViewMode] = React.useState<'table' | 'map'>('table')
  const [mapSelectedRunId, setMapSelectedRunId] = React.useState<string | null>(null)
  const [addJobsRunId, setAddJobsRunId] = React.useState<string | null>(null)
  const [selectedJobIds, setSelectedJobIds] = React.useState<string[]>([])

  const [name, setName] = React.useState('')
  const [employeeId, setEmployeeId] = React.useState('')
  const [notes, setNotes] = React.useState('')

  const [editName, setEditName] = React.useState('')
  const [editEmployeeId, setEditEmployeeId] = React.useState('')
  const [editNotes, setEditNotes] = React.useState('')

  const employeesQuery = useQuery({
    queryKey: ['employees', 'runs-picker'],
    queryFn: () => listAllEmployees({}),
  })

  const carerComboboxOptions = React.useMemo(
    () => [
      { value: '', label: 'Unassigned', description: 'No default carer for this run' },
      ...(employeesQuery.data ?? []).map((emp) => ({
        value: emp.id,
        label: emp.fullName ?? [emp.firstName, emp.lastName].filter(Boolean).join(' ') ?? 'Unknown',
      })),
    ],
    [employeesQuery.data],
  )

  const runs = runsQuery.data?.rows ?? []
  const addJobsRun = runs.find((r) => r.id === addJobsRunId) ?? null

  const openEditRun = (run: ScheduleRunRow, options?: { tab?: 'run' | 'map' }) => {
    setEditRun(run)
    setEditRunInitialTab(options?.tab ?? 'run')
    setEditName(run.name)
    setEditEmployeeId(run.employeeId ?? '')
    setEditNotes(run.description ?? '')
  }

  const openRunMap = (run: ScheduleRunRow) => {
    setMapSelectedRunId(run.id)
    setRunsViewMode('map')
  }

  const closeEditRun = () => {
    setEditRun(null)
    setEditRunInitialTab('run')
    setEditName('')
    setEditEmployeeId('')
    setEditNotes('')
  }

  const availableJobsForAdd = React.useMemo(() => {
    const inActiveRun = new Set(
      runs
        .filter((r) => r.status !== 'CANCELLED' && r.status !== 'COMPLETED')
        .flatMap((r) => (r.jobs ?? []).map((j) => j.id)),
    )
    return [...unassignedJobs, ...runs.flatMap((r) => r.jobs ?? [])].filter(
      (job, index, all) => all.findIndex((j) => j.id === job.id) === index && !inActiveRun.has(job.id),
    )
  }, [runs, unassignedJobs])

  const resetCreateForm = () => {
    setName('')
    setEmployeeId('')
    setNotes('')
  }

  const handleCreate = async () => {
    if (!name.trim()) {
      toastWarning('Run name required', 'Enter a name for this run.')
      return
    }
    try {
      await mutations.create.mutateAsync({
        name: name.trim(),
        runDate: date,
        employeeId: employeeId || undefined,
        description: notes.trim() || undefined,
      })
      toastSuccess('Run created')
      setCreateOpen(false)
      resetCreateForm()
      onChanged?.()
    } catch (error) {
      toastApiError(error, 'Could not create run')
    }
  }

  const handleStatusChange = async (run: ScheduleRunRow, status: ScheduleRunStatus) => {
    try {
      if (status === 'CANCELLED') {
        await mutations.cancel.mutateAsync(run.id)
      } else {
        await mutations.update.mutateAsync({ id: run.id, payload: { status } })
      }
      toastSuccess(`Run ${RUN_STATUS_LABELS[status].toLowerCase()}`)
      onChanged?.()
    } catch (error) {
      toastApiError(error, 'Could not update run status')
    }
  }

  const handleAddJobs = async () => {
    if (!addJobsRunId || selectedJobIds.length === 0) return
    try {
      await mutations.addJobs.mutateAsync({ id: addJobsRunId, visitIds: selectedJobIds })
      toastSuccess('Visits added to run')
      setAddJobsRunId(null)
      setSelectedJobIds([])
      onChanged?.()
    } catch (error) {
      toastApiError(error, 'Could not add visits to run')
    }
  }

  const handleRemoveJob = async (runId: string, jobId: string) => {
    try {
      await mutations.removeJob.mutateAsync({ runId, jobId })
      toastSuccess('Visit removed from run')
      onChanged?.()
    } catch (error) {
      toastApiError(error, 'Could not remove visit')
    }
  }

  const handleSyncCarer = async (run: ScheduleRunRow) => {
    try {
      await mutations.syncCarer.mutateAsync({
        id: run.id,
        payload: { force: true },
      })
      toastSuccess('Run carer assigned to visits')
      onChanged?.()
    } catch (error) {
      toastApiError(error, 'Could not assign run carer to visits')
    }
  }

  const handleSaveEditRun = async () => {
    if (!editRun) return
    if (!editName.trim()) {
      toastWarning('Run name required', 'Enter a name for this run.')
      return
    }
    try {
      await mutations.update.mutateAsync({
        id: editRun.id,
        payload: {
          name: editName.trim(),
          employeeId: editEmployeeId || undefined,
          description: editNotes.trim() || undefined,
        },
      })
      toastSuccess('Run updated')
      closeEditRun()
      onChanged?.()
    } catch (error) {
      toastApiError(error, 'Could not update run')
    }
  }

  const handleSaveAndUpdateSchedule = async () => {
    if (!editRun) return
    if (!editName.trim()) {
      toastWarning('Run name required', 'Enter a name for this run.')
      return
    }
    try {
      await mutations.update.mutateAsync({
        id: editRun.id,
        payload: {
          name: editName.trim(),
          employeeId: editEmployeeId || undefined,
          description: editNotes.trim() || undefined,
        },
      })
      if (editEmployeeId) {
        await mutations.syncCarer.mutateAsync({
          id: editRun.id,
          payload: {
            force: true,
            unallocateEmployeeId: editRun.employeeId ?? undefined,
          },
        })
      }
      if (editRun.status === 'DRAFT') {
        await mutations.update.mutateAsync({ id: editRun.id, payload: { status: 'PUBLISHED' } })
      }
      toastSuccess('Run saved and schedule updated')
      closeEditRun()
      onChanged?.()
    } catch (error) {
      toastApiError(error, 'Could not update schedule')
    }
  }

  const handleDeleteRun = async () => {
    if (!editRun) return
    if (editRun.status === 'COMPLETED') {
      toastWarning('Cannot delete run', 'Completed runs cannot be deleted.')
      return
    }
    try {
      await mutations.remove.mutateAsync(editRun.id)
      toastSuccess('Run deleted', 'Visits were detached and remain on the rota.')
      closeEditRun()
      onChanged?.()
    } catch (error) {
      toastApiError(error, 'Could not delete run')
    }
  }

  const editRunStats = React.useMemo(
    () => computeScheduleRunStats(editRun?.jobs ?? [], travelBufferMinutes),
    [editRun?.jobs, travelBufferMinutes],
  )

  const moveJob = async (run: ScheduleRunRow, jobId: string, direction: -1 | 1) => {
    const jobs = [...(run.jobs ?? [])].sort((a, b) => (a.runSequence ?? 0) - (b.runSequence ?? 0))
    const index = jobs.findIndex((j) => j.id === jobId)
    if (index < 0) return
    const target = index + direction
    if (target < 0 || target >= jobs.length) return
    const reordered = [...jobs]
    const item = reordered.splice(index, 1)[0]
    if (!item) return
    reordered.splice(target, 0, item)
    try {
      await mutations.reorderJobs.mutateAsync({
        id: run.id,
        visitIds: reordered.map((j) => j.id),
      })
      onChanged?.()
    } catch (error) {
      toastApiError(error, 'Could not reorder visits')
    }
  }

  return (
    <div
      className={
        embedded
          ? 'flex h-full min-h-0 flex-col bg-card'
          : 'rounded-xl border border-border bg-card shadow-sm'
      }
    >
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3 shrink-0">
        <div className="flex items-center gap-2">
          <Route className="h-4 w-4 text-muted-foreground" aria-hidden />
          <div>
            <h2 className="text-sm font-semibold">Runs</h2>
            {embedded ? (
              <p className="text-[11px] text-muted-foreground">
                Manage carer routes in a table or map — service user locations shown on the route map
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {embedded ? (
            <div className="inline-flex rounded-lg border border-border bg-muted/40 p-0.5">
              <Button
                type="button"
                size="sm"
                variant={runsViewMode === 'table' ? 'secondary' : 'ghost'}
                className="h-8"
                onClick={() => setRunsViewMode('table')}
              >
                <Table2 className="mr-1.5 h-3.5 w-3.5" />
                Table
              </Button>
              <Button
                type="button"
                size="sm"
                variant={runsViewMode === 'map' ? 'secondary' : 'ghost'}
                className="h-8"
                onClick={() => setRunsViewMode('map')}
              >
                <Map className="mr-1.5 h-3.5 w-3.5" />
                Map
              </Button>
            </div>
          ) : null}
          <ScheduleRunsDisplaySettingsButton onClick={() => setDisplaySettingsOpen(true)} />
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1 h-3.5 w-3.5" />
            New run
          </Button>
        </div>
      </div>

      {embedded ? (
        runsViewMode === 'map' ? (
          <ScheduleRunsMapView
            runs={runs}
            isLoading={runsQuery.isLoading}
            travelBufferMinutes={travelBufferMinutes}
            selectedRunId={mapSelectedRunId}
            onSelectRun={setMapSelectedRunId}
            displayPreferences={runDisplayPreferences}
            visitPlanSlotsByServiceUser={visitPlanSlotsByServiceUser}
            acceptedCarePlansByServiceUser={acceptedCarePlansByServiceUser}
          />
        ) : (
          <ScheduleRunsTable
            runs={runs}
            unassignedJobs={unassignedJobs}
            isLoading={runsQuery.isLoading}
            travelBufferMinutes={travelBufferMinutes}
            displayPreferences={runDisplayPreferences}
            visitPlanSlotsByServiceUser={visitPlanSlotsByServiceUser}
            acceptedCarePlansByServiceUser={acceptedCarePlansByServiceUser}
            onJobClick={(job) => onJobClick?.(job)}
            onEditRun={openEditRun}
            onViewRunMap={openRunMap}
            onAddToRun={(runId) => {
              setAddJobsRunId(runId)
              setSelectedJobIds([])
            }}
          />
        )
      ) : (
      <div className="p-3 space-y-2 max-h-[320px] overflow-y-auto">
        {runsQuery.isLoading ? (
          <p className="text-xs text-muted-foreground inline-flex items-center gap-2 px-1">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading runs…
          </p>
        ) : null}
        {!runsQuery.isLoading && runs.length === 0 ? (
          <p className="text-xs text-muted-foreground px-1">No runs for this date yet.</p>
        ) : null}
        {runs.map((run) => (
          <div key={run.id} className="rounded-lg border border-border p-2.5 space-y-2">
            <div className="flex items-start gap-2">
              <button
                type="button"
                className="flex-1 text-left"
                onClick={() => openEditRun(run)}
                disabled={run.status === 'CANCELLED' || run.status === 'COMPLETED'}
              >
                <p className="text-sm font-semibold leading-tight">{run.name}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {RUN_STATUS_LABELS[run.status]} · {(run.jobs ?? []).length} visit(s)
                  {run.employee
                    ? ` · ${[run.employee.firstName, run.employee.lastName].filter(Boolean).join(' ')}`
                    : ' · No carer'}
                </p>
              </button>
              {run.status !== 'CANCELLED' && run.status !== 'COMPLETED' ? (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 shrink-0"
                  title="Edit run"
                  onClick={() => openEditRun(run)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              ) : null}
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 shrink-0"
                title="Add visits"
                disabled={run.status === 'CANCELLED' || run.status === 'COMPLETED'}
                onClick={() => {
                  setAddJobsRunId(run.id)
                  setSelectedJobIds([])
                }}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
            {(run.jobs ?? []).length > 0 ? (
              <ol className="space-y-1 pl-1">
                {[...(run.jobs ?? [])]
                  .sort((a, b) => (a.runSequence ?? 0) - (b.runSequence ?? 0))
                  .map((job, idx) => (
                    <li
                      key={job.id}
                      className="flex items-center gap-1 rounded-md bg-muted/40 px-2 py-1 text-[11px]"
                    >
                      <span className="font-bold text-muted-foreground w-4">{idx + 1}</span>
                      <span className="flex-1 truncate">
                        {serviceUserLabel(job.serviceUser)} · {formatJobTimeDisplay(job)}
                      </span>
                      {run.status !== 'CANCELLED' && run.status !== 'COMPLETED' ? (
                        <div className="flex items-center gap-0.5 shrink-0">
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            onClick={() => void moveJob(run, job.id, -1)}
                            disabled={idx === 0 || mutations.reorderJobs.isPending}
                          >
                            <ArrowUp className="h-3 w-3" />
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            onClick={() => void moveJob(run, job.id, 1)}
                            disabled={idx === (run.jobs?.length ?? 0) - 1 || mutations.reorderJobs.isPending}
                          >
                            <ArrowDown className="h-3 w-3" />
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 text-destructive"
                            onClick={() => void handleRemoveJob(run.id, job.id)}
                            disabled={mutations.removeJob.isPending}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : null}
                    </li>
                  ))}
              </ol>
            ) : null}
            {run.employeeId && (run.jobs ?? []).length > 0 && run.status !== 'CANCELLED' && run.status !== 'COMPLETED' ? (
              <div className="pt-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => void handleSyncCarer(run)}
                  disabled={mutations.syncCarer.isPending}
                >
                  Assign run carer to visits
                </Button>
              </div>
            ) : null}
            {run.status === 'DRAFT' ? (
              <div className="flex flex-wrap gap-1.5 pt-1">
                <Button size="sm" variant="secondary" onClick={() => void handleStatusChange(run, 'PUBLISHED')}>
                  Publish
                </Button>
                <Button size="sm" variant="outline" onClick={() => void handleStatusChange(run, 'CANCELLED')}>
                  Cancel
                </Button>
              </div>
            ) : null}
            {run.status === 'PUBLISHED' ? (
              <div className="flex flex-wrap gap-1.5 pt-1">
                <Button size="sm" variant="secondary" onClick={() => void handleStatusChange(run, 'IN_PROGRESS')}>
                  Start
                </Button>
                <Button size="sm" variant="outline" onClick={() => void handleStatusChange(run, 'COMPLETED')}>
                  Complete
                </Button>
                <Button size="sm" variant="ghost" onClick={() => void handleStatusChange(run, 'CANCELLED')}>
                  Cancel
                </Button>
              </div>
            ) : null}
            {run.status === 'IN_PROGRESS' ? (
              <div className="flex flex-wrap gap-1.5 pt-1">
                <Button size="sm" variant="secondary" onClick={() => void handleStatusChange(run, 'COMPLETED')}>
                  Complete
                </Button>
              </div>
            ) : null}
          </div>
        ))}
      </div>
      )}

      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open)
          if (!open) resetCreateForm()
        }}
      >
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>Create run</DialogTitle>
            <DialogDescription>
              Group visits for {displayFormat.formatDateLong(date)} into a single carer route.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <FormField label="Run name" htmlFor="run-name" required>
              <Input
                id="run-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. AM Run 1"
                autoFocus
              />
            </FormField>

            <FormField
              label="Carer"
              htmlFor="run-carer"
              hint="Optional. When set, this carer is allocated to visits you add to the run."
            >
              <Combobox
                options={carerComboboxOptions}
                value={employeeId}
                onChange={setEmployeeId}
                placeholder="Select carer…"
                searchPlaceholder="Search carers…"
                emptyText="No carers found."
                loading={employeesQuery.isLoading}
                allowDeselect
                className="w-full"
              />
            </FormField>

            <FormField label="Notes" htmlFor="run-notes" hint="Optional internal notes for coordinators.">
              <Textarea
                id="run-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Route notes, handover details, or area coverage…"
              />
            </FormField>

            <div className="rounded-lg border border-border/80 bg-muted/40 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
              After creating the run, add visits from the list. Use{' '}
              <span className="font-medium text-foreground">Assign run carer to visits</span> if you need to
              re-sync allocations on the rota board.
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void handleCreate()} disabled={mutations.create.isPending}>
              {mutations.create.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating…
                </>
              ) : (
                'Create run'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(addJobsRunId)} onOpenChange={(open) => !open && setAddJobsRunId(null)}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>Add visits to run</DialogTitle>
            <DialogDescription>
              Select unassigned visits for {addJobsRun?.name ?? 'this run'} on{' '}
              {displayFormat.formatDateLong(date)}.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-2 p-0 px-5 pb-5">
            <div className="max-h-[min(360px,50vh)] overflow-y-auto space-y-1.5 rounded-lg border border-border bg-muted/20 p-2">
            {availableJobsForAdd.length === 0 ? (
              <p className="text-sm text-muted-foreground">No unassigned visits available for this date.</p>
            ) : (
              availableJobsForAdd.map((job) => {
                const checked = selectedJobIds.includes(job.id)
                return (
                  <label
                    key={job.id}
                    className="flex items-center gap-2 rounded-md border border-border px-2 py-1.5 text-sm cursor-pointer hover:bg-muted/40"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        setSelectedJobIds((prev) =>
                          e.target.checked ? [...prev, job.id] : prev.filter((id) => id !== job.id),
                        )
                      }}
                    />
                    <span className="flex-1 truncate">
                      {serviceUserLabel(job.serviceUser)} · {formatJobTimeDisplay(job)}
                    </span>
                  </label>
                )
              })
            )}
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAddJobsRunId(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handleAddJobs()}
              disabled={selectedJobIds.length === 0 || mutations.addJobs.isPending}
            >
              {mutations.addJobs.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding…
                </>
              ) : (
                `Add ${selectedJobIds.length || ''} visit${selectedJobIds.length === 1 ? '' : 's'}`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ScheduleRunEditDialog
        open={Boolean(editRun)}
        onOpenChange={(open) => !open && closeEditRun()}
        run={editRun}
        runs={runs}
        date={date}
        stats={editRunStats}
        editName={editName}
        onEditNameChange={setEditName}
        editEmployeeId={editEmployeeId}
        onEditEmployeeIdChange={setEditEmployeeId}
        editNotes={editNotes}
        onEditNotesChange={setEditNotes}
        carerOptions={carerComboboxOptions}
        carersLoading={employeesQuery.isLoading}
        onSwitchRun={openEditRun}
        initialTab={editRunInitialTab}
        onSave={handleSaveEditRun}
        onSaveAndUpdateSchedule={handleSaveAndUpdateSchedule}
        onCancel={closeEditRun}
        onDelete={handleDeleteRun}
        saving={mutations.update.isPending}
        updatingSchedule={mutations.update.isPending || mutations.syncCarer.isPending}
        deleting={mutations.remove.isPending}
      />

      <ScheduleRunsDisplaySettingsDialog
        open={displaySettingsOpen}
        onOpenChange={setDisplaySettingsOpen}
        preferences={runDisplayPreferences}
        onSave={updatePreferences}
        onReset={resetPreferences}
      />
    </div>
  )
}
