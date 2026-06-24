import * as React from 'react'
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { useMedicationActivityLog } from '@/features/audit/hooks/useAuditLogs'
import {
  auditActorLabel,
  auditRowContext,
  auditRowEventType,
} from '@/features/audit/audit-log-display'
import { auditEventTypeLabel } from '@/features/audit/audit-event-types'
import { Button } from '@/shared/ui/button'
import { formatDateTime } from '@/shared/lib/utils'

function formatWhen(iso: string): string {
  const formatted = formatDateTime(iso)
  return formatted === '—' ? iso : formatted
}

export function MedicationActivityTab({ serviceUserId }: { serviceUserId: string }) {
  const [page, setPage] = React.useState(1)
  const query = useMedicationActivityLog(serviceUserId, page)
  const rows = query.data?.rows ?? []
  const meta = query.data?.meta

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
      <div className="border-b border-border bg-muted/40 px-3 py-2 text-sm font-semibold text-foreground">
        System activity log
        {meta ? ` (${meta.total} entries)` : ''}
      </div>
      <p className="border-b border-border px-3 py-2 text-xs text-muted-foreground">
        Prescription changes, archive/restore, status changes, administration writes, corrections,
        and automatic end-date transitions. Clinical dose history is on the History tab.
      </p>

      {query.isLoading ? (
        <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading activity…
        </div>
      ) : query.isError ? (
        <p className="p-4 text-sm text-destructive" role="alert">
          {query.error instanceof Error ? query.error.message : 'Could not load activity log'}
        </p>
      ) : rows.length === 0 ? (
        <p className="p-4 text-sm text-muted-foreground">No medication activity recorded yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2">When</th>
                <th className="px-3 py-2">Who</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">What happened</th>
                <th className="px-3 py-2">Medication</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => {
                const ctx = auditRowContext(row)
                return (
                  <tr key={row.id} className="border-b border-border/80 last:border-0">
                    <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                      {formatWhen(row.createdAt)}
                    </td>
                    <td className="px-3 py-2">{auditActorLabel(row.user)}</td>
                    <td className="px-3 py-2">
                      <span className="inline-flex rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        {auditEventTypeLabel(auditRowEventType(row))}
                      </span>
                    </td>
                    <td className="max-w-md px-3 py-2">
                      <div className="font-medium text-foreground">{ctx.eventLabel}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">{ctx.summary}</div>
                    </td>
                    <td className="px-3 py-2 text-foreground">{ctx.subject ?? '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-border px-3 py-2">
          <span className="text-xs text-muted-foreground">
            Page {meta.page} of {meta.totalPages}
          </span>
          <div className="flex gap-1">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8"
              disabled={!meta.hasPrevPage || query.isFetching}
              onClick={() => setPage(p => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8"
              disabled={!meta.hasNextPage || query.isFetching}
              onClick={() => setPage(p => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
