import { Link } from '@tanstack/react-router'
import { CheckCircle2, Circle, FileText, Loader2 } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { resolveCarePlansForSlot } from '@/features/service-users/visit-plan/visit-plan-care-plan-links.util'
import type { VisitPlanCareContextStep } from '@/features/service-users/visit-plan/visit-plan-care-plan-links.util'
import type { AcceptedCarePlanItem } from '@/features/service-users/initial-assessment/api'
import type { VisitPlanSlot } from '@/features/service-users/visit-plan/types'
import { VISIT_PLAN_SLOT_LABELS } from '@/features/service-users/visit-plan/types'

function StepIcon({ status }: { status: VisitPlanCareContextStep['status'] }) {
  if (status === 'complete') {
    return <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-hidden />
  }
  return (
    <Circle
      className={cn(
        'h-5 w-5',
        status === 'current' ? 'text-sky-600' : status === 'blocked' ? 'text-amber-600' : 'text-muted-foreground',
      )}
      aria-hidden
    />
  )
}

type Props = {
  serviceUserId: string
  isLoading?: boolean
  pathwaySteps: VisitPlanCareContextStep[]
  acceptedCarePlans: AcceptedCarePlanItem[]
  slots: VisitPlanSlot[]
}

export function VisitPlanCarePathwayContextPanel({
  serviceUserId,
  isLoading,
  pathwaySteps,
  acceptedCarePlans,
  slots,
}: Props) {
  const enabledSlots = slots.filter((s) => s.isEnabled)

  return (
    <section className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Care pathway → visit plan</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          After initial assessment, manager review, and accepted care plans, configure visits to deliver the
          right clinical care on each call.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading care pathway context…
        </div>
      ) : (
        <>
          <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {pathwaySteps.map((step, index) => (
              <li
                key={step.id}
                className={cn(
                  'flex items-start gap-2 rounded-lg border px-3 py-2 text-sm',
                  step.status === 'complete' && 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/20',
                  step.status === 'current' && 'border-sky-200 bg-sky-50/50 dark:border-sky-900 dark:bg-sky-950/20',
                  step.status === 'blocked' && 'border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20',
                  step.status === 'pending' && 'border-border bg-muted/20',
                )}
              >
                <StepIcon status={step.status} />
                <div className="min-w-0">
                  <p className="font-medium leading-tight">
                    {index + 1}. {step.label}
                  </p>
                  {step.detail ? (
                    <p className="mt-0.5 text-xs text-muted-foreground">{step.detail}</p>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>

          <div className="flex flex-wrap gap-2 text-xs">
            <Link
              to="/service-users/$serviceUserId"
              params={{ serviceUserId }}
              search={{ tab: 'assessment' }}
              className="text-sky-700 underline-offset-2 hover:underline dark:text-sky-300"
            >
              Initial assessment
            </Link>
            <span className="text-muted-foreground">·</span>
            <Link
              to="/service-users/$serviceUserId/care-plan"
              params={{ serviceUserId }}
              className="text-sky-700 underline-offset-2 hover:underline dark:text-sky-300"
            >
              Care plans ({acceptedCarePlans.length})
            </Link>
          </div>

          {acceptedCarePlans.length === 0 ? (
            <p className="rounded-lg border border-dashed border-amber-300 bg-amber-50/50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-100">
              No accepted care plans yet. Complete manager review and accept care plan recommendations on
              initial assessment before linking visits.
            </p>
          ) : enabledSlots.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Enable at least one call slot below to see which care plans each visit will deliver.
            </p>
          ) : (
            <div>
              <div className="mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4 text-teal-700 dark:text-teal-300" />
                <h4 className="text-sm font-semibold">Which visit delivers which care plan?</h4>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th className="py-2 pr-4">Visit / call</th>
                      <th className="py-2">Linked care plans</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enabledSlots.map((slot) => {
                      const linked = resolveCarePlansForSlot(slot, acceptedCarePlans)
                      const isExplicit = (slot.linkedCarePlanFormIds ?? []).length > 0
                      return (
                        <tr key={slot.slotCode} className="border-b border-border/60 align-top">
                          <td className="py-3 pr-4 font-medium whitespace-nowrap">
                            {VISIT_PLAN_SLOT_LABELS[slot.slotCode]}
                            <p className="text-xs font-normal text-muted-foreground">
                              {slot.plannedStartTime}–{slot.plannedEndTime}
                            </p>
                          </td>
                          <td className="py-3">
                            {linked.length === 0 ? (
                              <span className="text-xs text-muted-foreground">No care plan linked</span>
                            ) : (
                              <ul className="flex flex-wrap gap-1.5">
                                {linked.map((cp) => (
                                  <li key={cp.formId}>
                                    <Link
                                      to="/service-users/$serviceUserId/care-plan"
                                      params={{ serviceUserId }}
                                      className="inline-flex rounded-full border border-teal-200 bg-teal-50 px-2.5 py-0.5 text-xs font-medium text-teal-900 hover:bg-teal-100 dark:border-teal-800 dark:bg-teal-950/40 dark:text-teal-100"
                                      title={cp.carePlanArea}
                                    >
                                      {cp.formName}
                                    </Link>
                                  </li>
                                ))}
                              </ul>
                            )}
                            {!isExplicit && linked.length > 0 ? (
                              <p className="mt-1 text-[11px] text-muted-foreground">
                                Suggested from assessment — assign explicitly in scheduling options below.
                              </p>
                            ) : null}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  )
}
