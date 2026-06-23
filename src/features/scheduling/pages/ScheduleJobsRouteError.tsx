import { Link, useRouter } from '@tanstack/react-router'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/shared/ui/button'

export function ScheduleJobsRouteError({ error }: { error: Error }) {
  const router = useRouter()

  return (
    <div className="flex h-full min-h-[50vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <AlertTriangle className="h-10 w-10 text-destructive" aria-hidden />
      <div className="max-w-md space-y-2">
        <h1 className="text-lg font-semibold text-foreground">Could not load Schedule Jobs</h1>
        <p className="text-sm text-muted-foreground">
          {error.message || 'An unexpected error occurred while loading this page.'}
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button type="button" variant="outline" onClick={() => router.invalidate()}>
          Reload page
        </Button>
        <Button type="button" variant="ghost" asChild>
          <Link to="/scheduling/view">Back to scheduling</Link>
        </Button>
      </div>
    </div>
  )
}
