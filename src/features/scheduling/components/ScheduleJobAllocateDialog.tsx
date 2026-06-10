import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Loader2, UserMinus, UserPlus } from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import { cn } from '@/shared/lib/utils'
import { toastApiError, toastSuccess, toastWarning } from '@/shared/lib/toast'
import { Button } from '@/shared/ui/button'
import { Label } from '@/shared/ui/form-field'
import { Input } from '@/shared/ui/input'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { listAllEmployees } from '@/features/employees/api'
import { employeeKeys } from '@/features/employees/keys'
import { employeeListRowDisplayName } from '@/features/employees/lib/employee-display-name'
import {
  useAllocateJob,
  useUnallocateJob,
} from '@/features/scheduling/hooks/useSchedulingMutations'
import type { TimelineJob } from '@/features/scheduling/types/scheduling.types'
import {
  activeJobAllocationCount,
  employeesLabel,
  formatJobTimeRange,
  jobNeedsCarerAssignment,
  serviceUserLabel,
} from '@/features/scheduling/utils/scheduling-format'
import {
  jobAttentionReason,
  timelineJobVisitPlanSlot,
} from '@/features/scheduling/utils/scheduling-visit-plan.util'

type AllocationWarning = { type: string; message: string; severity: string }

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  job: TimelineJob | null
  onAllocated?: () => void
}

function warningsFromAllocateError(e: unknown): AllocationWarning[] {
  if (!(e instanceof ApiError)) return []
  const body = e.body
  if (!body || typeof body !== 'object') return []
  const record = body as Record<string, unknown>
  if (Array.isArray(record.warnings)) return record.warnings as AllocationWarning[]
  const msg = record.message
  if (msg && typeof msg === 'object' && !Array.isArray(msg)) {
    const nested = msg as Record<string, unknown>
    if (Array.isArray(nested.warnings)) return nested.warnings as AllocationWarning[]
  }
  return []
}

function employeeNameFromAllocation(
  allocation: TimelineJob['allocations'][number],
): string {
  const e = allocation.employee
  if (!e) return 'Unknown employee'
  return [e.firstName, e.lastName].filter(Boolean).join(' ') || 'Unknown employee'
}

