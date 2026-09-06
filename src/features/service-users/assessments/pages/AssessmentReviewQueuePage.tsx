import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, CalendarClock, ClipboardList } from 'lucide-react'
import { fetchAssessmentReviewQueue } from '@/features/service-users/assessments/api'
import { AssessmentReviewBadge } from '@/features/service-users/assessments/components/AssessmentReviewBadge'
import { serviceUserAssessmentKeys } from '@/features/service-users/assessments/keys'
import { useGlobalLocationScope } from '@/features/locations/hooks/useGlobalLocationScope'
import { Button } from '@/shared/ui/button'
import { StatCard } from '@/shared/ui/card'
import { ContentCard } from '@/shared/ui/content-section'
import { EmptyState, LoadingSpinner, PageHeader } from '@/shared/ui/page-elements'
import { Switch } from '@/shared/ui/toggle-controls'
import { formatDate } from '@/shared/lib/utils'

export default function AssessmentReviewQueuePage() {
  const [overdueOnly, setOverdueOnly] = React.useState(false)
  const { locationId: globalLocationId } = useGlobalLocationScope()
  const { data, isLoading, error } = useQuery({
    queryKey: serviceUserAssessmentKeys.reviewQueue(
      overdueOnly,
      undefined,
      globalLocationId ?? undefined,
    ),
    queryFn: () =>
      fetchAssessmentReviewQueue({
        overdueOnly,
        locationId: globalLocationId ?? undefined,
      }),
  })

  const items = data?.data ?? []
  const meta = data?.meta
  const description = [
    'CQC/NICE schedule reminders — overdue and due soon. Staff can still complete assessments at any time from the care plan.',
    globalLocationId ? 'Showing service users for the selected header location.' : null,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className="flex flex-col gap-4" data-testid="assessment-review-queue-page">
      <PageHeader
        title="Assessment review queue"
        description={description}
        icon={<ClipboardList className="h-4 w-4 text-muted-foreground" aria-hidden />}
        breadcrumb={[
          { label: 'Home', href: '/' },
          { label: 'Service Users', href: '/service-users/all' },
          { label: 'Assessment review queue' },
        ]}
      >
        <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <Switch
            checked={overdueOnly}
            onCheckedChange={setOverdueOnly}
            size="sm"
            aria-label="Show overdue assessments only"
          />
          Overdue only
        </label>
      </PageHeader>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="In queue"
          value={meta?.total ?? 0}
          hint={overdueOnly ? 'Overdue assessments only' : 'Overdue and due soon'}
          icon={<ClipboardList className="h-5 w-5" aria-hidden />}
          tone="primary"
          loading={isLoading && !meta}
        />
        <StatCard
          label="Overdue"
          value={meta?.overdueCount ?? 0}
          hint="Scheduled review is past due"
          icon={<AlertTriangle className="h-5 w-5" aria-hidden />}
          tone="destructive"
          loading={isLoading && !meta}
        />
        <StatCard
          label="Due soon"
          value={meta?.dueSoonCount ?? 0}
          hint="Coming up on the review schedule"
          icon={<CalendarClock className="h-5 w-5" aria-hidden />}
          tone="amber"
          loading={isLoading && !meta}
        />
      </div>

      <ContentCard className="overflow-hidden p-0">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner size="lg" label="Loading assessment review queue…" />
          </div>
        ) : error ? (
          <p className="p-6 text-sm text-destructive">Could not load assessment review queue.</p>
        ) : items.length === 0 ? (
          <EmptyState
            icon={<ClipboardList className="h-6 w-6" aria-hidden />}
            title="No assessments due"
            description={
              overdueOnly
                ? 'No overdue scheduled reviews match the current filters.'
                : 'No assessments are overdue or due soon for scheduled review.'
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2.5 font-medium">Service user</th>
                  <th className="px-3 py-2.5 font-medium">Assessment</th>
                  <th className="px-3 py-2.5 font-medium">Status</th>
                  <th className="px-3 py-2.5 font-medium">Next review</th>
                  <th className="px-3 py-2.5 font-medium">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr
                    key={`${item.serviceUserId}-${item.assessmentKey}`}
                    className="border-b border-border last:border-0 hover:bg-muted/30"
                  >
                    <td className="px-3 py-2.5 font-medium">
                      <Link
                        to="/service-users/$serviceUserId/care-plan"
                        params={{ serviceUserId: item.serviceUserId }}
                        className="hover:underline"
                      >
                        {item.serviceUserName ?? '—'}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5">{item.assessmentTitle}</td>
                    <td className="px-3 py-2.5">
                      <AssessmentReviewBadge review={item.review} compact />
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">
                      {item.review.nextReviewDueAt ? formatDate(item.review.nextReviewDueAt) : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <Button variant="outline" size="sm" asChild>
                        <Link
                          to="/service-users/$serviceUserId/care-plan"
                          params={{ serviceUserId: item.serviceUserId }}
                        >
                          Review assessment
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ContentCard>
    </div>
  )
}
