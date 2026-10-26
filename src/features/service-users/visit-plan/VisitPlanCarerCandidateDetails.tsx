import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { AlertTriangle, CheckCircle2, Clock, Info, ShieldAlert, Star, UserX } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import {
  contentBadgeClass,
  contentHelperClass,
  contentKickerClass,
  contentTagClass,
  contentTitleClass,
} from '@/shared/ui/content-section'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/ui/tooltip'
import type { VisitPlanCarerCandidate, VisitPlanCarerFit } from '@/features/service-users/visit-plan/types'
import { VISIT_PLAN_DAY_LABELS } from '@/features/service-users/visit-plan/types'
import { buildCarerAvailabilityBreakdown } from '@/features/service-users/visit-plan/visit-plan-carer-availability-display.util'
import { VisitPlanCarerAvailabilityBreakdown } from '@/features/service-users/visit-plan/VisitPlanCarerAvailabilityBreakdown'
import { formatVisitPlanCarerRoleLine } from '@/features/scheduling/utils/schedule-carer-suggest.util'
import { summarizeCarerWeeklyHours } from '@/features/service-users/visit-plan/visit-plan-carer-weekly-hours.util'

/** "This week: Xh assigned · limit Yh · Zh left" — amber at the limit, red when over. */
export function VisitPlanCarerWeeklyHoursLine({
  candidate,
  includesThisVisit,
  className,
}: {
  candidate: VisitPlanCarerCandidate
  includesThisVisit: boolean
  className?: string
}) {
  const summary = summarizeCarerWeeklyHours(candidate, includesThisVisit)
  if (!summary) return null
  const { text, tone } = summary
  return (
    <p
      className={cn(
        contentHelperClass,
        tone === 'atLimit' && 'font-medium text-amber-700 dark:text-amber-300',
        tone === 'over' && 'font-medium text-red-700 dark:text-red-300',
        className,
      )}
      data-testid="carer-weekly-hours-line"
    >
      {text}
    </p>
  )
}

function fitStyles(fit: VisitPlanCarerFit) {
  if (fit === 'good') {
    return 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100'
  }
  if (fit === 'partial') {
    return 'border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100'
  }
  return 'border-red-300 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100'
}

export function fitLabel(fit: VisitPlanCarerFit) {
  if (fit === 'good') return 'Good match'
  if (fit === 'partial') return 'Partial match'
  return 'Poor match'
}

export function dayChipTone(
  day: number,
  availability: VisitPlanCarerCandidate['availability'],
): string {
  const { availableDays, unavailableDays, timeMismatchDays = [] } = availability
  if (timeMismatchDays.includes(day)) {
    return 'border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-100'
  }
  if (unavailableDays.includes(day)) {
    return 'border-red-200 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950/40 dark:text-red-100'
  }
  if (availableDays.includes(day)) {
    return 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100'
  }
  return 'border-border bg-muted/40 text-muted-foreground'
}

/** Per-day availability detail shown when hovering a day chip. */
export function dayStatus(
  day: number,
  availability: VisitPlanCarerCandidate['availability'],
): { label: string; detail: string } {
  const { availableDays, unavailableDays, timeMismatchDays = [], timeMismatchMessages = [] } = availability
  const dayLabel = VISIT_PLAN_DAY_LABELS[day] ?? ''
  const message = timeMismatchMessages.find((m) => m.startsWith(`On ${dayLabel}`))
  if (timeMismatchDays.includes(day)) {
    return {
      label: 'Partly outside working hours',
      detail: message ?? 'The visit time only partly overlaps this carer’s working pattern.',
    }
  }
  if (unavailableDays.includes(day)) {
    return { label: 'Not working', detail: 'This carer is not scheduled to work on this day.' }
  }
  if (availableDays.includes(day)) {
    return { label: 'Available', detail: 'The visit fits within this carer’s working pattern.' }
  }
  return { label: 'No working pattern', detail: 'No working pattern is set for this day.' }
}

