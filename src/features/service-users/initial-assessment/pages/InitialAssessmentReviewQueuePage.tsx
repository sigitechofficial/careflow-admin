import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { fetchInitialAssessmentReviewQueue } from '@/features/service-users/initial-assessment/api'
import { initialAssessmentKeys } from '@/features/service-users/initial-assessment/keys'
import { InitialAssessmentStatusBadge } from '@/features/service-users/initial-assessment/components/InitialAssessmentStatusBadge'
import { useGlobalLocationScope } from '@/features/locations/hooks/useGlobalLocationScope'
import { Button } from '@/shared/ui/button'
import { formatInitialAssessmentDate } from '@/features/service-users/initial-assessment/utils/submission-display'

export default function InitialAssessmentReviewQueuePage() {
  const [overdueActionsOnly, setOverdueActionsOnly] = React.useState(false)
  const { locationId: globalLocationId } = useGlobalLocationScope()
  const { data, isLoading, error } = useQuery({
    queryKey: initialAssessmentKeys.reviewQueue(overdueActionsOnly, globalLocationId ?? undefined),
    queryFn: () =>
      fetchInitialAssessmentReviewQueue({
        overdueActionsOnly,
        locationId: globalLocationId ?? undefined,
      }),
  })

  const submissions = data?.submissions ?? []

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Initial assessment — manager review queue</h1>
          <p className="text-sm text-muted-foreground">
            Submitted assessments awaiting review and items with overdue follow-up actions
            {globalLocationId
              ? ' · filtered to the selected header location'
              : null}
          </p>
        </div>
        <label className="inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={overdueActionsOnly}
            onChange={(e) => setOverdueActionsOnly(e.target.checked)}
          />
          Overdue actions only
        </label>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <p className="text-sm text-destructive">Could not load review queue.</p>
      ) : submissions.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No assessments awaiting manager action.
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Service user</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Submitted</th>
                <th className="px-3 py-2">Open items</th>
                <th className="px-3 py-2">Reasons</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {submissions.map((row) => (
                <tr key={row.id} className="border-t border-border">
                  <td className="px-3 py-2">
                    <div className="font-medium">{row.serviceUserName}</div>
                    {row.serviceUserNumber ? (
                      <div className="text-xs text-muted-foreground">{row.serviceUserNumber}</div>
                    ) : null}
                  </td>
                  <td className="px-3 py-2">
                    <InitialAssessmentStatusBadge
                      status={row.status}
                      managerReviewRequired={row.managerReviewRequired}
                    />
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {row.submittedAt ? formatInitialAssessmentDate(row.submittedAt) : '—'}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {row.openActionsCount} action{row.openActionsCount === 1 ? '' : 's'}
                    {' · '}
                    {row.openRiskCount} risk{row.openRiskCount === 1 ? '' : 's'}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {row.queueReasons.join(' · ')}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Button type="button" variant="outline" size="sm" asChild>
                      <Link
                        to="/service-users/initial-assessment"
                        search={{
                          serviceUserId: row.serviceUserId,
                          tab: 'review',
                        }}
                      >
                        Open
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
