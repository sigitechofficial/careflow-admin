import { Link } from '@tanstack/react-router'
import { X } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { contentHelperClass, contentTitleClass } from '@/shared/ui/content-section'
import { resolveEmployeeDisplayName } from '@/features/employees/lib/employee-display-name'
import type { VisitPlanSlot, VisitPlanCarerCandidate } from '@/features/service-users/visit-plan/types'
import { VisitPlanCarerCandidateDetails } from '@/features/service-users/visit-plan/VisitPlanCarerCandidateDetails'
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
}: Props) {
  const groups = groupCarerAssignments(slot.carerAssignments ?? [])

  if (groups.length === 0) return null

  return (
    <ul className={dense ? 'space-y-2' : 'space-y-3'}>
      {groups.map((group) => {
        const employeeId = group.template.employeeId?.trim()
        const name = employeeId
          ? resolveEmployeeDisplayName(employeeNameById, employeeId)
          : 'No carer selected'
        const daysLabel = formatCarerAssignmentGroupDaysLabel(group.days)
        const durationLabel = formatCarerAssignmentDurationLabel(group.template, slot)
        const candidate = employeeId ? carerCandidatesByEmployeeId?.get(employeeId) : undefined
        const coveredDays = carerAssignmentCoversSlotDays(group.days, slot.daysOfWeek)
        const visitStart = group.template.plannedStartTime?.trim() || slot.plannedStartTime
        const visitEnd = group.template.plannedEndTime?.trim() || slot.plannedEndTime

        return (
          <li
            key={group.groupId}
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
                  <VisitPlanCarerRoleBadge role={group.template.role} />
                  <span className={contentHelperClass}>· {daysLabel}</span>
                </div>
                <p className={contentHelperClass}>
                  {durationLabel} · Visit {visitStart}–{visitEnd}
                </p>
                {candidate ? (
                  <VisitPlanCarerCandidateDetails
                    candidate={candidate}
                    slotDaysOfWeek={coveredDays.length ? coveredDays : slot.daysOfWeek}
                    showSkills={false}
                    availabilityOnly
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
