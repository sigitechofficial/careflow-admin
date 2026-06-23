import * as React from 'react'
import { History, Loader2 } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { formatDate } from '@/shared/lib/utils'
import { useServiceUserVisitPlans } from '@/features/service-users/visit-plan/hooks'
import type { ServiceUserVisitPlan, VisitPlanStatus } from '@/features/service-users/visit-plan/types'
import {
  formatVisitPlanEffectiveRange,
  formatVisitPlanStatusLabel,
  sortVisitPlanVersions,
  summarizeVisitPlanDailyCalls,
  visitPlanEnabledSlots,
  visitPlanEndedCount,
} from '@/features/service-users/visit-plan/visit-plan-version.util'

function statusClass(status: VisitPlanStatus): string {
  const styles: Record<VisitPlanStatus, string> = {
    DRAFT: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200',
    ACTIVE: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200',
    SUSPENDED: 'bg-orange-100 text-orange-900 dark:bg-orange-950 dark:text-orange-200',
    ENDED: 'bg-muted text-muted-foreground',
  }
  return styles[status]
}

type Props = {
  serviceUserId: string
  selectedPlanId?: string | null
  onSelectPlan?: (planId: string) => void
}

export function VisitPlanHistoryPanel({ serviceUserId, selectedPlanId, onSelectPlan }: Props) {
  const { data: plans, isLoading, error } = useServiceUserVisitPlans(serviceUserId)

  const sortedPlans = React.useMemo(() => sortVisitPlanVersions(plans ?? []), [plans])
  const endedCount = visitPlanEndedCount(sortedPlans)

  const timeline = React.useMemo(() => {
    const rows: Array<{
      id: string
      planId: string
      planStatus: VisitPlanStatus
      label: string
      at: string
      kind: 'created' | 'updated' | 'amendment' | 'activated' | 'status'
    }> = []

    for (const plan of sortedPlans) {
      rows.push({
        id: `${plan.id}-created`,
        planId: plan.id,
        planStatus: plan.status,
        label: 'Plan created',
        at: plan.createdAt,
        kind: 'created',
      })
      if (plan.approvedAt) {
        rows.push({
          id: `${plan.id}-approved`,
          planId: plan.id,
          planStatus: plan.status,
          label: 'Plan activated',
          at: plan.approvedAt,
          kind: 'activated',
        })
      }
      for (const amendment of plan.amendments ?? []) {
        rows.push({
          id: amendment.id,
          planId: plan.id,
          planStatus: plan.status,
          label: amendment.reason,
          at: amendment.amendedAt,
          kind: 'amendment',
        })
      }
      for (const event of plan.statusEvents ?? []) {
        const prefix =
          event.eventType === 'SUSPENDED'
            ? 'Suspended'
            : event.eventType === 'REACTIVATED'
              ? 'Re-activated'
              : event.eventType === 'SCHEDULED_END'
                ? 'Scheduled end'
                : 'Ended'
        const catalog = event.pauseReasonCatalog?.name
        rows.push({
          id: event.id,
          planId: plan.id,
          planStatus: plan.status,
          label: catalog ? `${prefix} (${catalog}): ${event.reason}` : `${prefix}: ${event.reason}`,
          at: event.createdAt,
          kind: 'status',
        })
      }
      rows.push({
        id: `${plan.id}-updated`,
        planId: plan.id,
        planStatus: plan.status,
        label: 'Last saved',
        at: plan.updatedAt,
        kind: 'updated',
      })
    }

    return rows.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
  }, [sortedPlans])

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading visit plan history…
      </div>
    )
  }

  if (error) {
    return (
      <p className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        {error instanceof Error ? error.message : 'Could not load visit plan history'}
      </p>
    )
  }

  if (sortedPlans.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/20 p-8 text-center">
        <History className="mx-auto h-8 w-8 text-muted-foreground/60" aria-hidden />
        <p className="mt-3 text-sm text-muted-foreground">No visit plans recorded yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6" data-testid="visit-plan-history-panel">
      <p className="text-sm text-muted-foreground">
        Each time you activate a new plan, the previous active plan is kept as{' '}
        <strong className="font-medium text-foreground">ENDED</strong>. Amendments on the same plan are listed in the
        audit timeline (reason only — not a full before/after diff).
        {endedCount >= 2 ? (
          <>
            {' '}
            You have {endedCount} ended plans — each is a separate past package. Compare them using{' '}
            <strong className="font-medium text-foreground">Effective period</strong> and{' '}
            <strong className="font-medium text-foreground">Calls (typical)</strong>; the most recently ended plan is
            labelled &quot;ENDED (most recent)&quot;.
          </>
        ) : null}
      </p>

      <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
          <History className="h-4 w-4" aria-hidden />
          All plan versions ({sortedPlans.length})
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="px-2 py-2 font-medium">Status</th>
                <th className="px-2 py-2 font-medium">Calls (typical)</th>
                <th className="px-2 py-2 font-medium">Effective period</th>
                <th className="px-2 py-2 font-medium">Active slots</th>
                <th className="px-2 py-2 font-medium">Amendments</th>
                <th className="px-2 py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {sortedPlans.map((plan: ServiceUserVisitPlan) => (
                <tr
                  key={plan.id}
                  className={cn(
                    'border-b border-border/60',
                    selectedPlanId === plan.id && 'bg-sky-50/60 dark:bg-sky-950/20',
                    onSelectPlan && 'cursor-pointer hover:bg-muted/30',
                  )}
                  onClick={() => onSelectPlan?.(plan.id)}
                >
                  <td className="px-2 py-2">
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', statusClass(plan.status))}>
                      {formatVisitPlanStatusLabel(plan, sortedPlans)}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-muted-foreground">{summarizeVisitPlanDailyCalls(plan)}</td>
                  <td className="px-2 py-2 text-muted-foreground">{formatVisitPlanEffectiveRange(plan)}</td>
                  <td className="px-2 py-2">{visitPlanEnabledSlots(plan.slots).length}</td>
                  <td className="px-2 py-2">{plan.amendments?.length ?? 0}</td>
                  <td className="px-2 py-2 text-right">
                    {onSelectPlan ? (
                      <button
                        type="button"
                        className="text-xs font-medium text-primary hover:underline"
                        onClick={(e) => {
                          e.stopPropagation()
                          onSelectPlan(plan.id)
                        }}
                      >
                        View call pattern
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {timeline.length > 0 ? (
        <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-foreground">Audit timeline</h3>
          <ul className="space-y-3">
            {timeline.slice(0, 30).map((row) => (
              <li key={row.id} className="flex gap-3 text-sm">
                <div className="w-28 shrink-0 text-xs text-muted-foreground">{formatDate(row.at)}</div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground">{row.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {row.kind === 'amendment' ? 'Amendment' : row.label} · plan {row.planStatus.toLowerCase()}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
