import { Loader2 } from 'lucide-react'
import { useAuditLogs } from '@/features/audit/hooks/useAuditLogs'

const ASSESSMENT_AUDIT_SEARCH = 'assessment.'

type Props = {
  serviceUserId: string
  enabled?: boolean
}

export function AssessmentAuditTrailPanel({ serviceUserId, enabled = true }: Props) {
  const auditQuery = useAuditLogs(
    {
      serviceUserId,
      search: ASSESSMENT_AUDIT_SEARCH,
      limit: 40,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    },
    enabled && Boolean(serviceUserId),
  )

  const rows = auditQuery.data?.rows ?? []

  return (
    <div className="rounded-md border border-border/70 bg-muted/10" data-testid="su-assessment-audit-trail">
      <h4 className="border-b border-border/60 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Assessment audit trail
      </h4>
      {auditQuery.isLoading ? (
        <div className="flex items-center gap-2 px-3 py-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading audit events…
        </div>
      ) : rows.length === 0 ? (
        <p className="px-3 py-6 text-sm text-muted-foreground">
          No assessment audit events yet (promotions, completions, care plan links).
        </p>
      ) : (
        <ul className="max-h-64 divide-y overflow-y-auto px-3">
          {rows.map((row) => (
            <li key={row.id} className="py-2.5">
              <p className="text-xs text-muted-foreground">
                {new Date(row.createdAt).toLocaleString()}
              </p>
              <p className="text-sm font-medium">{row.context?.eventLabel ?? row.action}</p>
              <p className="text-xs text-muted-foreground">
                {row.context?.summary ?? row.description ?? row.action}
              </p>
              {row.user ? (
                <p className="text-xs text-muted-foreground">
                  {[row.user.firstName, row.user.lastName].filter(Boolean).join(' ') ||
                    row.user.email}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
