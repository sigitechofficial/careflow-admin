import { Link } from '@tanstack/react-router'
import { ExternalLink } from 'lucide-react'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import type { BulkVisitPlanScheduleCandidate } from '@/features/scheduling/api/bulk-visit-plan-schedule.api'

type Props = {
  rows: BulkVisitPlanScheduleCandidate[]
  selectedPlanIds: ReadonlySet<string>
  allReadySelected: boolean
  readyVisibleCount: number
  onTogglePlan: (planId: string, ready: boolean) => void
  onToggleAllReady: () => void
}

export function BulkGenerateRotaCandidatesTable({
  rows,
  selectedPlanIds,
  allReadySelected,
  readyVisibleCount,
  onTogglePlan,
  onToggleAllReady,
}: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="w-10 px-3 py-2">
              <input
                type="checkbox"
                checked={allReadySelected}
                onChange={onToggleAllReady}
                aria-label="Select all ready plans"
                disabled={readyVisibleCount === 0}
              />
            </th>
            <th className="px-3 py-2">Service user</th>
            <th className="px-3 py-2">Location</th>
            <th className="px-3 py-2">Slots</th>
            <th className="px-3 py-2">Readiness</th>
            <th className="px-3 py-2" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.planId} className="border-t border-border/70">
              <td className="px-3 py-2">
                <input
                  type="checkbox"
                  checked={selectedPlanIds.has(row.planId)}
                  disabled={!row.ready}
                  onChange={() => onTogglePlan(row.planId, row.ready)}
                  aria-label={`Select ${row.serviceUserLabel}`}
                />
              </td>
              <td className="px-3 py-2 font-medium">{row.serviceUserLabel}</td>
              <td className="px-3 py-2 text-muted-foreground">{row.locationName ?? '—'}</td>
              <td className="px-3 py-2">{row.enabledSlotCount}</td>
              <td className="px-3 py-2">
                {row.ready ? (
                  <Badge
                    variant="outline"
                    className="border-emerald-200 bg-emerald-50 text-emerald-800"
                  >
                    Ready
                  </Badge>
                ) : (
                  <div className="space-y-1">
                    <Badge
                      variant="outline"
                      className="border-amber-200 bg-amber-50 text-amber-900"
                    >
                      Needs setup
                    </Badge>
                    <ul className="text-xs text-muted-foreground">
                      {row.readinessIssues.slice(0, 2).map((issue) => (
                        <li key={issue}>{issue}</li>
                      ))}
                      {row.readinessIssues.length > 2 ? (
                        <li>+{row.readinessIssues.length - 2} more</li>
                      ) : null}
                    </ul>
                  </div>
                )}
              </td>
              <td className="px-3 py-2 text-right">
                <Button variant="ghost" size="sm" asChild>
                  <Link
                    to="/service-users/$serviceUserId/visit-plan"
                    params={{ serviceUserId: row.serviceUserId }}
                    target="_blank"
                  >
                    Visit plan
                    <ExternalLink className="ml-1 h-3.5 w-3.5" />
                  </Link>
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
