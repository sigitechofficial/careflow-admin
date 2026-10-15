import { Link } from '@tanstack/react-router'
import { MessageSquareWarning, ShieldAlert } from 'lucide-react'
import { Badge } from '@/shared/ui/badge'
import { ContentCard, ContentSectionHeader, contentHelperClass } from '@/shared/ui/content-section'
import { cn } from '@/shared/lib/utils'
import { formatOrganisationDateTime } from '@/shared/lib/organisation-display-format.store'
import { can } from '@/features/auth/org-scope'
import { useIncidents } from '@/features/incidents/hooks/useIncidents'
import { INCIDENT_SEVERITY_BADGE, INCIDENT_STATUS_BADGE, type IncidentListFilters } from '@/features/incidents/types'
import { useFeedbackList } from '@/features/complaints/hooks/useComplaints'
import type { FeedbackListParams, FeedbackRow } from '@/features/complaints/types'
import {
  COMPLAINT_SEVERITY_LABEL,
  FEEDBACK_STATUS_LABEL,
  feedbackStatusVariant,
  severityVariant,
} from '@/features/complaints/feedback-labels'

/** First page only; the full, filterable list is one click away. */
const INCIDENT_LIMIT = 50

const thClass = 'px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground'
const tdClass = 'px-3 py-2.5 align-top'

/**
 * Profile › Incidents & Complaints: the incidents this service user is involved in, and the
 * complaints / compliments made by or about them. Same APIs and access rules as the
 * Accident & Incident registers, so restricted incidents only show for people allowed to see them.
 */
export function ServiceUserIncidentsComplaintsPanel({ serviceUserId }: { serviceUserId: string }) {
  return (
    <div className="space-y-6" data-testid="service-user-incidents-complaints">
      <IncidentsCard serviceUserId={serviceUserId} />
      <ComplaintsCard serviceUserId={serviceUserId} />
    </div>
  )
}

function NoAccess({ what }: { what: string }) {
  return <p className={contentHelperClass}>You do not have permission to view {what}.</p>
}