export function ScheduleJobAllocateDialog({ open, onOpenChange, job, onAllocated }: Props) {
  const [search, setSearch] = React.useState('')
  const [selectedEmployeeId, setSelectedEmployeeId] = React.useState<string | null>(null)
  const [pendingWarnings, setPendingWarnings] = React.useState<AllocationWarning[]>([])
  const [pendingEmployeeId, setPendingEmployeeId] = React.useState<string | null>(null)

  const allocate = useAllocateJob()
  const unallocate = useUnallocateJob()

  const employeesQuery = useQuery({
    queryKey: employeeKeys.allList({}),
    queryFn: () => listAllEmployees({}),
    enabled: open,
    staleTime: 60_000,
  })

  React.useEffect(() => {
    if (!open) {
      setSearch('')
      setSelectedEmployeeId(null)
      setPendingWarnings([])
      setPendingEmployeeId(null)
    }
  }, [open])

  const allocatedCount = job ? activeJobAllocationCount(job) : 0
  const slotsRemaining = job ? Math.max(0, job.requiredCarers - allocatedCount) : 0
  const attention = job ? jobAttentionReason(job) : null
  const visitId = job?.visits?.[0]?.id
  const allocatedEmployeeIds = new Set((job?.allocations ?? []).map((a) => a.employeeId))

  const filteredEmployees = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    return (employeesQuery.data ?? [])
      .filter((row) => !allocatedEmployeeIds.has(row.id))
      .filter((row) => {
        if (!q) return true
        const name = employeeListRowDisplayName(row).toLowerCase()
        return name.includes(q) || row.id.toLowerCase().includes(q)
      })
      .slice(0, 40)
  }, [employeesQuery.data, allocatedEmployeeIds, search])

  const runAllocate = async (employeeId: string, force = false) => {
    if (!job) return
    try {
      const result = await allocate.mutateAsync({
        jobId: job.id,
        employeeId,
        scheduledVisitId: visitId,
        force,
      })
      setPendingWarnings([])
      setPendingEmployeeId(null)
      setSelectedEmployeeId(null)
      if (result.data.status === 'PENDING_CONFIRMATION') {
        toastWarning('Confirmation required', result.message)
      } else {
        toastSuccess('Carer allocated', result.message)
      }
      onAllocated?.()
    } catch (e) {
      const warnings = warningsFromAllocateError(e)
      if (warnings.length > 0) {
        setPendingWarnings(warnings)
        setPendingEmployeeId(employeeId)
        return
      }
      toastApiError(e, 'Could not allocate carer')
    }
  }

  const handleAllocate = () => {
    if (!selectedEmployeeId) return
    void runAllocate(selectedEmployeeId)
  }

  const handleForceAllocate = () => {
    if (!pendingEmployeeId) return
    void runAllocate(pendingEmployeeId, true)
  }

  const handleUnallocate = (employeeId: string) => {
    if (!job) return
    unallocate.mutate(
      { jobId: job.id, employeeId },
      {
        onSuccess: (res) => {
          toastSuccess('Carer removed', res.message ?? 'Allocation removed')
          onAllocated?.()
        },
        onError: (e) => toastApiError(e, 'Could not remove carer'),
      },
    )
  }

  if (!job) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" className="max-h-[90vh] overflow-hidden p-0">
        <DialogHeader>
          <DialogTitle>Assign carers</DialogTitle>
          <DialogDescription>
            {serviceUserLabel(job.serviceUser)}
            {timelineJobVisitPlanSlot(job) ? ` · ${timelineJobVisitPlanSlot(job)}` : ''} ·{' '}
            {formatJobTimeRange(job)}
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="max-h-[calc(90vh-10rem)] space-y-5 overflow-y-auto">
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm">
            <span>
              <strong>{allocatedCount}</strong> / {job.requiredCarers} carers assigned
            </span>
            {slotsRemaining > 0 ? (
              <span className="text-amber-800 dark:text-amber-200">
                {slotsRemaining} more required
              </span>
            ) : (
              <span className="text-emerald-700 dark:text-emerald-300">Fully allocated</span>
            )}
          </div>

          {attention ? (
            <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <p>{attention}</p>
            </div>
          ) : null}

          <section className="space-y-2">
            <h4 className="text-sm font-semibold text-foreground">Assigned carers</h4>
            {(job.allocations ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No carers on this job yet.</p>
            ) : (
              <ul className="space-y-2">
                {(job.allocations ?? []).map((allocation) => (
                  <li
                    key={allocation.id}
                    className="flex items-center justify-between gap-2 rounded-md border border-border bg-card px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {employeeNameFromAllocation(allocation)}
                      </p>
                      <p className="text-xs text-muted-foreground">{allocation.status}</p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={unallocate.isPending}
                      onClick={() => handleUnallocate(allocation.employeeId)}
                    >
                      <UserMinus className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                      Remove
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-xs text-muted-foreground">On rota: {employeesLabel(job)}</p>
          </section>

          {jobNeedsCarerAssignment(job) ? (
            <section className="space-y-3 border-t border-border pt-4">
              <h4 className="text-sm font-semibold text-foreground">Add carer</h4>
              <div>
                <Label htmlFor="allocate-employee-search" className="text-xs text-muted-foreground">
                  Search employees
                </Label>
                <Input
                  id="allocate-employee-search"
                  className="mt-1"
                  placeholder="Search by name…"
                  value={search}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                />
              </div>

              {employeesQuery.isLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Loading employees…
                </div>
              ) : (
                <ul className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-border p-1">
                  {filteredEmployees.length === 0 ? (
                    <li className="px-2 py-3 text-center text-sm text-muted-foreground">
                      No employees match your search.
                    </li>
                  ) : (
                    filteredEmployees.map((row) => (
                      <li key={row.id}>
                        <button
                          type="button"
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
                  <p className="font-semibold text-amber-950 dark:text-amber-100">
                    Allocation warnings
                  </p>
                  <ul className="mt-2 list-disc space-y-1 pl-4 text-amber-900 dark:text-amber-200">
                    {pendingWarnings.map((w) => (
                      <li key={`${w.type}-${w.message}`}>{w.message}</li>
                    ))}
                  </ul>
                  <Button
                    type="button"
                    size="sm"
                    className="mt-3"
                    variant="secondary"
                    disabled={allocate.isPending}
                    onClick={handleForceAllocate}
                  >
                    Allocate anyway
                  </Button>
                </div>
              ) : null}
            </section>
          ) : null}

          {job.visitPlan ? (
            <p className="text-xs text-muted-foreground border-t border-border pt-3">
              To change default carers for future visits, update the{' '}
              <Link
                to="/service-users/$serviceUserId/visit-plan"
                params={{ serviceUserId: job.serviceUserId }}
                className="text-sky-600 underline"
                onClick={() => onOpenChange(false)}
              >
                visit plan
              </Link>
              .
            </p>
          ) : null}
        </DialogBody>

        <DialogFooter className="border-t border-border">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {jobNeedsCarerAssignment(job) ? (
            <Button
              type="button"
              disabled={!selectedEmployeeId || allocate.isPending}
              onClick={handleAllocate}
            >
              {allocate.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <UserPlus className="mr-2 h-4 w-4" aria-hidden />
              )}
              Allocate carer
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
