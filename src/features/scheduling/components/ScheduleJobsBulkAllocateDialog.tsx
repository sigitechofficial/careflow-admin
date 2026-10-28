import * as React from 'react'
import { Clock, Loader2, Users } from 'lucide-react'
import { useAllocateJob, useUnallocateJob } from '@/features/scheduling/hooks/useSchedulingMutations'
import { useShowBlockedCarersInSchedule } from '@/features/scheduling/hooks/useSchedulingSettings'
import { useScheduleJobsDisplayFormat } from '@/features/scheduling/context/schedule-jobs-display-format.context'
import { useBulkCarerSuggestions } from '@/features/scheduling/hooks/useBulkCarerSuggestions'
import type { VisitPlanCarerFit } from '@/features/service-users/visit-plan/types'
import { VisitPlanCarerPickerRow } from '@/features/service-users/visit-plan/VisitPlanCarerPickerRow'
import { fitLabel } from '@/features/service-users/visit-plan/VisitPlanCarerCandidateDetails'
import { visitPlanCarerPickerRowClass } from '@/features/service-users/visit-plan/visit-plan-carer-candidate-card.util'
import { buildScheduleJobSuggestCarersRequest } from '@/features/scheduling/utils/schedule-job-recommend-carers.util'
import { sortJobsByStartTime } from '@/features/scheduling/utils/schedule-job-travel-distance.util'
import { activeJobAllocationCount, serviceUserLabel } from '@/features/scheduling/utils/scheduling-format'
import type { TimelineJob } from '@/features/scheduling/types/scheduling.types'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { RadioGroup, RadioGroupItem } from '@/shared/ui/toggle-controls'
import { contentHelperClass, contentTitleClass } from '@/shared/ui/content-section'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { apiErrorMessage } from '@/shared/lib/api-error-message'
import { toastSuccess, toastWarning } from '@/shared/lib/toast'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  jobs: TimelineJob[]
  onAllocated?: () => void
}

type Outcome = {
  job: TimelineJob
  result: 'allocated' | 'already' | 'approval' | 'skipped' | 'failed'
  message?: string
}

const FIT_ORDER: VisitPlanCarerFit[] = ['good', 'partial', 'poor']

const holderNames = (job: TimelineJob) =>
  (job.allocations ?? [])
    .map((a) => [a.employee?.firstName, a.employee?.lastName].filter(Boolean).join(' '))
    .filter(Boolean)

