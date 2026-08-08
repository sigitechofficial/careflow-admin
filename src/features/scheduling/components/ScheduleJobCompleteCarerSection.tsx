import * as React from 'react'
import { AlertTriangle, Loader2, UserPlus } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { toastApiError, toastSuccess, toastWarning } from '@/shared/lib/toast'
import { Button } from '@/shared/ui/button'
import { Label } from '@/shared/ui/form-field'
import { Input } from '@/shared/ui/input'
import { employeeListRowDisplayName } from '@/features/employees/lib/employee-display-name'
import { useAllocateJob } from '@/features/scheduling/hooks/useSchedulingMutations'
import { useScheduleEmployeesCatalog } from '@/features/scheduling/hooks/useScheduleEmployeesCatalog'
import { collectJobServiceUserLocationIds } from '@/features/scheduling/utils/employee-branch-scope.util'
import { ScheduleJobRecommendedCarers } from '@/features/scheduling/components/ScheduleJobRecommendedCarers'
import { useShowBlockedCarersInSchedule } from '@/features/scheduling/hooks/useSchedulingSettings'
import type { TimelineJob } from '@/features/scheduling/types/scheduling.types'
import {
  activeJobAllocationCount,
  employeesLabel,
  jobNeedsCarerAssignment,
} from '@/features/scheduling/utils/scheduling-format'
import {
  allocationWarningsSummary,
  warningsFromAllocateError,
  type AllocationWarning,
} from '@/features/scheduling/utils/allocate-job-warnings.util'
import { buildRotaBookedEmployeeIds } from '@/features/scheduling/utils/schedule-carer-suggest.util'
import type { VisitPlanCarerCandidate } from '@/features/service-users/visit-plan/types'

type Props = {
  job: TimelineJob
  disabled?: boolean
  onAllocated?: () => void
}

