import * as React from 'react'
import { Loader2 } from 'lucide-react'
import type { TimelineJob } from '@/features/scheduling/types/scheduling.types'
import { ScheduleRunRecommendCarers } from '@/features/scheduling/components/ScheduleRunRecommendCarers'
import { formatScheduleJobsDateLabel } from '@/features/scheduling/utils/schedule-jobs-timeline.util'
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
import { FormField } from '@/shared/ui/form-field'

type CarerOption = {
  value: string
  label: string
  description?: string
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  runName: string
  date: string
  jobs: TimelineJob[]
  currentEmployeeLabel: string
  newEmployeeId: string
  onNewEmployeeIdChange: (value: string) => void
  carerOptions: CarerOption[]
  carersLoading?: boolean
  onReassign: () => void | Promise<void>
  onOpenFullEditor?: () => void
  saving?: boolean
}

export function scheduleRunCarerLabelFromJobs(jobs: TimelineJob[], employeeId?: string | null): string {
  if (employeeId) {
    for (const job of jobs) {
      const match = job.allocations?.find((allocation) => allocation.employeeId === employeeId)
      if (match?.employee) {
        const name = [match.employee.firstName, match.employee.lastName].filter(Boolean).join(' ')
        if (name) return name
      }
    }
  }
  const names = new Set<string>()
  for (const job of jobs) {
    for (const allocation of job.allocations ?? []) {
      const name = [allocation.employee?.firstName, allocation.employee?.lastName].filter(Boolean).join(' ')
      if (name) names.add(name)
    }
  }
  if (names.size === 0) return 'Unassigned'
  return [...names].slice(0, 2).join(', ')
}

export function ScheduleRunReassignDialog({
  open,
  onOpenChange,
  runName,
  date,
  jobs,
  currentEmployeeLabel,
  newEmployeeId,
  onNewEmployeeIdChange,
  carerOptions,
  carersLoading,
  onReassign,
  onOpenFullEditor,
  saving,
}: Props) {
  const [recommendOpen, setRecommendOpen] = React.useState(false)
  const proxyJob = jobs[0] ?? null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Reassign run</DialogTitle>
          <DialogDescription>
            Move all visits in <span className="font-medium text-foreground">{runName}</span> to another
            carer on {formatScheduleJobsDateLabel(date)}.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <div className="rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm">
            <p>
              <span className="text-muted-foreground">Visits in run:</span>{' '}
              <span className="font-semibold">{jobs.length}</span>
            </p>
            <p className="mt-1">
              <span className="text-muted-foreground">Current carer:</span>{' '}
              <span className="font-medium">{currentEmployeeLabel}</span>
            </p>
          </div>

          <FormField label="New run carer" htmlFor="reassign-run-carer" required>
            <div className="flex gap-2">
              <Combobox
                options={carerOptions}
                value={newEmployeeId}
                onChange={onNewEmployeeIdChange}
                placeholder="Select carer…"
                searchPlaceholder="Search carers…"
                emptyText="No carers found."
                className="flex-1"
                disabled={carersLoading}
              />
              {proxyJob ? (
                <Button
                  type="button"
                  variant="outline"
                  className="shrink-0"
                  title="View recommended carers"
                  onClick={() => setRecommendOpen((value) => !value)}
                >
                  Recommend
                </Button>
              ) : null}
            </div>
          </FormField>

          {proxyJob ? (
            <ScheduleRunRecommendCarers
              job={proxyJob}
              selectedEmployeeId={newEmployeeId}
              onSelectCarer={onNewEmployeeIdChange}
              open={recommendOpen}
              onOpenChange={setRecommendOpen}
            />
          ) : null}
        </DialogBody>
        <DialogFooter className="flex-wrap gap-2 sm:justify-between">
          {onOpenFullEditor ? (
            <Button type="button" variant="ghost" onClick={onOpenFullEditor} disabled={saving}>
              Open full run editor
            </Button>
          ) : (
            <span />
          )}
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void onReassign()} disabled={saving || !newEmployeeId}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Reassigning…
                </>
              ) : (
                'Reassign run'
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
