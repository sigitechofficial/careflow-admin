import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { fetchCarePlanReviewQueue } from '@/features/service-users/care-plans/api'
import { CarePlanReviewBadge } from '@/features/service-users/care-plans/components/CarePlanReviewBadge'
import type { CarePlanReviewQueueItem } from '@/features/service-users/care-plans/types'
import { Button } from '@/shared/ui/button'
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
  const { data, isLoading, error } = useQuery({
    queryKey: ['care-plan-reviews', status],
    queryFn: () => fetchCarePlanReviewQueue({ status }),
  })

  const items = data?.items ?? []
  const meta = data?.meta

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Care plan reviews</h1>
          <p className="text-sm text-muted-foreground">
            Monitor published care plans by next review date. Overdue status is per care plan; a
            service user is flagged when at least one published plan is overdue.
          </p>
        </div>
        <div className="flex flex-wrap gap-1">
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
      </div>

      {meta ? (
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          <span>
            <strong className="text-foreground">{meta.total}</strong> shown
          </span>
          <span>
            <strong className="text-destructive">{meta.overdueCount}</strong> overdue
          </span>
          <span>
            <strong className="text-amber-700">{meta.dueSoonCount}</strong> due soon
          </span>
          <span>
            <strong className="text-foreground">{meta.upToDateCount}</strong> up to date
          </span>
        </div>
      ) : null}

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <p className="text-sm text-destructive">Could not load care plan reviews.</p>
      ) : items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No published care plans match this filter.
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Service user</th>
                <th className="px-3 py-2">Care plan</th>
                <th className="px-3 py-2">Next review date</th>
                <th className="px-3 py-2">Review status</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {items.map((item: CarePlanReviewQueueItem) => (
                <tr key={item.instanceId} className="border-t border-border">
                  <td className="px-3 py-2">{item.serviceUserName}</td>
                  <td className="px-3 py-2">{item.carePlanName}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {item.nextReviewDueAt ? formatDate(item.nextReviewDueAt) : '—'}
                  </td>
                  <td className="px-3 py-2">
                    <CarePlanReviewBadge review={item.review} compact />
                  </td>
                  <td className="px-3 py-2 text-right">
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
    </div>
  )
}