export function ScheduleJobCompleteCarerSection({ job, disabled, onAllocated }: Props) {
  const showBlockedCarers = useShowBlockedCarersInSchedule()
  const [search, setSearch] = React.useState('')
  const [selectedEmployeeId, setSelectedEmployeeId] = React.useState<string | null>(null)
  const [allocatingEmployeeId, setAllocatingEmployeeId] = React.useState<string | null>(null)
  const [pendingWarnings, setPendingWarnings] = React.useState<AllocationWarning[]>([])
  const [pendingEmployeeId, setPendingEmployeeId] = React.useState<string | null>(null)
  const [suggestCandidates, setSuggestCandidates] = React.useState<VisitPlanCarerCandidate[]>([])
  const [assignAsLead, setAssignAsLead] = React.useState(false)

  const allocate = useAllocateJob()
  const serviceUserLocationIds = React.useMemo(
    () => collectJobServiceUserLocationIds([job]),
    [job],
  )
  const employeesQuery = useScheduleEmployeesCatalog({
    locationIds: serviceUserLocationIds,
  })

  const allocatedCount = activeJobAllocationCount(job)
  const slotsRemaining = Math.max(0, job.requiredCarers - allocatedCount)
  const needsMoreCarers = jobNeedsCarerAssignment(job)
  const multiCarerJob = job.requiredCarers > 1
  const visitId = job.visits?.[0]?.id
  const allocatedEmployeeIds = new Set((job.allocations ?? []).map((a) => a.employeeId))

  const rotaBookedEmployeeIds = React.useMemo(
    () => buildRotaBookedEmployeeIds(suggestCandidates),
    [suggestCandidates],
  )

  const blockedEmployeeIds = React.useMemo(
    () =>
      showBlockedCarers
        ? new Set<string>()
        : new Set(suggestCandidates.filter((c) => c.isBlocked).map((c) => c.employeeId)),
    [showBlockedCarers, suggestCandidates],
  )

  const preferredEmployeeIds = React.useMemo(
    () => new Set(suggestCandidates.filter((c) => c.isPreferred).map((c) => c.employeeId)),
    [suggestCandidates],
  )

  const filteredEmployees = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    return employeesQuery.employees
      .filter((row) => !allocatedEmployeeIds.has(row.id))
      .filter((row) => !rotaBookedEmployeeIds.has(row.id))
      .filter((row) => !blockedEmployeeIds.has(row.id))
      .filter((row) => {
        if (!q) return true
        const name = employeeListRowDisplayName(row).toLowerCase()
        return name.includes(q) || row.id.toLowerCase().includes(q)
      })
      .sort((a, b) => {
        const aPreferred = preferredEmployeeIds.has(a.id)
        const bPreferred = preferredEmployeeIds.has(b.id)
        if (aPreferred !== bPreferred) return aPreferred ? -1 : 1
        return employeeListRowDisplayName(a).localeCompare(employeeListRowDisplayName(b))
      })
      .slice(0, 40)
  }, [
    allocatedEmployeeIds,
    blockedEmployeeIds,
    employeesQuery.employees,
    preferredEmployeeIds,
    rotaBookedEmployeeIds,
    search,
  ])

  const runAllocate = async (employeeId: string, force = false) => {
    setAllocatingEmployeeId(employeeId)
    try {
      const result = await allocate.mutateAsync({
        jobId: job.id,
        employeeId,
        scheduledVisitId: visitId,
        force,
        isLeadCarer: multiCarerJob ? assignAsLead : undefined,
      })
      setPendingWarnings([])
      setPendingEmployeeId(null)
      setSelectedEmployeeId(null)
      setAssignAsLead(false)
      if (result.data.status === 'PENDING_CONFIRMATION') {
        toastWarning('Confirmation required', result.message)
      } else {
        toastSuccess('Carer allocated', result.message)
      }
      onAllocated?.()
    } catch (error) {
      const warnings = warningsFromAllocateError(error)
      if (warnings.length > 0) {
        setPendingWarnings(warnings)
        setPendingEmployeeId(employeeId)
        return
      }
      toastApiError(error, 'Could not allocate carer')
    } finally {
      setAllocatingEmployeeId(null)
    }
  }

  const handleAllocateSelected = () => {
    if (!selectedEmployeeId) return
    void runAllocate(selectedEmployeeId)
  }

  const handleForceAllocate = () => {
    if (!pendingEmployeeId) return
    void runAllocate(pendingEmployeeId, true)
  }

  if (!needsMoreCarers) {
    return (
      <section className="space-y-2 rounded-lg border border-border bg-muted/20 px-4 py-3">
        <h4 className="text-sm font-semibold text-foreground">Carers on visit</h4>
        <p className="text-sm text-muted-foreground">{employeesLabel(job)}</p>
      </section>
    )
  }

  return (
    <section className="space-y-4 rounded-lg border border-amber-300 bg-amber-50/50 px-4 py-3 dark:border-amber-800 dark:bg-amber-950/20">
      <div className="flex items-start gap-2 text-sm text-amber-950 dark:text-amber-100">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <div>
          <p className="font-semibold">Assign carers before completing</p>
          <p className="mt-0.5 text-amber-900/90 dark:text-amber-200">
            This visit needs {job.requiredCarers} carer{job.requiredCarers === 1 ? '' : 's'}.{' '}
            {allocatedCount > 0
              ? `${slotsRemaining} more required.`
              : 'No carers are assigned yet.'}
          </p>
        </div>
      </div>

      {allocatedCount > 0 ? (
        <p className="text-sm text-muted-foreground">Assigned so far: {employeesLabel(job)}</p>
      ) : null}

      <ScheduleJobRecommendedCarers
        job={job}
        allocatedEmployeeIds={allocatedEmployeeIds}
        allocatingEmployeeId={allocatingEmployeeId}
        onAssign={(employeeId) => void runAllocate(employeeId)}
        onCandidatesChange={setSuggestCandidates}
      />

      <div className="space-y-3 border-t border-amber-200/80 pt-3 dark:border-amber-800/80">
        {multiCarerJob ? (
          <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-border"
              checked={assignAsLead}
              disabled={disabled || !!allocatingEmployeeId}
              onChange={(event) => setAssignAsLead(event.target.checked)}
            />
            Assign as lead carer
          </label>
        ) : null}
        <div>
          <Label htmlFor="complete-carer-search" className="text-xs text-muted-foreground">
            Search employees
          </Label>
          <Input
            id="complete-carer-search"
            className="mt-1"
            placeholder="Search by name…"
            value={search}
            disabled={disabled || !!allocatingEmployeeId}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        {employeesQuery.isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Loading employees…
          </div>
        ) : (
          <ul className="max-h-40 space-y-1 overflow-y-auto rounded-md border border-border bg-background p-1">
            {filteredEmployees.length === 0 ? (
              <li className="px-2 py-3 text-center text-sm text-muted-foreground">
                {employeesQuery.locationFilterApplied
                  ? 'No carers for this service user’s branch match your search.'
                  : 'No employees match your search.'}
              </li>
            ) : (
              filteredEmployees.map((row) => (
                <li key={row.id}>
                  <button
                    type="button"
                    disabled={disabled || !!allocatingEmployeeId}
                    className={cn(
                      'flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm hover:bg-muted/60',
                      selectedEmployeeId === row.id && 'bg-sky-50 ring-1 ring-sky-300 dark:bg-sky-950/40',
                    )}
                    onClick={() => setSelectedEmployeeId(row.id)}
                  >
                    <span className="font-medium">{employeeListRowDisplayName(row)}</span>
                    {selectedEmployeeId === row.id ? (
                      <span className="text-xs text-sky-700 dark:text-sky-300">Selected</span>
                    ) : null}
                  </button>
                </li>
              ))
            )}
          </ul>
        )}

        {pendingWarnings.length > 0 ? (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-800 dark:bg-amber-950/30">
            <p className="font-semibold text-amber-950 dark:text-amber-100">Allocation warnings</p>
            <p className="mt-1 text-amber-900 dark:text-amber-200">
              {allocationWarningsSummary(pendingWarnings)}
            </p>
            <Button
              type="button"
              size="sm"
              className="mt-3"
              variant="secondary"
              disabled={disabled || allocate.isPending}
              onClick={handleForceAllocate}
            >
              Allocate anyway
            </Button>
          </div>
        ) : null}

        <Button
          type="button"
          size="sm"
          disabled={!selectedEmployeeId || disabled || !!allocatingEmployeeId || allocate.isPending}
          onClick={handleAllocateSelected}
        >
          {allocate.isPending || allocatingEmployeeId ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <UserPlus className="mr-2 h-4 w-4" aria-hidden />
          )}
          Allocate carer
        </Button>
      </div>
    </section>
  )
}
