import { Link } from '@tanstack/react-router'
import { CalendarDays, Clock, ExternalLink, User } from 'lucide-react'
import { resolveEmployeeDisplayName } from '@/features/employees/lib/employee-display-name'
import type { VisitPlanSlot } from '@/features/service-users/visit-plan/types'
import { VisitPlanCarerRoleBadge } from '@/features/service-users/visit-plan/VisitPlanCarerRoleBadge'
import {
  formatCarerAssignmentDurationLabel,
  formatCarerAssignmentGroupDaysLabel,
  formatCarerAssignmentTimeOverrideLabel,
  groupCarerAssignments,
} from '@/features/service-users/visit-plan/visit-plan-carer-by-day.util'

type Props = {
  slot: VisitPlanSlot
  employeeNameById: Map<string, string>
  onClose?: () => void
}

export function VisitPlanSlotCarerByDayDetails({ slot, employeeNameById, onClose }: Props) {
  const groups = groupCarerAssignments(slot.carerAssignments ?? [])

  if (groups.length === 0) {
    return <p className="text-sm text-muted-foreground">No day-specific carer rules configured.</p>
  }

  return (
    <ul className="space-y-3">
      {groups.map((group) => {
        const employeeId = group.template.employeeId?.trim()
        const name = employeeId
          ? resolveEmployeeDisplayName(employeeNameById, employeeId)
          : 'No carer selected'
        const timeOverride = formatCarerAssignmentTimeOverrideLabel(group.template)

        return (
          <li
            key={group.groupId}
            className="rounded-lg border border-violet-200/80 bg-violet-50/30 p-3 dark:border-violet-900 dark:bg-violet-950/20"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-100">
                <User className="h-4 w-4" aria-hidden />
              </span>
              <div className="min-w-0 flex-1 space-y-2">
                {employeeId ? (
                  <Link
                    to="/employee/$employeeId/edit"
                    params={{ employeeId }}
                    onClick={onClose}
                    className="group inline-flex items-center gap-1.5 text-sm font-medium text-foreground hover:text-violet-900 dark:hover:text-violet-100"
                  >
                    <span className="truncate">{name}</span>
                    <ExternalLink
                      className="h-3.5 w-3.5 shrink-0 text-muted-foreground group-hover:text-violet-700 dark:group-hover:text-violet-300"
                      aria-hidden
                    />
                  </Link>
                ) : (
                  <p className="text-sm font-medium text-muted-foreground">{name}</p>
                )}

                <dl className="grid gap-2 text-xs sm:grid-cols-2">
                  <div className="flex items-start gap-1.5">
                    <CalendarDays className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                    <div>
                      <dt className="text-muted-foreground">Days</dt>
                      <dd className="font-medium text-foreground">
                        {formatCarerAssignmentGroupDaysLabel(group.days)}
                      </dd>
                    </div>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Role</dt>
                    <dd className="mt-0.5">
                      <VisitPlanCarerRoleBadge role={group.template.role} />
                    </dd>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                    <div>
                      <dt className="text-muted-foreground">Duration</dt>
                      <dd className="font-medium text-foreground">
                        {formatCarerAssignmentDurationLabel(group.template, slot)}
                      </dd>
                    </div>
                  </div>
                  {timeOverride ? (
                    <div>
                      <dt className="text-muted-foreground">Visit window override</dt>
                      <dd className="font-medium text-foreground">{timeOverride}</dd>
                    </div>
                  ) : null}
                </dl>
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
