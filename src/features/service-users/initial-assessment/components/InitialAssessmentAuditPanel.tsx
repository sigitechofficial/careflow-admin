import { Loader2 } from 'lucide-react'
import { useAuditLogs } from '@/features/audit/hooks/useAuditLogs'
import { formatInitialAssessmentDateTime } from '@/features/service-users/initial-assessment/utils/submission-display'

type Props = {
  serviceUserId: string
  submissionId: string | null
  enabled: boolean
}

export function InitialAssessmentAuditPanel({ serviceUserId, submissionId, enabled }: Props) {
  const auditQuery = useAuditLogs(
    {
      serviceUserId,
      recordType: submissionId ? 'InitialAssessmentSubmission' : undefined,
      recordId: submissionId ?? undefined,
      limit: 50,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    },
    enabled && Boolean(serviceUserId),
  )

  const rows = auditQuery.data?.rows ?? []

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <h3 className="border-b px-4 py-3 text-sm font-semibold">Audit trail</h3>
      {auditQuery.isLoading ? (
        <div className="flex items-center gap-2 px-4 py-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading audit events…
        </div>
      ) : rows.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-muted-foreground">
          No audit events found for this filter.
        </p>
      ) : (
        <ul className="divide-y px-4 py-2">
          {rows.map((row) => (
            <li key={row.id} className="relative border-l-2 border-teal-300 py-3 pl-4">
              <p className="text-xs text-muted-foreground">{formatInitialAssessmentDateTime(row.createdAt)}</p>
              <p className="text-sm font-medium">{row.context?.eventLabel ?? row.action}</p>
              <p className="text-sm text-muted-foreground">
                {row.context?.summary ?? row.description ?? `${row.module} · ${row.action}`}
              </p>
              {row.user ? (
                <p className="text-xs text-muted-foreground">
                  {[row.user.firstName, row.user.lastName].filter(Boolean).join(' ') || row.user.email}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      <p className="border-t px-4 py-2 text-xs text-muted-foreground">
        {submissionId
          ? 'Filtered to the active submission record.'
          : 'Showing service-user audit events (select a submission for record-level detail).'}
      </p>
    </div>
  )
}
