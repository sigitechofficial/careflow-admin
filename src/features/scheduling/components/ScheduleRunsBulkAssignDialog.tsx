import * as React from 'react'
import { Loader2 } from 'lucide-react'
import type { ScheduleRunBulkAssignBundle } from '@/features/scheduling/hooks/useScheduleRunsBulkAssignDialog'
import { scheduleRunAccentColor } from '@/features/scheduling/utils/schedule-run-board.util'
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
import { FormField } from '@/shared/ui/form-field'

type CarerOption = {
  value: string
  label: string
  description?: string
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  date: string
  bundles: ScheduleRunBulkAssignBundle[]
  employeeId: string
  onEmployeeIdChange: (value: string) => void
  carerOptions: CarerOption[]
  carersLoading?: boolean
  onAssign: () => void | Promise<void>
  saving?: boolean
}

export function ScheduleRunsBulkAssignDialog({
  open,
  onOpenChange,
  date,
  bundles,
  employeeId,
  onEmployeeIdChange,
  carerOptions,
  carersLoading,
  onAssign,
  saving,
}: Props) {
  const displayFormat = useScheduleJobsDisplayFormat()
  const visitCount = bundles.reduce((sum, entry) => sum + entry.jobs.length, 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Assign carer to runs</DialogTitle>
          <DialogDescription>
            Assign one carer to {bundles.length} selected run{bundles.length === 1 ? '' : 's'} on{' '}
            {displayFormat.formatDateLong(date)}.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <div className="rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm">
            <p>
              <span className="text-muted-foreground">Runs:</span>{' '}
              <span className="font-semibold">{bundles.length}</span>
            </p>
            <p className="mt-1">
              <span className="text-muted-foreground">Total visits:</span>{' '}
              <span className="font-semibold">{visitCount}</span>
            </p>
          </div>

          <div className="max-h-[min(200px,35vh)] space-y-1.5 overflow-y-auto rounded-lg border border-border bg-muted/10 p-2">
            {bundles.map(({ run, jobs }) => {
              const accent = scheduleRunAccentColor(run.id)
              return (
                <div
                  key={run.id}
                  className="flex items-center gap-2 rounded-md border border-border/80 bg-card px-2 py-1.5 text-sm"
                >
                  <span
                    className="h-6 w-1 shrink-0 rounded-full"
                    style={{ backgroundColor: accent.border }}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1 truncate font-medium">{run.name}</span>
                  <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                    {jobs.length} visit{jobs.length === 1 ? '' : 's'}
                  </span>
                </div>
              )
            })}
          </div>

          <FormField label="Run carer" htmlFor="bulk-assign-run-carer" required>
            <Combobox
              options={carerOptions}
              value={employeeId}
              onChange={onEmployeeIdChange}
              placeholder="Select carer…"
              searchPlaceholder="Search carers…"
              emptyText="No carers found."
              disabled={carersLoading}
            />
          </FormField>
        </DialogBody>
        <DialogFooter className="flex-wrap gap-2 sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void onAssign()} disabled={saving || !employeeId}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Assigning…
              </>
            ) : (
              `Assign to ${bundles.length} runs`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
