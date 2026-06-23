import { getApiBaseUrl } from '@/shared/lib/api-base'
import { ErrorBoundary } from '@/shared/ui/error-boundary'
import { ScheduleJobsPageContent } from '@/features/scheduling/components/schedule-jobs/ScheduleJobsPageContent'

export default function ScheduleJobsPage() {
  const hasApi = !!getApiBaseUrl()

  if (!hasApi) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Configure VITE_API_BASE_URL to load the schedule.
      </div>
    )
  }

  return (
    <ErrorBoundary
      title="Schedule Jobs failed to load"
      description="Try again. If the problem persists, refresh the page or contact support."
      onReset={() => window.location.reload()}
    >
      <ScheduleJobsPageContent />
    </ErrorBoundary>
  )
}
