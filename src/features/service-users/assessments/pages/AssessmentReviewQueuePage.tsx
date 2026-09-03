import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { fetchAssessmentReviewQueue } from '@/features/service-users/assessments/api'
import { AssessmentReviewBadge } from '@/features/service-users/assessments/components/AssessmentReviewBadge'
import { serviceUserAssessmentKeys } from '@/features/service-users/assessments/keys'
import { useGlobalLocationScope } from '@/features/locations/hooks/useGlobalLocationScope'
import { Button } from '@/shared/ui/button'
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

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Assessment review queue</h1>
          <p className="text-sm text-muted-foreground">
            CQC/NICE schedule reminders — overdue and due soon. Staff can still complete assessments
            at any time from the care plan.
            {globalLocationId
              ? ' Showing service users for the selected header location.'
              : null}
          </p>
        </div>
        <label className="inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={overdueOnly}
            onChange={(e) => setOverdueOnly(e.target.checked)}
          />
          Overdue only
        </label>
      </div>

      {meta && (
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          <span>
            <strong className="text-foreground">{meta.total}</strong> in queue
          </span>
          <span>
            <strong className="text-destructive">{meta.overdueCount}</strong> overdue
          </span>
          <span>
            <strong className="text-amber-700">{meta.dueSoonCount}</strong> due soon
          </span>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <p className="text-sm text-destructive">Could not load assessment review queue.</p>
      ) : items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No assessments due for scheduled review.
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Service user</th>
                <th className="px-3 py-2">Assessment</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Next review</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={`${item.serviceUserId}-${item.assessmentKey}`} className="border-t border-border">
                  <td className="px-3 py-2">{item.serviceUserName ?? '—'}</td>
                  <td className="px-3 py-2">{item.assessmentTitle}</td>
                  <td className="px-3 py-2">
                    <AssessmentReviewBadge review={item.review} compact />
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {item.review.nextReviewDueAt ? formatDate(item.review.nextReviewDueAt) : '—'}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Button variant="outline" size="sm" asChild>
                      <Link
                        to="/service-users/$serviceUserId/care-plan"
                        params={{ serviceUserId: item.serviceUserId }}
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
