import * as React from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { ApiError } from '@/shared/api/api-client'
import { useAuthStore } from '@/features/auth/store'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import type { CqcNotificationCandidate } from '../types'
import { useCqcNotificationCandidates } from '../hooks'
import { formatDateTime } from '../labels'
import { NewNotificationDialog } from './NewNotificationDialog'

/** Incidents, safeguarding cases and deaths from the last 30 days that may need a CQC notification. */
export function CandidatesTable() {
  const navigate = useNavigate()
  const canManage = useAuthStore(s => s.can('cqc_notifications.manage'))
  const query = useCqcNotificationCandidates()
  const [picked, setPicked] = React.useState<CqcNotificationCandidate | null>(null)
  const rows = query.data ?? []
  const error = query.error instanceof ApiError ? query.error.message : query.error ? 'Could not load.' : null

  return (
    <div data-testid="cqcn-candidates">
      <p className="mb-3 text-sm text-muted-foreground">
        Incidents, safeguarding cases and people recorded as deceased in the last 30 days that look as if the CQC may
        need to be told, and have no notification yet. An incident is listed once for each kind of notification it may
        need. This is a prompt only: open one, then submit it or mark it not required with the reason.
      </p>
      {error ? <p className="mb-2 text-sm text-destructive">{error}</p> : null}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left">
              {['Record', 'Branch', 'Person', 'When', 'Why', 'Suggested notification', ''].map(h => (
                <th key={h} className="whitespace-nowrap px-3 py-2.5 font-medium text-muted-foreground">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {query.isLoading ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                  Nothing waiting. Every recent record that may need notifying has a notification.
                </td>
              </tr>
            ) : (
              rows.map(c => (
                <tr key={`${c.source}-${c.id}-${c.suggestedType}`} className="border-b border-border last:border-0" data-testid="cqcn-candidate-row">
                  <td className="px-3 py-2.5">
                    {c.source === 'INCIDENT' ? (
                      <Link to="/incidents/$incidentId" params={{ incidentId: c.id }} className="font-medium text-primary hover:underline">
                        {c.referenceNumber}
                      </Link>
                    ) : c.source === 'SAFEGUARDING' ? (
                      <Link to="/safeguarding/$caseId" params={{ caseId: c.id }} className="font-medium text-primary hover:underline">
                        {c.referenceNumber}
                      </Link>
                    ) : (
                      <Link
                        to="/service-users/$serviceUserId"
                        params={{ serviceUserId: c.id }}
                        className="font-medium text-primary hover:underline"
                      >
                        {c.referenceNumber}
                      </Link>
                    )}
                    <div className="text-xs text-muted-foreground">{c.title}</div>
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground">{c.location?.name ?? '—'}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{c.serviceUser?.name ?? '—'}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-muted-foreground">{formatDateTime(c.occurredAt)}</td>
                  <td className="px-3 py-2.5">
                    <Badge size="sm" variant="warning">
                      {c.reason}
                    </Badge>
                  </td>
                  <td className="px-3 py-2.5">{c.suggestedTypeLabel}</td>
                  <td className="px-3 py-2.5 text-right">
                    {canManage ? (
                      <Button size="sm" variant="outline" onClick={() => setPicked(c)} data-testid="cqcn-candidate-prepare">
                        Prepare
                      </Button>
                    ) : null}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <NewNotificationDialog
        open={picked !== null}
        onOpenChange={o => {
          if (!o) setPicked(null)
        }}
        preset={
          picked
            ? {
                type: picked.suggestedType,
                ...(picked.source === 'INCIDENT'
                  ? { incidentId: picked.id }
                  : picked.source === 'SAFEGUARDING'
                    ? { safeguardingCaseId: picked.id }
                    : { serviceUserId: picked.id }),
                locationId: picked.location?.id ?? null,
                recordLabel: picked.referenceNumber,
              }
            : undefined
        }
        onCreated={id =>
          void navigate({ to: '/governance/cqc-notifications/$notificationId', params: { notificationId: id } })
        }
      />
    </div>
  )
}
