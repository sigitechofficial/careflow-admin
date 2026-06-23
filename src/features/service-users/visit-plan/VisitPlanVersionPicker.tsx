import { cn } from '@/shared/lib/utils'
import type { ServiceUserVisitPlan } from '@/features/service-users/visit-plan/types'
import {
  formatVisitPlanEffectiveRange,
  formatVisitPlanStatusLabel,
  summarizeVisitPlanDailyCalls,
  visitPlanEnabledSlots,
} from '@/features/service-users/visit-plan/visit-plan-version.util'

function statusClass(status: ServiceUserVisitPlan['status']): string {
  const styles: Record<ServiceUserVisitPlan['status'], string> = {
    DRAFT: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200',
    ACTIVE: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200',
    SUSPENDED: 'bg-orange-100 text-orange-900 dark:bg-orange-950 dark:text-orange-200',
    ENDED: 'bg-muted text-muted-foreground',
  }
  return styles[status]
}

type Props = {
  plans: ServiceUserVisitPlan[]
  selectedPlanId: string
  onSelectPlan: (planId: string) => void
}

export function VisitPlanVersionPicker({ plans, selectedPlanId, onSelectPlan }: Props) {
  if (plans.length === 0) return null

  return (
    <section
      className="rounded-xl border border-border bg-card p-4 shadow-sm"
      data-testid="visit-plan-version-picker"
    >
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-foreground">Which plan version?</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Each activated plan is kept when you replace it. Pick a version to see its call pattern and the visits
          generated from that version&apos;s slots.
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {plans.map((plan) => {
          const selected = plan.id === selectedPlanId
          const enabledLabels = visitPlanEnabledSlots(plan.slots)
            .map((s) => s.label)
            .slice(0, 4)
          const moreEnabled = visitPlanEnabledSlots(plan.slots).length - enabledLabels.length

          return (
            <button
              key={plan.id}
              type="button"
              onClick={() => onSelectPlan(plan.id)}
              className={cn(
                'min-w-[200px] flex-1 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors',
                selected
                  ? 'border-sky-500 bg-sky-50/80 ring-2 ring-sky-500/30 dark:bg-sky-950/30'
                  : 'border-border bg-muted/20 hover:bg-muted/40',
              )}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase', statusClass(plan.status))}>
                  {formatVisitPlanStatusLabel(plan, plans)}
                </span>
                <span className="text-xs text-muted-foreground">{summarizeVisitPlanDailyCalls(plan)}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{formatVisitPlanEffectiveRange(plan)}</p>
              {enabledLabels.length > 0 ? (
                <p className="mt-1.5 text-xs text-foreground/80">
                  {enabledLabels.join(', ')}
                  {moreEnabled > 0 ? ` +${moreEnabled} more` : ''}
                </p>
              ) : (
                <p className="mt-1.5 text-xs text-muted-foreground">No active call slots</p>
              )}
            </button>
          )
        })}
      </div>
    </section>
  )
}