function IncidentsCard({ serviceUserId }: { serviceUserId: string }) {
  const allowed = can('incidents.read')
  const filters: IncidentListFilters = { serviceUserId, page: 1, limit: INCIDENT_LIMIT }
  const query = useIncidents(filters, { enabled: allowed })
  const items = query.data?.items ?? []
  const total = query.data?.total ?? 0

  return (
    <ContentCard className="space-y-4">
      <ContentSectionHeader
        icon={<ShieldAlert className="h-5 w-5" aria-hidden />}
        iconClassName="bg-red-500/10 text-red-700 dark:text-red-300"
        title="Incidents"
        titleAs="h3"
        description="Accidents and incidents this service user is involved in, newest first."
        action={
          allowed && total > 0 ? (
            <Link
              to="/incidents/view"
              search={{ su: serviceUserId }}
              className="text-sm font-medium text-primary hover:underline"
            >
              Open in All Incidents
            </Link>
          ) : null
        }
      />
      {!allowed ? (
        <NoAccess what="incidents" />
      ) : query.isLoading ? (
        <p className={contentHelperClass}>Loading incidents…</p>
      ) : query.isError ? (
        <p className="text-sm text-destructive">Could not load incidents.</p>
      ) : items.length === 0 ? (
        <p className={contentHelperClass} data-testid="su-incidents-empty">
          No incidents recorded for this service user.
        </p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm" data-testid="su-incidents-table">
              <thead className="border-b border-border bg-muted/30">
                <tr>
                  <th className={thClass}>Reference</th>
                  <th className={thClass}>What happened</th>
                  <th className={thClass}>Occurred</th>
                  <th className={thClass}>Severity</th>
                  <th className={thClass}>Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map((inc) => (
                  <tr key={inc.id} className="border-b border-border last:border-0">
                    <td className={cn(tdClass, 'whitespace-nowrap')}>
                      <Link
                        to="/incidents/$incidentId"
                        params={{ incidentId: inc.id }}
                        className="font-medium text-primary hover:underline"
                      >
                        {inc.referenceNumber}
                      </Link>
                    </td>
                    <td className={tdClass}>
                      {inc.category.label}
                      {inc.subtype ? <span className="text-muted-foreground"> · {inc.subtype.label}</span> : null}
                    </td>
                    <td className={cn(tdClass, 'whitespace-nowrap text-muted-foreground')}>
                      {formatOrganisationDateTime(inc.occurredAt)}
                    </td>
                    <td className={tdClass}>
                      <Badge variant={INCIDENT_SEVERITY_BADGE[inc.severity]} size="sm">
                        {inc.severityLabel}
                      </Badge>
                    </td>
                    <td className={tdClass}>
                      <Badge variant={INCIDENT_STATUS_BADGE[inc.status]} size="sm">
                        {inc.statusLabel}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {total > items.length ? (
            <p className={contentHelperClass}>
              Showing the latest {items.length} of {total}. Open in All Incidents to see the rest.
            </p>
          ) : null}
        </>
      )}
    </ContentCard>
  )
}

/** Whether the record came from this service user, is about them, or both. */
function relationLabel(row: FeedbackRow, serviceUserId: string): string {
  const from = row.fromServiceUser?.id === serviceUserId
  const about = row.aboutServiceUser?.id === serviceUserId
  if (from && about) return 'From and about them'
  if (from) return 'From them'
  return 'About them'
}

function ComplaintsCard({ serviceUserId }: { serviceUserId: string }) {
  const allowed = can('complaints.read')
  const params: FeedbackListParams = { serviceUserId }
  const query = useFeedbackList(params, { enabled: allowed })
  const rows = query.data ?? []

  return (
    <ContentCard className="space-y-4">
      <ContentSectionHeader
        icon={<MessageSquareWarning className="h-5 w-5" aria-hidden />}
        iconClassName="bg-amber-500/10 text-amber-700 dark:text-amber-300"
        title="Complaints & compliments"
        titleAs="h3"
        description="Made by this service user or about them, newest first."
      />
      {!allowed ? (
        <NoAccess what="complaints and compliments" />
      ) : query.isLoading ? (
        <p className={contentHelperClass}>Loading complaints and compliments…</p>
      ) : query.isError ? (
        <p className="text-sm text-destructive">Could not load complaints and compliments.</p>
      ) : rows.length === 0 ? (
        <p className={contentHelperClass} data-testid="su-complaints-empty">
          No complaints or compliments recorded for this service user.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm" data-testid="su-complaints-table">
            <thead className="border-b border-border bg-muted/30">
              <tr>
                <th className={thClass}>Reference</th>
                <th className={thClass}>Type</th>
                <th className={thClass}>Received</th>
                <th className={thClass}>Subject</th>
                <th className={thClass}>Severity</th>
                <th className={thClass}>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-border last:border-0">
                  <td className={cn(tdClass, 'whitespace-nowrap')}>
                    <Link
                      to="/incidents/feedback/$feedbackId"
                      params={{ feedbackId: row.id }}
                      className="font-medium text-primary hover:underline"
                    >
                      {row.referenceNumber}
                    </Link>
                  </td>
                  <td className={tdClass}>
                    <div>{row.type === 'COMPLAINT' ? 'Complaint' : 'Compliment'}</div>
                    <div className="text-xs text-muted-foreground">{relationLabel(row, serviceUserId)}</div>
                  </td>
                  <td className={cn(tdClass, 'whitespace-nowrap text-muted-foreground')}>
                    {formatOrganisationDateTime(row.receivedAt)}
                  </td>
                  <td className={cn(tdClass, 'max-w-xs')}>
                    <div className="truncate font-medium text-foreground">{row.subject}</div>
                    {row.category ? <div className="text-xs text-muted-foreground">{row.category}</div> : null}
                  </td>
                  <td className={tdClass}>
                    {row.severity ? (
                      <Badge size="sm" variant={severityVariant(row.severity)}>
                        {COMPLAINT_SEVERITY_LABEL[row.severity]}
                      </Badge>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className={tdClass}>
                    <Badge size="sm" variant={feedbackStatusVariant(row.status)}>
                      {FEEDBACK_STATUS_LABEL[row.status]}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ContentCard>
  )
}
