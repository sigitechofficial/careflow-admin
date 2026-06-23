import { Skeleton } from '@/shared/ui/misc'

type Props = {
  rowCount?: number
}

export function ScheduleJobsBoardSkeleton({ rowCount = 6 }: Props) {
  return (
    <div
      className="flex h-full min-h-[320px] flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm"
      aria-busy="true"
      aria-label="Loading schedule board"
    >
      <div className="flex shrink-0 border-b border-border bg-muted/20 px-3 py-2">
        <Skeleton className="h-8 w-32" />
        <div className="ml-auto flex gap-2">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-8 w-12" />
          ))}
        </div>
      </div>
      <div className="min-h-0 flex-1 space-y-2 p-3">
        {Array.from({ length: rowCount }).map((_, index) => (
          <div key={index} className="flex items-center gap-3">
            <Skeleton className="h-10 w-36 shrink-0" />
            <Skeleton className="h-10 min-w-0 flex-1" />
          </div>
        ))}
      </div>
    </div>
  )
}
