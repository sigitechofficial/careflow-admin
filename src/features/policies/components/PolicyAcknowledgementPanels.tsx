import * as React from 'react'
import { CheckCircle2, Eye, FileSignature } from 'lucide-react'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/data-table'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import {
  useAcknowledgePolicy,
  useMarkPolicyViewed,
  useMyPolicyAcknowledgements,
  usePolicyDocumentAcknowledgements,
  type PolicyAcknowledgementStatus,
} from '@/features/policies/hooks/usePolicies'
import { formatPolicyDate } from '@/features/policies/policy-format'

const STATUS_LABEL: Record<PolicyAcknowledgementStatus, string> = {
  PENDING: 'Not opened',
  VIEWED: 'Opened, not signed',
  ACKNOWLEDGED: 'Signed',
}
const STATUS_VARIANT: Record<PolicyAcknowledgementStatus, 'secondary' | 'warning' | 'success'> = {
  PENDING: 'secondary',
  VIEWED: 'warning',
  ACKNOWLEDGED: 'success',
}

export function PolicyAckStatusBadge({ status }: { status: PolicyAcknowledgementStatus }) {
  return (
    <Badge variant={STATUS_VARIANT[status]} size="sm">
      {STATUS_LABEL[status]}
    </Badge>
  )
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

/**
 * Shown to the reader when this policy's current version is assigned to them for read and sign.
 * Opening the page records that they viewed it; the button records the acknowledgement.
 */
export function PolicyReadAndSignBanner({ documentId }: { documentId: string }) {
  const mine = useMyPolicyAcknowledgements()
  const viewed = useMarkPolicyViewed()
  const ack = useAcknowledgePolicy()
  const item = mine.data?.items.find(i => i.documentId === documentId)
  const markedRef = React.useRef<string | null>(null)

  React.useEffect(() => {
    if (!item || item.status !== 'PENDING' || markedRef.current === item.versionId) return
    markedRef.current = item.versionId
    viewed.mutate(item.versionId)
  }, [item, viewed])

  if (!item) return null

  if (item.status === 'ACKNOWLEDGED') {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm dark:border-emerald-900 dark:bg-emerald-950/40" data-testid="policy-ack-done">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
        <p className="text-emerald-900 dark:text-emerald-200">
          You confirmed you have read and understood version {item.versionLabel} on {formatDateTime(item.acknowledgedAt)}.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/40" data-testid="policy-ack-required">
      <div className="flex min-w-0 items-start gap-3">
        <FileSignature className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
        <div className="text-sm">
          <p className="font-semibold text-amber-900 dark:text-amber-100">Please read and sign this policy</p>
          <p className="text-amber-800 dark:text-amber-200">
            Read version {item.versionLabel} below, then confirm you have read and understood it.
          </p>
        </div>
      </div>
      <Button
        onClick={() =>
          ack.mutate(item.versionId, {
            onSuccess: () => toastSuccess('Thank you, your acknowledgement is recorded'),
            onError: e => toastApiError(e, 'Could not record your acknowledgement'),
          })
        }
        disabled={ack.isPending}
        data-testid="policy-ack-button"
      >
        {ack.isPending ? 'Saving…' : 'I have read and understood'}
      </Button>
    </div>
  )
}

/** For managers: who must read the current version, and who has signed it. */
export function PolicyAcknowledgementTracker({ documentId }: { documentId: string }) {
  const q = usePolicyDocumentAcknowledgements(documentId)
  const d = q.data

  if (q.isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>
  if (!d || !d.required) {
    return (
      <p className="text-sm text-muted-foreground" data-testid="policy-ack-not-required">
        The published version does not ask staff to acknowledge it. Turn on “Staff must read and acknowledge” in the next
        version to track read and sign.
      </p>
    )
  }
  const pct = d.total ? Math.round((d.acknowledged / d.total) * 100) : null
  return (
    <div className="space-y-4" data-testid="policy-ack-tracker">
      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Signed" value={pct === null ? '—' : `${pct}%`} hint={`${d.acknowledged} of ${d.total} staff`} />
        <Stat label="Opened, not signed" value={String(d.viewed)} />
        <Stat label="Not opened" value={String(d.pending - d.viewed)} />
        <Stat label="Version" value={d.versionLabel} hint={d.publishedAt ? `Published ${formatPolicyDate(d.publishedAt.slice(0, 10))}` : undefined} />
      </div>
      {d.staff.length === 0 ? (
        <p className="text-sm text-muted-foreground">No staff with a sign-in match this policy’s applicability and audience.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Staff member</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Opened</TableHead>
                <TableHead>Signed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {d.staff.map(s => (
                <TableRow key={s.userId}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell>
                    <PolicyAckStatusBadge status={s.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {s.viewedAt ? (
                      <span className="inline-flex items-center gap-1">
                        <Eye className="h-3.5 w-3.5" /> {formatDateTime(s.viewedAt)}
                      </span>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDateTime(s.acknowledgedAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-bold tabular-nums">{value}</p>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )
}
