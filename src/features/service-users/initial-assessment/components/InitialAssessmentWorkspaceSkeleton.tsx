import { Skeleton } from '@/shared/ui/misc'

export function InitialAssessmentWorkspaceSkeleton() {
  return (
    <div
      className="space-y-4 rounded-xl border border-border bg-card p-4 shadow-sm"
      data-testid="ia-assessment-loading"
      aria-busy="true"
      aria-label="Loading assessment workspace"
    >
      <div className="flex flex-wrap items-center gap-3">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-6 w-40" />
        <div className="ml-auto flex gap-2">
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-28" />
        </div>
      </div>

      <div className="flex flex-wrap gap-1 rounded-lg bg-muted/50 p-1">
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={index} className="h-9 w-28 rounded-md" />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-3 rounded-lg border border-border p-4">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-full max-w-xl" />
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="space-y-2 pt-2">
              <Skeleton className="h-4 w-56" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
        <div className="hidden space-y-3 lg:block">
          <Skeleton className="h-32 w-full rounded-lg" />
          <Skeleton className="h-24 w-full rounded-lg" />
        </div>
      </div>
    </div>
  )
}
