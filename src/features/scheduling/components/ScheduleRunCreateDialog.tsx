import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { useScheduleRunMutations } from '@/features/scheduling/hooks/useScheduleRuns'
import { useScheduleEmployeesCatalog } from '@/features/scheduling/hooks/useScheduleEmployeesCatalog'
import { collectJobServiceUserLocationIds } from '@/features/scheduling/utils/employee-branch-scope.util'
import type { TimelineJob } from '@/features/scheduling/types/scheduling.types'
import { computeScheduleRunStats } from '@/features/scheduling/utils/schedule-run-stats.util'
import { sortJobsByStartTime } from '@/features/scheduling/utils/schedule-job-travel-distance.util'
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
import { formatOpsHm } from '@/shared/lib/operational-day.util'

function StatRow({ label, value, hint }: { label: string; value: string; hint?: string | null }) {
  return (
    <div className="grid grid-cols-[minmax(8rem,10rem)_1fr] items-baseline gap-x-4 gap-y-0.5 border-b border-border/70 py-2.5 last:border-b-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div>
        <span className="text-sm font-semibold text-foreground">{value}</span>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </div>
    </div>
  )
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  jobs: TimelineJob[]
  date: string
  travelBufferMinutes?: number
  existingRunCount?: number
  onCreated?: () => void
}

export function ScheduleRunCreateDialog({
  open,
  onOpenChange,
  jobs,
  date,
  travelBufferMinutes = 0,
  existingRunCount = 0,
  onCreated,
}: Props) {
  const displayFormat = useScheduleJobsDisplayFormat()
  const mutations = useScheduleRunMutations(date)
  const [name, setName] = React.useState('')
  const [employeeId, setEmployeeId] = React.useState('')
  const [notes, setNotes] = React.useState('')

  const sortedJobs = React.useMemo(() => sortJobsByStartTime(jobs), [jobs])
  const stats = React.useMemo(
    () => computeScheduleRunStats(sortedJobs, travelBufferMinutes),
    [sortedJobs, travelBufferMinutes],
  )

  const serviceUserLocationIds = React.useMemo(
    () => collectJobServiceUserLocationIds(sortedJobs),
    [sortedJobs],
  )
  const employeesQuery = useScheduleEmployeesCatalog({
    enabled: open,
    locationIds: serviceUserLocationIds,
    includeEmployeeIds: employeeId ? [employeeId] : [],
    activeOnly: true,
  })

  const carerOptions = React.useMemo(
    () => [
      { value: '', label: 'Unassigned', description: 'Assign carer later' },
      ...employeesQuery.comboboxOptions,
    ],
    [employeesQuery.comboboxOptions],
  )

  React.useEffect(() => {
    if (!open) return
    const firstHour = sortedJobs[0]?.scheduledStartDateTime
      ? Number(formatOpsHm(sortedJobs[0].scheduledStartDateTime).slice(0, 2)) || 8
      : 8
    const shift = firstHour < 12 ? 'AM' : 'PM'
    setName(`${shift} Run ${existingRunCount + 1}`)
    setEmployeeId('')
    setNotes('')
  }, [open, sortedJobs, existingRunCount])

  const handlePublish = async () => {
    if (!name.trim()) {
      toastWarning('Run name required', 'Enter a name for this run.')
      return
    }
    if (sortedJobs.length < 2) {
      toastWarning('Select more visits', 'Drag to select at least two visits for a run.')
      return
    }

    const inRun = sortedJobs.filter((j) => j.scheduleRunId)
    if (inRun.length > 0) {
      toastWarning('Visits already in a run', 'Remove visits that are already assigned to another run.')
      return
    }

    try {
      const created = await mutations.create.mutateAsync({
        name: name.trim(),
        runDate: date,
        employeeId: employeeId || undefined,
        description: notes.trim() || undefined,
        visitIds: sortedJobs.map((j) => j.id),
      })
      // The run's carer only reaches the visits once they are allocated; a visit someone
      // else already holds moves to the run carer.
      const synced = employeeId
        ? await mutations.syncCarer.mutateAsync({
            id: created.id,
            payload: { force: true, replaceExisting: true },
          })
        : null
      await mutations.update.mutateAsync({
        id: created.id,
        payload: { status: 'PUBLISHED' },
      })
      const warningCount = synced?.warnings?.length ?? 0
      if (warningCount > 0) {
        toastWarning(
          'Run published with warnings',
          `${sortedJobs.length - warningCount} of ${sortedJobs.length} visits allocated to the carer · ${warningCount} could not be. Review the run for details.`,
        )
      } else {
        toastSuccess(
          'Run published',
          `${sortedJobs.length} visits added to ${name.trim()}${employeeId ? ' and allocated to the carer' : ''}.`,
        )
      }
      onOpenChange(false)
      onCreated?.()
    } catch (error) {
      toastApiError(error, 'Could not create run')
    }
  }

  const busy = mutations.create.isPending || mutations.update.isPending || mutations.syncCarer.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>Create run from selection</DialogTitle>
          <DialogDescription>
            {sortedJobs.length} visit{sortedJobs.length === 1 ? '' : 's'} selected for{' '}
            {displayFormat.formatDateLong(date)}. Review stats, assign a carer, then publish.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <FormField label="Run name" htmlFor="create-run-name" required>
            <Input
              id="create-run-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. AM Run 1"
              autoFocus
            />
          </FormField>

          <FormField label="Carer" htmlFor="create-run-carer">
            <Combobox
              options={carerOptions}
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

          <div className="rounded-lg border border-border">
            <p className="border-b border-border bg-muted/30 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Stats
            </p>
            <div className="px-3">
              <StatRow label="Rostered hours" value={stats.rosteredDisplayLabel} />
              <StatRow label="Travel distance" value={stats.travelDistanceLabel} />
              <StatRow
                label="Travel time"
                value={stats.travelMinutes > 0 ? stats.travelTimeDisplayLabel : '—'}
                hint={stats.travelPercentDisplayLabel}
              />
              <StatRow
                label="Wait time"
                value={stats.waitMinutes > 0 ? stats.waitDisplayLabel : '—'}
              />
            </div>
          </div>

          <div className="rounded-lg border border-border bg-muted/15">
            <p className="border-b border-border px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Visit sequence
            </p>
            <ol className="divide-y divide-border">
              {sortedJobs.map((job, index) => (
                <li key={job.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{serviceUserLabel(job.serviceUser)}</p>
                    <p className="text-xs text-muted-foreground">
                      {displayFormat.formatTime(job.scheduledStartDateTime)}–
                      {displayFormat.formatTime(job.scheduledEndDateTime ?? job.scheduledStartDateTime)}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {activeJobAllocationCount(job)}/{job.requiredCarers} carer
                    {job.requiredCarers === 1 ? '' : 's'}
                  </span>
                </li>
              ))}
            </ol>
          </div>

          <FormField label="Notes" htmlFor="create-run-notes" hint="Optional internal notes for coordinators.">
            <Textarea
              id="create-run-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Route notes, handover details, or area coverage…"
            />
          </FormField>
        </DialogBody>
        <DialogFooter className="flex-wrap gap-2 sm:justify-between">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void handlePublish()} disabled={busy}>
            {busy ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Publishing…
              </>
            ) : (
              'Save & publish run'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
