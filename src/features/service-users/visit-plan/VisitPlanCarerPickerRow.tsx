import * as React from 'react'
import { AlertTriangle, CheckCircle2, ChevronDown, ShieldAlert, Star, UserX } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { contentHelperClass, contentTagClass } from '@/shared/ui/content-section'
import type { VisitPlanCarerCandidate } from '@/features/service-users/visit-plan/types'
import { VISIT_PLAN_DAY_LABELS } from '@/features/service-users/visit-plan/types'
import { formatVisitPlanCarerRoleLine } from '@/features/scheduling/utils/schedule-carer-suggest.util'
import {
  VisitPlanCarerCandidateDetails,
  dayChipTone,
  dayStatus,
} from '@/features/service-users/visit-plan/VisitPlanCarerCandidateDetails'
import {
  buildCarerAvailabilityBreakdown,
  formatVisitPlanDayList,
} from '@/features/service-users/visit-plan/visit-plan-carer-availability-display.util'
import { summarizeCarerWeeklyHours } from '@/features/service-users/visit-plan/visit-plan-carer-weekly-hours.util'
import { useOrganisationDisplayFormat } from '@/shared/context/organisation-display-format.context'

/** Mon → Sun (day numbers are 0 = Sun … 6 = Sat). */
const WEEK_DAYS_MON_FIRST = [1, 2, 3, 4, 5, 6, 0]

const tagBase = 'inline-flex items-center gap-0.5 rounded-full border px-2 py-0.5'
const redTag =
  'border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200'

type Props = {
  candidate: VisitPlanCarerCandidate
  slotDaysOfWeek: number[]
  /** Radio, checkbox or a static marker for assigned carers. */
  control: React.ReactNode
  /** The carer is on this visit (selected or already assigned). */
  isAssigned: boolean
  blocked?: boolean
  /** Extra items after the name, e.g. role badge / Make lead. */
  nameExtras?: React.ReactNode
  /** Right-most action, e.g. remove button. */
  trailing?: React.ReactNode
}

function availabilityLine(c: VisitPlanCarerCandidate, slotDays: number[]): string | null {
  const breakdown = buildCarerAvailabilityBreakdown(c.availability, slotDays)
  const parts: string[] = []
  if (breakdown.availableDays.length > 0) {
    parts.push(`Available ${formatVisitPlanDayList(breakdown.availableDays)}`)
  }
  if (breakdown.unavailableDays.length > 0) {
    parts.push(`Not working ${formatVisitPlanDayList(breakdown.unavailableDays)}`)
  }
  return parts.length > 0 ? parts.join(' · ') : null
}

/**
 * One carer in the picker: name and tags, weekly hours bar, Mon–Sun strip, and an
 * expandable panel with the full working pattern, availability, skills and compliance.
 */
