import * as React from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { Send } from 'lucide-react'
import { useAuthStore } from '@/features/auth/store'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import type { CqcNotificationType } from '../types'
import { useCqcNotifications } from '../hooks'
import { STATUS_LABEL, formatDateTime, statusVariant } from '../labels'
import { NewNotificationDialog } from './NewNotificationDialog'

/**
 * CQC notifications linked to an incident or a safeguarding case, with a button to prepare one
 * (details are filled in from the record). Shown only to people who can read CQC notifications.
 */
export function CqcNotificationsPanel({
  incidentId,
  safeguardingCaseId,
  suggestedType,
  locationId,
  recordLabel,
}: {
  incidentId?: string
  safeguardingCaseId?: string
  suggestedType?: CqcNotificationType
  /** The record's branch, if it has one. */
  locationId?: string | null
  recordLabel?: string
}) {
  const can = useAuthStore(s => s.can)
  const canRead = can('cqc_notifications.read')
  const canManage = can('cqc_notifications.manage')
  const navigate = useNavigate()
  const list = useCqcNotifications({ incidentId, safeguardingCaseId, limit: 20 }, canRead)
  const [open, setOpen] = React.useState(false)
  if (!canRead) return null
  const rows = list.data?.rows ?? []

  return (
    <div className="space-y-3" data-testid="cqcn-panel">
      <p className="text-sm text-muted-foreground">
        Deaths, serious injuries, abuse or allegations of abuse, police involvement and events that stop the service
        running safely must be notified to the CQC without delay.
      </p>
      {list.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : rows.length ? (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {rows.map(r => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
              <Link
                to="/governance/cqc-notifications/$notificationId"
                params={{ notificationId: r.id }}
                className="font-medium text-primary hover:underline"
              >
                {r.referenceNumber} · {r.typeLabel}
              </Link>
              <span className="flex items-center gap-2 text-xs text-muted-foreground">
                {r.submittedAt ? `Sent ${formatDateTime(r.submittedAt)}` : `Due ${formatDateTime(r.dueAt)}`}
                <Badge size="sm" variant={statusVariant(r.status)}>
                  {STATUS_LABEL[r.status]}
                </Badge>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">No CQC notification for this record yet.</p>
      )}
      {canManage ? (
        <Button size="sm" variant="outline" onClick={() => setOpen(true)} data-testid="cqcn-panel-prepare">
          <Send className="mr-1.5 h-4 w-4" />
          Prepare CQC notification
        </Button>
      ) : null}
      <NewNotificationDialog
        open={open}
        onOpenChange={setOpen}
        preset={{ type: suggestedType, incidentId, safeguardingCaseId, locationId, recordLabel }}
        onCreated={id =>
          void navigate({ to: '/governance/cqc-notifications/$notificationId', params: { notificationId: id } })
        }
      />
    </div>
  )
}
