import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { fetchBodyMapReviewQueue } from '@/features/service-users/body-map/api'
import { bodyMapKeys } from '@/features/service-users/body-map/keys'
import {
  recordTypeLabel,
  type BodyMapRecordTypeCode,
} from '@/features/service-users/body-map/catalog/record-types'
import { Button } from '@/shared/ui/button'
import { BodyMapAnalyticsPanel } from '@/features/service-users/body-map/components/BodyMapAnalyticsPanel'
import { BodyMapGovernanceAlertsPanel } from '@/features/service-users/body-map/components/BodyMapGovernanceAlertsPanel'

export default function BodyMapReviewQueuePage() {
  const [overdueOnly, setOverdueOnly] = React.useState(false)
  const { data, isLoading, error } = useQuery({
    queryKey: bodyMapKeys.reviewQueue(overdueOnly),
    queryFn: () => fetchBodyMapReviewQueue({ overdueOnly }),
  })

  const records = data?.records ?? []

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Body map — manager review queue</h1>
          <p className="text-sm text-muted-foreground">
            Safeguarding triggers, manager review required, and overdue reviews
          </p>
        </div>
        <label className="inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={overdueOnly}
            onChange={e => setOverdueOnly(e.target.checked)}
          />
          Overdue reviews only
        </label>
      </div>

      <BodyMapAnalyticsPanel />

      <BodyMapGovernanceAlertsPanel />

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <p className="text-sm text-destructive">Could not load review queue.</p>
      ) : records.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No records awaiting manager action.
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Service user</th>
                <th className="px-3 py-2">Record</th>
                <th className="px-3 py-2">Risk</th>
                <th className="px-3 py-2">Reasons</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {records.map(r => (
                <tr key={r.id} className="border-t border-border">
                  <td className="px-3 py-2">{r.serviceUserName ?? '—'}</td>
                  <td className="px-3 py-2">
                    {recordTypeLabel(r.recordType as BodyMapRecordTypeCode)}
                    {r.subType ? ` — ${r.subType}` : ''}
                  </td>
                  <td className="px-3 py-2">{r.riskLevel}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {r.queueReasons.join(' · ')}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Button variant="outline" size="sm" asChild>
                      <Link
                        to="/service-users/$serviceUserId/body-map"
                        params={{ serviceUserId: r.serviceUserId }}
                      >
                        Open map
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
