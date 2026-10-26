import { Link } from '@tanstack/react-router'
import { X } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { contentHelperClass, contentTitleClass } from '@/shared/ui/content-section'
import { resolveEmployeeDisplayName } from '@/features/employees/lib/employee-display-name'
import type { VisitPlanSlot, VisitPlanCarerCandidate } from '@/features/service-users/visit-plan/types'
import {
  VisitPlanCarerCandidateDetails,
  VisitPlanCarerWeeklyHoursLine,
} from '@/features/service-users/visit-plan/VisitPlanCarerCandidateDetails'
import { carerAssignmentCoversSlotDays } from '@/features/service-users/visit-plan/visit-plan-carer-availability-warning.util'
import {
  formatCarerAssignmentDurationLabel,
  formatCarerAssignmentGroupDaysLabel,
  groupCarerAssignments,
} from '@/features/service-users/visit-plan/visit-plan-carer-by-day.util'
import { VisitPlanCarerRoleBadge } from '@/features/service-users/visit-plan/VisitPlanCarerRoleBadge'

type Props = {
  slot: VisitPlanSlot
  employeeNameById: Map<string, string>
  disabled?: boolean
  variant?: 'violet' | 'sky'
  dense?: boolean
  carerCandidatesByEmployeeId?: Map<string, VisitPlanCarerCandidate>
  onRemoveEmployee?: (employeeId: string) => void
  onNavigate?: () => void
  /** Hide the "Visit vs working hours" block on each carer (e.g. in the Change carers modal). */
  hideTimeMismatch?: boolean
}

const removeButtonStyles = {
  violet: 'text-violet-800 hover:bg-violet-100 dark:text-violet-200 dark:hover:bg-violet-900',
  sky: 'text-sky-800 hover:bg-sky-100 dark:text-sky-200 dark:hover:bg-sky-900',
} as const

export function VisitPlanSlotCarerByDaySummaryList({
  slot,
  employeeNameById,
  disabled,
  variant = 'violet',
  dense = false,
  carerCandidatesByEmployeeId,
  onRemoveEmployee,
  onNavigate,
  hideTimeMismatch = false,
}: Props) {
  const groups = groupCarerAssignments(slot.carerAssignments ?? [])
  const carerRows = groups.flatMap((group) =>
    group.carers.map((carer) => ({ group, carer })),
  )

  if (carerRows.length === 0) return null

  // Lead / support only means something when the visit needs more than one carer.
  const showRoles = (slot.requiredCarers || 1) > 1

  return (
    <ul className={dense ? 'space-y-2' : 'space-y-3'}>
      {carerRows.map(({ group, carer }) => {
        const employeeId = carer.employeeId?.trim()
        const name = employeeId
          ? resolveEmployeeDisplayName(employeeNameById, employeeId)
          : 'No carer selected'
        const daysLabel = formatCarerAssignmentGroupDaysLabel(group.days)
        const durationLabel = formatCarerAssignmentDurationLabel(carer, slot)
        const candidate = employeeId ? carerCandidatesByEmployeeId?.get(employeeId) : undefined
        const coveredDays = carerAssignmentCoversSlotDays(group.days, slot.daysOfWeek)
        const visitStart = carer.plannedStartTime?.trim() || slot.plannedStartTime
        const visitEnd = carer.plannedEndTime?.trim() || slot.plannedEndTime

        return (
          <li
            key={`${group.groupId}::${carer.carerKey}`}
            className="rounded-lg border border-border/80 bg-background px-3 py-3 shadow-sm"
          >
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  {employeeId ? (
                    <Link
                      to="/employee/$employeeId/edit"
                      params={{ employeeId }}
                      onClick={onNavigate}
                      className={cn(contentTitleClass, 'hover:underline')}
                    >
                      {name}
                    </Link>
                  ) : (
                    <p className={cn(contentTitleClass, 'text-muted-foreground')}>{name}</p>
                  )}
                  {showRoles ? <VisitPlanCarerRoleBadge role={carer.role} /> : null}
                  <span className={contentHelperClass}>· {daysLabel}</span>
                </div>
                <p className={contentHelperClass}>
                  {durationLabel} · Visit {visitStart}–{visitEnd}
                </p>
                {candidate ? <VisitPlanCarerWeeklyHoursLine candidate={candidate} includesThisVisit /> : null}
                {candidate ? (
                  <VisitPlanCarerCandidateDetails
                    candidate={candidate}
                    slotDaysOfWeek={coveredDays.length ? coveredDays : slot.daysOfWeek}
                    showSkills={false}
                    availabilityOnly
                    hideTimeMismatch={hideTimeMismatch}
                  />
                ) : (
                  <p className={contentHelperClass}>
                    Refresh suggestions to load working pattern and rota availability.
                  </p>
                )}
              </div>
              {!disabled && employeeId && onRemoveEmployee ? (
                <button
                  type="button"
                  className={`shrink-0 rounded-full p-1.5 ${removeButtonStyles[variant]}`}
                  aria-label={`Remove ${name} from ${daysLabel}`}
                  onClick={() => onRemoveEmployee(employeeId)}
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
