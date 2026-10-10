import { Link } from '@tanstack/react-router'
import { UserX } from 'lucide-react'
import { Badge } from '@/shared/ui/badge'
import {
  formatOrganisationDateTime,
  formatOrganisationIsoDateLong,
} from '@/shared/lib/organisation-display-format.store'
import { useEmployeeIncidentSuspensions } from '@/features/incidents/hooks/useIncidents'
import type { EmployeeIncidentSuspension } from '@/features/incidents/types'

function StatusBadge({ s }: { s: EmployeeIncidentSuspension }) {
  if (s.status === 'LIFTED') return <Badge size="sm" variant="muted">Lifted</Badge>
  if (s.status === 'SCHEDULED') return <Badge size="sm" variant="info">Scheduled</Badge>
  if (s.reviewDue) return <Badge size="sm" variant="warning">Review due</Badge>
  return <Badge size="sm" variant="destructive">Active</Badge>
}

/**
 * Employee record → Suspensions: every interim suspension from incidents (who, when, why, and
 * how it ended), for HR and audit. Only incidents the viewer may see are listed.
 */
export function EmployeeEditSuspensionsPanel({ employeeId }: { employeeId: string }) {
  const { data, isLoading, isError } = useEmployeeIncidentSuspensions(employeeId)

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading suspensions…</p>
  if (isError) {
    return (
      <p className="text-sm text-muted-foreground">
        Suspension history isn’t available (you may not have access to incidents).
      </p>
    )
  }
  const rows = data ?? []
  const open = rows.filter((s) => s.status !== 'LIFTED').length

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Suspensions from incidents</h3>
        <p className="text-xs text-muted-foreground">
          {rows.length === 0
            ? 'This staff member has not been suspended.'
            : `${rows.length} suspension${rows.length === 1 ? '' : 's'}${open ? ` · ${open} not lifted` : ''}`}
        </p>
      </div>
      {rows.length > 0 && (
        <ul className="space-y-2">
          {rows.map((s) => (
            <li key={s.id} className="rounded-lg border border-border p-3 text-sm">
              <div className="flex flex-wrap items-center gap-1.5">
                <UserX className="h-4 w-4 text-destructive" aria-hidden />
                <span className="font-medium text-foreground">
                  {formatOrganisationIsoDateLong(s.suspendFrom)} → {formatOrganisationIsoDateLong(s.suspendTo)}
                </span>
                <StatusBadge s={s} />
                {s.continuedAt && s.status !== 'LIFTED' && (
                  <Badge size="sm" variant="warning">Continues after incident</Badge>
                )}
                <Link
                  to="/incidents/$incidentId"
                  params={{ incidentId: s.incidentId }}
                  className="text-xs text-primary hover:underline"
                >
                  {s.incidentReference}
                </Link>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-foreground">{s.reason}</p>
              <dl className="mt-1.5 space-y-0.5 text-xs text-muted-foreground">
                <div>
                  Suspended {formatOrganisationDateTime(s.suspendedAt)}
                  {s.suspendedByName ? ` by ${s.suspendedByName}` : ''}
                </div>
                {s.continuedAt && (
                  <div>
                    Continued {formatOrganisationDateTime(s.continuedAt)}
                    {s.continuedByName ? ` by ${s.continuedByName}` : ''}: {s.continueReason}
                  </div>
                )}
                {s.liftedAt && (
                  <div>
                    Lifted {formatOrganisationDateTime(s.liftedAt)}
                    {s.liftedByName ? ` by ${s.liftedByName}` : ''}: {s.liftReason}
                  </div>
                )}
              </dl>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