function ComplianceIssuesInfo({
  count,
  employeeId,
  blocked,
}: {
  count: number
  employeeId: string
  blocked?: boolean
}) {
  const [open, setOpen] = React.useState(false)

  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip open={open} onOpenChange={setOpen}>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={cn(
              'inline-flex shrink-0 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              blocked
                ? 'text-red-700 hover:bg-red-100/80 hover:text-red-950 dark:text-red-300 dark:hover:bg-red-950/50 dark:hover:text-red-100'
                : 'text-amber-700 hover:bg-amber-100/80 hover:text-amber-950 dark:text-amber-300 dark:hover:bg-amber-950/50 dark:hover:text-amber-100',
            )}
            aria-label={
              blocked
                ? 'Why can this carer not be allocated?'
                : 'What do compliance items need attention mean?'
            }
            onClick={(event) => {
              event.stopPropagation()
              setOpen((value) => !value)
            }}
          >
            <Info className="h-3.5 w-3.5" aria-hidden />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" align="start" className="max-w-sm space-y-2 p-3 text-xs leading-relaxed">
          <p className="font-semibold text-foreground">
            {blocked ? 'Cannot allocate — compliance' : 'Compliance items need attention'}
          </p>
          <p className="text-muted-foreground">
            This count is how many of this employee&apos;s required compliance records are not fully in order
            (for example DBS, training certificates, or right to work checks).
          </p>
          <ul className="list-disc space-y-0.5 pl-4 text-muted-foreground">
            <li>
              <span className="font-medium text-foreground">Missing</span> — required but not uploaded
            </li>
            <li>
              <span className="font-medium text-foreground">Expired</span> — past expiry date
            </li>
            <li>
              <span className="font-medium text-foreground">Rejected</span> — submitted but not accepted
            </li>
            <li>
              <span className="font-medium text-foreground">Expiring soon</span> — due to expire shortly
              (warning only)
            </li>
          </ul>
          <p className="text-muted-foreground">
            Showing <span className="font-medium text-foreground">{count}</span> item{count === 1 ? '' : 's'} for
            this carer.{' '}
            {blocked
              ? 'Organisation settings block allocation until these are resolved.'
              : 'You can still assign them, but review compliance before they visit.'}
          </p>
          <Link
            to="/employee/$employeeId/edit"
            params={{ employeeId }}
            className="inline-flex font-medium text-primary hover:underline"
            onClick={() => setOpen(false)}
          >
            Open employee compliance record
          </Link>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

type Props = {
  candidate: VisitPlanCarerCandidate
  slotDaysOfWeek: number[]
  blocked?: boolean
  showSkills?: boolean
  /** Hide name and badges when parent already shows carer identity. */
  availabilityOnly?: boolean
  /** Selected / assigned to this slot — shows a clear Assigned chip. */
  isAssigned?: boolean
  /** Brief pop animation when the carer was just selected. */
  justAssigned?: boolean
  /** Hide the "Visit vs working hours" block (e.g. in the Change carers modal). */
  hideTimeMismatch?: boolean
  /** Denser card for long carer lists: same details, fewer lines. */
  compact?: boolean
}

export function VisitPlanCarerCandidateDetails({
  candidate: c,
  slotDaysOfWeek,
  blocked,
  showSkills = true,
  availabilityOnly = false,
  isAssigned = false,
  justAssigned = false,
  hideTimeMismatch = false,
  compact = false,
}: Props) {
  const slotDays = [...slotDaysOfWeek].sort((a, b) => a - b)
  const availabilityBreakdown = buildCarerAvailabilityBreakdown(c.availability, slotDays)

  return (
    <div className={cn('min-w-0 flex-1', compact ? 'space-y-2' : 'space-y-3')}>
      {!availabilityOnly ? (
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={contentTitleClass}>{c.displayName}</span>
            {isAssigned ? (
              <span
                className={cn(
                  'inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-100',
                  contentTagClass,
                  justAssigned && 'animate-assign-pop',
                )}
              >
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                Assigned
              </span>
            ) : null}
            <span
              className={cn(
                'rounded-full border px-2 py-0.5',
                contentBadgeClass,
                fitStyles(c.fit),
              )}
            >
              {fitLabel(c.fit)}
            </span>
            {c.isPreferred ? (
              <span className={cn('inline-flex items-center gap-0.5 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200', contentTagClass)}>
                <Star className="h-3 w-3" fill="currentColor" aria-hidden />
                Preferred
              </span>
            ) : null}
            {blocked ? (
              <span className={cn('inline-flex items-center gap-0.5 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200', contentTagClass)}>
                <UserX className="h-3 w-3" aria-hidden />
                Blocked
              </span>
            ) : null}
            {c.hasRotaConflict ? (
              <span className={cn('inline-flex items-center gap-0.5 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200', contentTagClass)}>
                Already booked
              </span>
            ) : null}
            {c.complianceBlocksAllocation ? (
              <span className={cn('inline-flex items-center gap-0.5 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200', contentTagClass)}>
                <ShieldAlert className="h-3 w-3" aria-hidden />
                Cannot allocate
              </span>
            ) : null}
            {c.exceedsContractedHours ? (
              <span
                className={cn('inline-flex items-center gap-0.5 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200', contentTagClass)}
                title={`Projected ~${c.projectedWeeklyHours ?? 0}h/wk vs allowed ${c.allowedWeeklyHours ?? c.contractedWeeklyHours ?? 0}h/wk (already assigned ${c.assignedWeeklyHours ?? 0}h)`}
              >
                <AlertTriangle className="h-3 w-3" aria-hidden />
                Over weekly hours
              </span>
            ) : null}
          </div>
          <p className={contentHelperClass}>
            {formatVisitPlanCarerRoleLine(c.role, c.jobTitle) || 'Employee'}
          </p>
          <VisitPlanCarerWeeklyHoursLine candidate={c} includesThisVisit={isAssigned} />
        </div>
      ) : null}

      {slotDays.length > 0 ? (
        <div className={compact ? undefined : 'rounded-lg border border-border/80 bg-muted/20 px-3 py-2.5'}>
          <div className={cn(compact && 'flex flex-wrap items-center gap-x-2 gap-y-1.5')}>
          <div className={cn('flex items-center gap-1.5', contentKickerClass)}>
            <Clock className="h-3.5 w-3.5" aria-hidden />
            {compact ? 'Working pattern' : 'Working pattern · this slot'}
          </div>
          <TooltipProvider delayDuration={100}>
            <div className={cn('flex flex-wrap gap-1.5', !compact && 'mt-2')}>
              {slotDays.map((day) => {
                const status = dayStatus(day, c.availability)
                return (
                  <Tooltip key={day}>
                    <TooltipTrigger asChild>
                      <span
                        tabIndex={0}
                        className={cn(
                          'inline-flex min-w-[2.5rem] cursor-help items-center justify-center rounded-md border px-2 py-1 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                          dayChipTone(day, c.availability),
                        )}
                      >
                        {VISIT_PLAN_DAY_LABELS[day]}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" align="start" className="max-w-[16rem] space-y-1 p-2.5 text-xs leading-relaxed">
                      <p className="font-semibold text-foreground">
                        {VISIT_PLAN_DAY_LABELS[day]} · {status.label}
                      </p>
                      <p className="text-muted-foreground">{status.detail}</p>
                    </TooltipContent>
                  </Tooltip>
                )
              })}
            </div>
          </TooltipProvider>
          </div>
          <VisitPlanCarerAvailabilityBreakdown
            breakdown={availabilityBreakdown}
            hideTimeMismatch={hideTimeMismatch}
          />
        </div>
      ) : null}

      {showSkills && (c.skills.matched.length > 0 || c.skills.missing.length > 0 || c.complianceIssues > 0) ? (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
          {c.skills.matched.length > 0 ? (
            <p className="text-emerald-800 dark:text-emerald-200">
              <span className="font-medium">Skills matched:</span> {c.skills.matched.join(', ')}
            </p>
          ) : null}
          {c.skills.missing.length > 0 ? (
            <p className="text-amber-800 dark:text-amber-200">
              <span className="font-medium">Missing skills:</span> {c.skills.missing.join(', ')}
            </p>
          ) : null}
          {c.complianceIssues > 0 ? (
            <p
              className={cn(
                'inline-flex items-center gap-1',
                c.complianceBlocksAllocation
                  ? 'text-red-800 dark:text-red-200'
                  : 'text-amber-800 dark:text-amber-200',
              )}
            >
              <ShieldAlert className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {c.complianceBlocksAllocation
                ? `Cannot allocate — ${c.complianceIssues} compliance item${c.complianceIssues === 1 ? '' : 's'} blocking`
                : `${c.complianceIssues} compliance item${c.complianceIssues === 1 ? '' : 's'} need attention`}
              <ComplianceIssuesInfo
                count={c.complianceIssues}
                employeeId={c.employeeId}
                blocked={c.complianceBlocksAllocation}
              />
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
