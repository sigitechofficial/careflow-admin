import type { ReactNode } from 'react'
import type { TimelineJob } from '@/features/scheduling/types/scheduling.types'
import type { ScheduleJobContextAction } from '@/features/scheduling/types/schedule-job-context-actions.types'
import {
  isScheduleJobReadOnly,
  isScheduleJobReinstatable,
  isScheduleJobTerminal,
  scheduleJobHasAllocations,
} from '@/features/scheduling/types/schedule-job-context-actions.types'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/shared/ui/context-menu'
import { Tooltip, TooltipTrigger } from '@/shared/ui/tooltip'

type Props = {
  job: TimelineJob
  children: ReactNode
  tooltip?: ReactNode
  onAction: (job: TimelineJob, action: ScheduleJobContextAction) => void
}

export function ScheduleJobContextMenu({ job, children, tooltip, onAction }: Props) {
  const readOnly = isScheduleJobReadOnly(job)
  const terminal = isScheduleJobTerminal(job)
  const reinstatable = isScheduleJobReinstatable(job)
  const hasAllocations = scheduleJobHasAllocations(job)

  const trigger = tooltip ? (
    <Tooltip>
      <ContextMenuTrigger asChild>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
      </ContextMenuTrigger>
      {tooltip}
    </Tooltip>
  ) : (
    <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
  )

  return (
    <ContextMenu>
      {trigger}
      <ContextMenuContent className="min-w-[11rem]">
        <ContextMenuItem onSelect={() => onAction(job, 'open-visit-workspace')}>
          Open visit workspace
        </ContextMenuItem>
        {job.scheduleRunId ? (
          <ContextMenuItem onSelect={() => onAction(job, 'open-run')}>
            Open run{job.scheduleRun?.name ? ` (${job.scheduleRun.name})` : ''}
          </ContextMenuItem>
        ) : null}
        {readOnly ? (
          <>
            <ContextMenuItem onSelect={() => onAction(job, 'allocate-employees')}>
              View job details
            </ContextMenuItem>
            <ContextMenuItem onSelect={() => onAction(job, 'add-notes')}>View notes</ContextMenuItem>
          </>
        ) : null}
        <ContextMenuItem
          disabled={!hasAllocations || readOnly}
          onSelect={() => onAction(job, 'unallocate-job')}
        >
          Unallocate Job
        </ContextMenuItem>
        <ContextMenuItem disabled={terminal} onSelect={() => onAction(job, 'complete-job')}>
          Complete Job
        </ContextMenuItem>
        <ContextMenuItem disabled={terminal} onSelect={() => onAction(job, 'cancel-job')} destructive>
          Cancel Job
        </ContextMenuItem>
        {reinstatable ? (
          <ContextMenuItem onSelect={() => onAction(job, 'reinstate-job')}>
            Reinstate visit
          </ContextMenuItem>
        ) : null}
        <ContextMenuItem disabled={readOnly} onSelect={() => onAction(job, 'add-notes')}>
          Add Notes
        </ContextMenuItem>
        <ContextMenuItem disabled={readOnly} onSelect={() => onAction(job, 'allocate-employees')}>
          Allocate Employees
        </ContextMenuItem>
        <ContextMenuItem
          disabled={!hasAllocations || readOnly}
          onSelect={() => onAction(job, 'unallocate-employees')}
        >
          Unallocate Employees
        </ContextMenuItem>
        <ContextMenuItem disabled={readOnly} onSelect={() => onAction(job, 'change-time')}>
          Change Time
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}