export function VisitPlanCarerPickerRow({
  candidate: c,
  slotDaysOfWeek,
  control,
  isAssigned,
  blocked,
  nameExtras,
  trailing,
}: Props) {
  const [open, setOpen] = React.useState(false)
  const slotDays = [...slotDaysOfWeek].sort((a, b) => a - b)
  const slotDaySet = new Set(slotDays)
  const { formatDate } = useOrganisationDisplayFormat()
  const hours = summarizeCarerWeeklyHours(
    c,
    isAssigned,
    c.weeklyHoursWeekStart ? `Week of ${formatDate(c.weeklyHoursWeekStart)}` : null,
  )
  const roleLine = formatVisitPlanCarerRoleLine(c.role, c.jobTitle) || 'Employee'
  const availability = availabilityLine(c, slotDays)
  const hasDetails =
    slotDays.length > 0 ||
    c.skills.matched.length > 0 ||
    c.skills.missing.length > 0 ||
    c.complianceIssues > 0

  return (
    <div>
      <div className="grid grid-cols-[1.25rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 sm:grid-cols-[1.25rem_minmax(0,1fr)_13rem_auto_auto]">
        <div className="flex items-center justify-center">{control}</div>

        <div className="min-w-0 space-y-0.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="truncate text-sm font-medium text-foreground">{c.displayName}</span>
            {nameExtras}
            {isAssigned ? (
              <span
                className={cn(
                  tagBase,
                  'border-sky-300 bg-sky-50 text-sky-900 dark:border-sky-700 dark:bg-sky-950/50 dark:text-sky-100',
                  contentTagClass,
                )}
              >
                <CheckCircle2 className="h-3 w-3" aria-hidden />
                Assigned
              </span>
            ) : null}
            {c.isPreferred ? (
              <span
                className={cn(
                  tagBase,
                  'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200',
                  contentTagClass,
                )}
              >
                <Star className="h-3 w-3" fill="currentColor" aria-hidden />
                Preferred
              </span>
            ) : null}
            {blocked ? (
              <span className={cn(tagBase, redTag, contentTagClass)}>
                <UserX className="h-3 w-3" aria-hidden />
                Blocked
              </span>
            ) : null}
            {c.hasRotaConflict ? (
              <span className={cn(tagBase, redTag, contentTagClass)}>Already booked</span>
            ) : null}
            {c.complianceBlocksAllocation ? (
              <span className={cn(tagBase, redTag, contentTagClass)}>
                <ShieldAlert className="h-3 w-3" aria-hidden />
                Cannot allocate
              </span>
            ) : null}
            {c.exceedsContractedHours ? (
              <span
                className={cn(
                  tagBase,
                  'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200',
                  contentTagClass,
                )}
              >
                <AlertTriangle className="h-3 w-3" aria-hidden />
                Over weekly hours
              </span>
            ) : null}
          </div>
          <p className={cn('truncate', contentHelperClass)}>
            {roleLine}
            {availability ? ` · ${availability}` : ''}
          </p>
        </div>

        <div className="col-span-2 col-start-2 row-start-2 min-w-0 sm:col-span-1 sm:col-start-auto sm:row-start-auto">
          {hours ? (
            <div title={hours.text}>
              <p className="truncate text-xs text-muted-foreground">{hours.statsLine}</p>
              <p
                className={cn(
                  'truncate text-xs text-muted-foreground',
                  hours.tone === 'atLimit' && 'font-medium text-amber-700 dark:text-amber-300',
                  hours.tone === 'over' && 'font-medium text-red-700 dark:text-red-300',
                )}
                data-testid="carer-weekly-hours-line"
              >
                {hours.visitLine}
              </p>
            </div>
          ) : null}
        </div>

        <div
          className="col-span-2 col-start-2 flex gap-0.5 sm:col-span-1 sm:col-start-auto"
          aria-label="Working pattern for this visit"
        >
          {WEEK_DAYS_MON_FIRST.map((day) => {
            const onSlot = slotDaySet.has(day)
            const status = onSlot ? dayStatus(day, c.availability) : null
            return (
              <span
                key={day}
                title={
                  status
                    ? `${VISIT_PLAN_DAY_LABELS[day]} · ${status.label}`
                    : `${VISIT_PLAN_DAY_LABELS[day]} · not a visit day`
                }
                className={cn(
                  'inline-flex h-5 w-5 items-center justify-center rounded border text-[10px] font-medium',
                  onSlot
                    ? dayChipTone(day, c.availability)
                    : 'border-transparent text-muted-foreground',
                )}
              >
                {VISIT_PLAN_DAY_LABELS[day]?.charAt(0)}
              </span>
            )
          })}
        </div>

        <div className="col-start-3 row-start-1 flex items-center gap-1 sm:col-start-auto sm:row-start-auto">
          {hasDetails ? (
            <button
              type="button"
              className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-expanded={open}
              aria-label={open ? `Hide details for ${c.displayName}` : `Show details for ${c.displayName}`}
              onClick={(event) => {
                event.stopPropagation()
                setOpen((v) => !v)
              }}
            >
              <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
            </button>
          ) : null}
          {trailing}
        </div>
      </div>

      {open ? (
        <div
          className="mt-2 border-t border-dashed border-border pt-2 sm:ml-8"
          onClick={(event) => event.stopPropagation()}
        >
          <VisitPlanCarerCandidateDetails
            candidate={c}
            slotDaysOfWeek={slotDaysOfWeek}
            availabilityOnly
            blocked={blocked}
            isAssigned={isAssigned}
            hideTimeMismatch
            compact
          />
        </div>
      ) : null}
    </div>
  )
}
