import { Link } from '@tanstack/react-router'
import { Badge } from '@/shared/ui/badge'
import { formatOrganisationDateTime } from '@/shared/lib/organisation-display-format.store'
import { useIncidents } from '@/features/incidents/hooks/useIncidents'
import {
  INCIDENT_SEVERITY_BADGE,
  type IncidentListFilters,
  type IncidentListItem,
} from '@/features/incidents/types'

const LIMIT = 25

function IncidentRows({
  title,
  empty,
  filters,
  viewAllSearch,
}: {
  title: string
  empty: string
  filters: IncidentListFilters
  viewAllSearch: Record<string, string>
}) {
  const { data, isLoading, isError } = useIncidents({ ...filters, dateField: 'occurredAt', page: 1, limit: LIMIT })
  const rows: IncidentListItem[] = data?.items ?? []
  const total = data?.total ?? 0

  return (
    <section className="space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">
          {title}
          {!isLoading && !isError ? <span className="ml-1.5 text-muted-foreground">({total})</span> : null}
        </h3>
        {total > LIMIT ? (
          <Link to="/incidents/view" search={viewAllSearch} className="text-xs text-primary hover:underline">
            View all {total}
          </Link>
        ) : null}
      </div>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : isError ? (
        <p className="text-sm text-muted-foreground">
          Incidents aren’t available (you may not have access to incidents).
        </p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {rows.map((i) => (
            <li key={i.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-sm">
              <Link
                to="/incidents/$incidentId"
                params={{ incidentId: i.id }}
                className="font-medium text-primary hover:underline"
              >
                {i.referenceNumber}
              </Link>
              <span className="text-foreground">
                {i.category.label}
                {i.subtype ? ` · ${i.subtype.label}` : ''}
              </span>
              <span className="text-muted-foreground">{formatOrganisationDateTime(i.occurredAt)}</span>
              <Badge size="sm" variant={INCIDENT_SEVERITY_BADGE[i.severity]}>
                {i.severityLabel}
              </Badge>
              <Badge size="sm" variant="muted">
                {i.statusLabel}
              </Badge>
              {i.reportedBy?.source === 'CARER_APP' ? (
                <span className="text-xs text-muted-foreground">Carer app</span>
              ) : i.reportedBy?.recordedByName ? (
                <span className="text-xs text-muted-foreground">Recorded by office · {i.reportedBy.recordedByName}</span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

/**
 * Employee record → Incidents: what this carer reported (from the app, or recorded by the office
 * for them) and the incidents they were affected by or involved in. Uses the All Incidents API, so
 * restricted incidents only show for people allowed to see them.
 */
export function EmployeeEditIncidentsPanel({ employeeId }: { employeeId: string }) {
  return (
    <div className="space-y-6">
      <IncidentRows
        title="Reported by this staff member"
        empty="This staff member has not reported any incidents."
        filters={{ reporterEmployeeId: employeeId }}
        viewAllSearch={{ rep: employeeId }}
      />
      <IncidentRows
        title="Affected or involved"
        empty="This staff member has not been affected by or involved in any incidents."
        filters={{ employeeId }}
        viewAllSearch={{ emp: employeeId }}
      />
    </div>
  )
}
