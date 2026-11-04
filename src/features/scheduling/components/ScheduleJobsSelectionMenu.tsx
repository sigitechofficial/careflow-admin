import type { TimelineJob } from '@/features/scheduling/types/scheduling.types'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'

export type ScheduleJobsSelection = { jobs: TimelineJob[]; x: number; y: number }

type Props = {
  selection: ScheduleJobsSelection | null
  onClose: () => void
  onCreateRun: (jobs: TimelineJob[]) => void
  onAllocate: (jobs: TimelineJob[]) => void
}

/** Shown where a drag-select ends: what to do with the selected visits. */
export function ScheduleJobsSelectionMenu({ selection, onClose, onCreateRun, onAllocate }: Props) {
  const jobs = selection?.jobs ?? []
  const inRun = jobs.filter((job) => job.scheduleRunId).length

  return (
    <DropdownMenu open={selection !== null} onOpenChange={(open) => !open && onClose()} modal={false}>
      <DropdownMenuTrigger asChild>
        <span
          aria-hidden
          className="pointer-events-none fixed h-px w-px"
          style={{ left: selection?.x ?? 0, top: selection?.y ?? 0 }}
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" sideOffset={4} className="min-w-[13rem]">
        <DropdownMenuLabel>{jobs.length} visits selected</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={inRun > 0}
          onSelect={() => onCreateRun(jobs)}
          title={inRun > 0 ? `${inRun} of these visits are already in a run` : undefined}
        >
          <span className="flex flex-col">
            Create run
            {inRun > 0 ? (
              <span className="text-xs text-muted-foreground">{inRun} already in a run</span>
            ) : null}
          </span>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onAllocate(jobs)}>Allocate employee</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
