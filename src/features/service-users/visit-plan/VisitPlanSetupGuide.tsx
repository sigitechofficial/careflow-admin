import type { LucideIcon } from 'lucide-react'
import {
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  Circle,
  Clock3,
  History,
  ListChecks,
  Play,
  ToggleRight,
  UserPlus,
} from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { contentHelperClass, contentTitleClass } from '@/shared/ui/content-section'
import type { ServiceUserVisitPlan, VisitPlanSlot } from '@/features/service-users/visit-plan/types'
import { slotAssignedEmployeeIds } from '@/features/service-users/visit-plan/visit-plan-employee-names.util'
import { SHOW_GENERATE_ROTA_SECTION } from '@/features/service-users/visit-plan/visit-plan-generate-rota.util'

type Step = {
  id: string
  title: string
  detail: string
  done: boolean
  icon: LucideIcon
}

type Props = {
  slots: VisitPlanSlot[]
  planStatus: ServiceUserVisitPlan['status'] | null
  hasPlan: boolean
}

function buildSteps(slots: VisitPlanSlot[], planStatus: ServiceUserVisitPlan['status'] | null, hasPlan: boolean): Step[] {
  const enabled = slots.filter((s) => s.isEnabled)
  const hasEnabled = enabled.length > 0
  const timesOk = hasEnabled && enabled.every((s) => s.plannedStartTime && s.plannedEndTime && s.daysOfWeek.length > 0)
  const carersOk =
    hasEnabled &&
    enabled.every((s) => {
      if (s.requiredCarers <= 0) return true
      return slotAssignedEmployeeIds(s).length >= s.requiredCarers
    })
  const isActive = planStatus === 'ACTIVE'

  const steps: Step[] = [
    {
      id: 'enable',
      title: 'Choose which visits happen',
      detail: 'Turn On for Morning, Evening, etc. Tick the days each visit runs.',
      done: hasEnabled,
      icon: ToggleRight,
    },
    {
      id: 'times',
      title: 'Set start & end times',
      detail: 'Use the time fields on each row (e.g. Morning 07:30–09:00).',
      done: timesOk,
      icon: Clock3,
    },
    {
      id: 'carers',
      title: 'Assign carers per visit',
      detail: 'Click Assign on each row — carers can differ for Morning vs Evening.',
      done: carersOk,
      icon: UserPlus,
    },
    {
      id: 'save',
      title: 'Save the plan',
      detail: 'Scroll down — Save draft to keep work on file, or Activate authorised package to go live.',
      done: hasPlan && (planStatus === 'ACTIVE' || planStatus === 'DRAFT' || planStatus === 'SUSPENDED'),
      icon: Play,
    },
  ]

  if (SHOW_GENERATE_ROTA_SECTION) {
    steps.push({
      id: 'rota',
      title: 'Generate rota',
      detail: 'When plan is Active, pick From/To and click Generate visits → open Scheduling.',
      done: isActive,
      icon: CalendarClock,
    })
  }

  steps.push({
    id: 'backfill',
    title: 'Backfill past visits (optional)',
    detail:
      'Set Max backfill days on calls, save (Record amendment), then enter how many days before rota start.',
    done: isActive,
    icon: History,
  })

  return steps
}

export function VisitPlanSetupGuide({ slots, planStatus, hasPlan }: Props) {
  const steps = buildSteps(slots, planStatus, hasPlan)
  const doneCount = steps.filter((s) => s.done).length

  return (
    <details
      className="group rounded-xl border border-teal-200 bg-teal-50/50 dark:border-teal-900 dark:bg-teal-950/20 sm:p-5 [&_summary::-webkit-details-marker]:hidden"
      data-testid="visit-plan-setup-guide"
    >
      <summary className="flex cursor-pointer list-none items-start justify-between gap-3 p-4 sm:p-0 sm:pb-0">
        <div className="flex min-w-0 gap-3">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-600/15 text-teal-800 dark:text-teal-200">
            <ListChecks className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <h3 className={contentTitleClass}>How to set up visits</h3>
            <p className={cn('mt-0.5', contentHelperClass)}>
              {doneCount} of {steps.length} steps complete — expand for the checklist
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {planStatus ? (
            <span className="rounded-full bg-background px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              Plan: {planStatus}
            </span>
          ) : null}
          <ChevronDown
            className="h-4 w-4 text-teal-800/70 transition-transform group-open:rotate-180 dark:text-teal-200/70"
            aria-hidden
          />
        </div>
      </summary>
      <ol className="grid gap-3 px-4 pb-4 pt-4 sm:grid-cols-2 sm:px-0 lg:grid-cols-3 xl:grid-cols-5">
        {steps.map((step, index) => {
          const StepIcon = step.icon
          return (
            <li
              key={step.id}
              className={cn(
                'rounded-lg border px-3 py-2.5',
                step.done
                  ? 'border-emerald-300/80 bg-background/80 dark:border-emerald-800'
                  : 'border-border/80 bg-background/60',
              )}
            >
              <div className="flex items-start gap-2">
                <span
                  className={cn(
                    'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg',
                    step.done
                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                      : 'bg-muted text-muted-foreground',
                  )}
                >
                  {step.done ? (
                    <CheckCircle2 className="h-4 w-4" aria-hidden />
                  ) : (
                    <StepIcon className="h-3.5 w-3.5" aria-hidden />
                  )}
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground">
                    {index + 1}. {step.title}
                  </p>
                  <p className={cn('mt-0.5 leading-snug', contentHelperClass)}>{step.detail}</p>
                </div>
              </div>
            </li>
          )
        })}
      </ol>
    </details>
  )
}
