import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, CalendarClock, CheckCircle2, ClipboardList } from 'lucide-react'
import { fetchCarePlanReviewQueue } from '@/features/service-users/care-plans/api'
import { CarePlanReviewBadge } from '@/features/service-users/care-plans/components/CarePlanReviewBadge'
import type { CarePlanReviewQueueItem } from '@/features/service-users/care-plans/types'
import { useGlobalLocationScope } from '@/features/locations/hooks/useGlobalLocationScope'
import { Button } from '@/shared/ui/button'
import { StatCard } from '@/shared/ui/card'
import { ContentCard } from '@/shared/ui/content-section'
import { EmptyState, LoadingSpinner, PageHeader } from '@/shared/ui/page-elements'
import { formatDate } from '@/shared/lib/utils'

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'overdue', label: 'Overdue' },
  { id: 'due_soon', label: 'Due Soon' },
  { id: 'ok', label: 'Up to date' },
] as const

type FilterId = (typeof FILTERS)[number]['id']

export default function CarePlanReviewsPage() {
  const [status, setStatus] = React.useState<FilterId>('all')
  const { locationId: globalLocationId } = useGlobalLocationScope()
  const { data, isLoading, error } = useQuery({
    queryKey: ['care-plan-reviews', status, globalLocationId ?? undefined],
    queryFn: () =>
      fetchCarePlanReviewQueue({
        status,
        locationId: globalLocationId ?? undefined,
      }),
  })

  const items = data?.items ?? []
  const meta = data?.meta
  const description = [
    'Monitor published care plans by next review date. Overdue status is per care plan; a service user is flagged when at least one published plan is overdue.',
    globalLocationId ? 'Showing service users for the selected header location.' : null,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className="flex flex-col gap-4" data-testid="care-plan-reviews-page">
      <PageHeader
        title="Care plan reviews"
        description={description}
        icon={<CalendarClock className="h-4 w-4 text-muted-foreground" aria-hidden />}
        breadcrumb={[
          { label: 'Home', href: '/' },
          { label: 'Service Users', href: '/service-users/all' },
          { label: 'Care plan reviews' },
        ]}
      >
        <div className="flex flex-wrap justify-end gap-1">
          {FILTERS.map((filter) => (
            <Button
              key={filter.id}
              type="button"
              size="sm"
              variant={status === filter.id ? 'default' : 'outline'}
              onClick={() => setStatus(filter.id)}
            >
              {filter.label}
            </Button>
          ))}
        </div>
      </PageHeader>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Shown"
          value={meta?.total ?? 0}
          hint={status === 'all' ? 'Published care plans in view' : `Filtered to ${FILTERS.find((f) => f.id === status)?.label.toLowerCase()}`}
          icon={<ClipboardList className="h-5 w-5" aria-hidden />}
          tone="primary"
          loading={isLoading && !meta}
        />
        <StatCard
          label="Overdue"
          value={meta?.overdueCount ?? 0}
          hint="Published plans past next review"
          icon={<AlertTriangle className="h-5 w-5" aria-hidden />}
          tone="destructive"
          loading={isLoading && !meta}
        />
        <StatCard
          label="Due soon"
          value={meta?.dueSoonCount ?? 0}
          hint="Review date approaching"
          icon={<CalendarClock className="h-5 w-5" aria-hidden />}
          tone="amber"
          loading={isLoading && !meta}
        />
        <StatCard
          label="Up to date"
          value={meta?.upToDateCount ?? 0}
          hint="No review action needed"
          icon={<CheckCircle2 className="h-5 w-5" aria-hidden />}
          tone="success"
          loading={isLoading && !meta}
        />
      </div>

      <ContentCard className="overflow-hidden p-0">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner size="lg" label="Loading care plan reviews…" />
          </div>
        ) : error ? (
          <p className="p-6 text-sm text-destructive">Could not load care plan reviews.</p>
        ) : items.length === 0 ? (
          <EmptyState
            icon={<CalendarClock className="h-6 w-6" aria-hidden />}
            title="No care plans to show"
            description="No published care plans match this filter."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2.5 font-medium">Service user</th>
                  <th className="px-3 py-2.5 font-medium">Care plan</th>
                  <th className="px-3 py-2.5 font-medium">Next review date</th>
                  <th className="px-3 py-2.5 font-medium">Review status</th>
                  <th className="px-3 py-2.5 font-medium">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item: CarePlanReviewQueueItem) => (
                  <tr
                    key={item.instanceId}
                    className="border-b border-border last:border-0 hover:bg-muted/30"
                  >
                    <td className="px-3 py-2.5 font-medium">
                      <Link
                        to="/service-users/$serviceUserId/care-plan/forms/$formId"
                        params={{
                          serviceUserId: item.serviceUserId,
                          formId: item.carePathwayFormId,
                        }}
                        className="hover:underline"
                      >
                        {item.serviceUserName}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5">{item.carePlanName}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">
                      {item.nextReviewDueAt ? formatDate(item.nextReviewDueAt) : '—'}
                    </td>
                    <td className="px-3 py-2.5">
                      <CarePlanReviewBadge review={item.review} compact />
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <Button variant="outline" size="sm" asChild>
                        <Link
                          to="/service-users/$serviceUserId/care-plan/forms/$formId"
                          params={{
                            serviceUserId: item.serviceUserId,
                            formId: item.carePathwayFormId,
                          }}
                        >
                          Open care plan
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
