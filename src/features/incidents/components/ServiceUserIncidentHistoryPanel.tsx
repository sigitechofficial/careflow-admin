import { Link } from '@tanstack/react-router'
import { AlertTriangle, TrendingUp } from 'lucide-react'
import { Badge } from '@/shared/ui/badge'
import { formatOrganisationIsoDateLong } from '@/shared/lib/organisation-display-format.store'
import { useServiceUserIncidentHistory } from '@/features/incidents/hooks/useIncidentCare'
import { INCIDENT_SEVERITY_BADGE } from '@/features/incidents/types'

/**
 * Reusable operational history + trend indicators for a service user's incidents.
 * Safe to mount on the service-user profile as an Incidents tab.
 * Trend indicators are objective counts — NOT medical conclusions.
 */
export function ServiceUserIncidentHistoryPanel({
  serviceUserId,
  excludeIncidentId,
  limit = 8,
}: {
  serviceUserId: string
  excludeIncidentId?: string
  limit?: number
}) {
  const { data, isLoading } = useServiceUserIncidentHistory(serviceUserId)

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading history…</p>
  if (!data || data.total === 0) {
    return <p className="text-sm text-muted-foreground">No other incidents recorded for this service user.</p>
  }

  const rows = data.incidents.filter((i) => i.id !== excludeIncidentId).slice(0, limit)

  return (
    <div className="space-y-3">
      {data.trends.length > 0 && (
        <div className="space-y-1.5">
          {data.trends.map((t, idx) => (
            <div
              key={idx}
              className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm ${
                t.level === 'warning' ? 'bg-destructive/10 text-destructive' : 'bg-info/10 text-info'
              }`}
            >
              {t.level === 'warning' ? <AlertTriangle className="h-4 w-4 shrink-0" /> : <TrendingUp className="h-4 w-4 shrink-0" />}
              {t.label}
            </div>
          ))}
        </div>
      )}
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No other incidents for this service user.</p>
      ) : (
        <ul className="space-y-1.5">
          {rows.map((i) => (
            <li key={i.id} className="flex items-center justify-between gap-3 text-sm">
              <div className="min-w-0">
                <Link to="/incidents/$incidentId" params={{ incidentId: i.id }} className="font-medium text-primary hover:underline">
                  {i.referenceNumber}
                </Link>
                <span className="ml-1.5 text-muted-foreground">
                  {i.categoryLabel}{i.subtypeLabel ? ` · ${i.subtypeLabel}` : ''}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <Badge variant={INCIDENT_SEVERITY_BADGE[i.severity]} size="sm">{i.severityLabel}</Badge>
                <span className="text-xs text-muted-foreground">{formatOrganisationIsoDateLong(i.occurredAt)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