/** One carer onto every selected visit, without making a run. */
export function ScheduleJobsBulkAllocateDialog({ open, onOpenChange, jobs, onAllocated }: Props) {
  const displayFormat = useScheduleJobsDisplayFormat()
  const showBlockedCarers = useShowBlockedCarersInSchedule()
  const allocate = useAllocateJob()
  const unallocate = useUnallocateJob()
  const [employeeId, setEmployeeId] = React.useState('')
  const [search, setSearch] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const [failures, setFailures] = React.useState<Outcome[]>([])

  const sortedJobs = React.useMemo(() => sortJobsByStartTime(jobs), [jobs])
  const visitDays = React.useMemo(
    () => [...new Set(sortedJobs.flatMap((job) => buildScheduleJobSuggestCarersRequest(job).daysOfWeek))],
    [sortedJobs],
  )
  const requiredCarers = Math.max(1, ...sortedJobs.map((job) => job.requiredCarers))
  const { candidates, loading, error, reload: loadSuggestions } = useBulkCarerSuggestions(sortedJobs, open)

  React.useEffect(() => {
    if (!open) return
    setEmployeeId('')
    setSearch('')
    setFailures([])
  }, [open])

  const visible = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    return candidates
      .filter((c) => !c.ruleBlocked && (showBlockedCarers || !c.isBlocked))
      .filter((c) => !q || [c.displayName, c.role, c.jobTitle].filter(Boolean).join(' ').toLowerCase().includes(q))
  }, [candidates, search, showBlockedCarers])

  const groups = FIT_ORDER.map((fit) => ({ fit, rows: visible.filter((c) => c.fit === fit) })).filter(
    (g) => g.rows.length > 0,
  )

  const allocateOne = async (job: TimelineJob): Promise<Outcome> => {
    const holders = (job.allocations ?? []).map((a) => a.employeeId)
    if (holders.includes(employeeId)) return { job, result: 'already' }

    const full = activeJobAllocationCount(job) >= job.requiredCarers
    if (full && job.requiredCarers > 1) {
      return { job, result: 'skipped', message: 'Team visit is full; change a carer from the visit itself.' }
    }
    // Single-carer visit someone else holds: swap them out (put them back if the new carer is refused).
    const replacing = full ? holders[0] : undefined
    try {
      if (replacing) {
        await unallocate.mutateAsync({ jobId: job.id, employeeId: replacing, reason: 'Visits allocated together' })
      }
      try {
        const res = await allocate.mutateAsync({ jobId: job.id, employeeId, force: true })
        return { job, result: res.approvalRequested ? 'approval' : 'allocated', message: res.message }
      } catch (e) {
        if (replacing) {
          await allocate.mutateAsync({ jobId: job.id, employeeId: replacing, force: true }).catch(() => undefined)
        }
        throw e
      }
    } catch (e) {
      return { job, result: 'failed', message: apiErrorMessage(e, 'Could not allocate') }
    }
  }

  const handleConfirm = async () => {
    if (!employeeId) {
      toastWarning('Choose a carer', 'Pick the carer to allocate to the selected visits.')
      return
    }
    setBusy(true)
    const outcomes: Outcome[] = []
    for (const job of sortedJobs) outcomes.push(await allocateOne(job))
    setBusy(false)
    onAllocated?.()

    const done = outcomes.filter((o) => o.result === 'allocated' || o.result === 'already').length
    const approvals = outcomes.filter((o) => o.result === 'approval').length
    const problems = outcomes.filter((o) => o.result === 'failed' || o.result === 'skipped')

    if (approvals > 0) {
      toastWarning('Sent to a manager', `${approvals} visit(s) need a manager's approval for this carer's hours.`)
    }
    if (problems.length > 0) {
      toastWarning('Some visits not allocated', `${done} of ${outcomes.length} allocated · ${problems.length} could not be.`)
      setFailures(problems)
      return
    }
    if (approvals === 0) toastSuccess('Visits allocated', `${done} of ${outcomes.length} visits allocated to the carer.`)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent size="xl" className="flex max-h-[90vh] flex-col">
        <DialogHeader>
          <DialogTitle>Allocate carer — {sortedJobs.length} visits</DialogTitle>
          <DialogDescription>
            One carer for all the selected visits. No run is created; visits another carer holds move to this carer.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="min-h-0 flex-1 space-y-4 overflow-y-auto">
          <section className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                <Clock className="h-4 w-4" aria-hidden />
                {sortedJobs.length} visits
              </span>
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <Users className="h-4 w-4" aria-hidden />
                {requiredCarers} carer{requiredCarers === 1 ? '' : 's'} required
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="ml-auto"
                disabled={loading}
                onClick={() => void loadSuggestions()}
              >
                {loading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
                Refresh
              </Button>
            </div>
            <ul className="flex flex-wrap gap-2">
              {sortedJobs.map((job) => {
                const failure = failures.find((f) => f.job.id === job.id)
                const names = holderNames(job)
                return (
                  <li
                    key={job.id}
                    className={
                      failure
                        ? 'rounded-md border border-destructive/40 bg-destructive/5 px-2.5 py-1.5 text-xs'
                        : 'rounded-md border border-border bg-card px-2.5 py-1.5 text-xs'
                    }
                  >
                    <span className="font-medium text-foreground">{serviceUserLabel(job.serviceUser)}</span>
                    <span className="text-muted-foreground">
                      {' · '}
                      {displayFormat.formatTime(job.scheduledStartDateTime)}–
                      {displayFormat.formatTime(job.scheduledEndDateTime ?? job.scheduledStartDateTime)}
                      {' · '}
                      {names.length > 0 ? `Now: ${names.join(', ')}` : 'Unallocated'}
                    </span>
                    {failure ? <p className="mt-0.5 text-destructive">{failure.message}</p> : null}
                  </li>
                )
              })}
            </ul>
            <p className={contentHelperClass}>
              Carers suggested for every selected visit. Team visits that are already full are left as they are.
            </p>
          </section>

          <section className="space-y-2">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h3 className={contentTitleClass}>Suggested carers</h3>
                <p className={contentHelperClass}>
                  Working pattern, rota bookings, skills, and preferences are shown for each carer.
                </p>
              </div>
              <Input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or role…"
                aria-label="Search carers"
                className="h-9 w-full sm:max-w-xs"
              />
            </div>

            {error ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            ) : null}

            {loading && candidates.length === 0 ? (
              <div className="flex items-center gap-2 rounded-lg border border-dashed border-border px-4 py-8 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading carer availability…
              </div>
            ) : null}

            {!loading && !error && visible.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                {search.trim() ? 'No carers match your search.' : 'No carer is suggested for all of these visits.'}
              </p>
            ) : null}

            {visible.length > 0 ? (
              <ul className="overflow-hidden rounded-lg border border-border">
                <RadioGroup
                  value={employeeId}
                  onValueChange={setEmployeeId}
                  className="gap-0 divide-y divide-border"
                >
                  {groups.map((group) => (
                    <React.Fragment key={group.fit}>
                      <li role="presentation" className="bg-muted/50 px-3 py-1.5 text-xs font-medium text-muted-foreground">
                        {fitLabel(group.fit)} · {group.rows.length}
                      </li>
                      {group.rows.map((c) => {
                        const rotaConflict = Boolean(c.hasRotaConflict)
                        const complianceBlocked = Boolean(c.complianceBlocksAllocation)
                        const selectable = !busy && !c.isBlocked && !rotaConflict && !complianceBlocked
                        const selected = employeeId === c.employeeId
                        return (
                          <li
                            key={c.employeeId}
                            className={visitPlanCarerPickerRowClass({
                              selected,
                              blocked: c.isBlocked,
                              rotaConflict,
                              complianceBlocked,
                            })}
                            onClick={() => {
                              if (selectable) setEmployeeId(selected ? '' : c.employeeId)
                            }}
                          >
                            <VisitPlanCarerPickerRow
                              candidate={c}
                              slotDaysOfWeek={visitDays}
                              isAssigned={selected}
                              blocked={c.isBlocked}
                              control={
                                <RadioGroupItem
                                  value={c.employeeId}
                                  disabled={!selectable}
                                  className="shrink-0 border-foreground/50"
                                  aria-label={`Allocate ${c.displayName}`}
                                  onClick={(event) => event.stopPropagation()}
                                />
                              }
                            />
                          </li>
                        )
                      })}
                    </React.Fragment>
                  ))}
                </RadioGroup>
              </ul>
            ) : null}
          </section>
        </DialogBody>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            {failures.length > 0 ? 'Close' : 'Cancel'}
          </Button>
          <Button type="button" onClick={() => void handleConfirm()} disabled={busy || !employeeId}>
            {busy ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Allocating…
              </>
            ) : (
              'Confirm'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
