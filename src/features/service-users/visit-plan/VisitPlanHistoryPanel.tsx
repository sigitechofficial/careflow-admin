import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { History, Loader2 } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { formatDate } from '@/shared/lib/utils'
import { useServiceUserVisitPlans } from '@/features/service-users/visit-plan/hooks'
import type { ServiceUserVisitPlan, VisitPlanStatus } from '@/features/service-users/visit-plan/types'

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
}

export function VisitPlanHistoryPanel({ serviceUserId, selectedPlanId }: Props) {
  const { data: plans, isLoading, error } = useServiceUserVisitPlans(serviceUserId)

  const sortedPlans = React.useMemo(() => {
    return [...(plans ?? [])].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )
  }, [plans])

  const timeline = React.useMemo(() => {
    const rows: Array<{
      id: string
      planId: string
      planStatus: VisitPlanStatus
      label: string
      at: string
      kind: 'created' | 'updated' | 'amendment' | 'activated'
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
      <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
          <History className="h-4 w-4" aria-hidden />
          Visit plan versions ({sortedPlans.length})
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="px-2 py-2 font-medium">Status</th>
                <th className="px-2 py-2 font-medium">Effective from</th>
                <th className="px-2 py-2 font-medium">Last updated</th>
                <th className="px-2 py-2 font-medium">Slots</th>
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
                  )}
                >
                  <td className="px-2 py-2">
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', statusClass(plan.status))}>
                      {plan.status}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-muted-foreground">{formatDate(plan.effectiveFrom)}</td>
                  <td className="px-2 py-2 text-muted-foreground">{formatDate(plan.updatedAt)}</td>
                  <td className="px-2 py-2">{plan.slots?.length ?? 0}</td>
                  <td className="px-2 py-2">{plan.amendments?.length ?? 0}</td>
                  <td className="px-2 py-2 text-right">
                    <Link
                      to="/service-users/$serviceUserId/visit-plan"
                      params={{ serviceUserId }}
                      search={{ planId: plan.id, view: 'details' }}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      Open
                    </Link>
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
                <div className="w-28 shrink-0 text-xs text-muted-foreground">
                  {formatDate(row.at)}
                </div>
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
