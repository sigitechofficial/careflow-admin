import { useEcmAuditTrail } from '@/features/ecm/hooks/useEcm'
import { EcmStatusBadge } from '@/features/ecm/components/EcmStatusBadge'
import { formatOpsDateTimeNumeric } from '@/shared/lib/operational-day.util'
import { Loader2 } from 'lucide-react'

function formatWhen(iso: string): string {
  return formatOpsDateTimeNumeric(iso)
}

export function EcmAuditTrailPanel({ jobId }: { jobId: string }) {
  const audit = useEcmAuditTrail(jobId)

  if (audit.isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Loading audit trail…
      </div>
    )
  }

  const rows = audit.data ?? []

  return (
    <section className="space-y-2" data-testid="ecm-audit-trail">
      <p className="text-xs font-medium text-muted-foreground">
        Immutable audit trail ({rows.length})
      </p>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No ECM audit events yet.</p>
      ) : (
        <ul className="max-h-56 space-y-2 overflow-y-auto">
          {rows.map(ev => (
            <li key={ev.id} className="rounded-md border border-border px-3 py-2 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <EcmStatusBadge code={ev.eventType} kind="generic" />
                <span className="text-muted-foreground">{formatWhen(ev.createdAt)}</span>
              </div>
              <p className="mt-1 text-sm">{ev.summary}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
