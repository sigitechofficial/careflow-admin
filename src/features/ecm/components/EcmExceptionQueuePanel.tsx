import * as React from 'react'
import { CheckCircle2, Loader2, Lock, Radio } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Textarea } from '@/shared/ui/form-field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { EcmStatusBadge } from '@/features/ecm/components/EcmStatusBadge'
import {
  useAcknowledgeEcmException,
  useCloseEcmException,
  useEcmExceptions,
  useEcmReasonCodes,
  useResolveEcmException,
} from '@/features/ecm/hooks/useEcm'
import { useAuthStore } from '@/features/auth/store'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import type { EcmExceptionRow, EcmReasonCode } from '@/features/ecm/types/ecm.types'

function reasonCodesForKind(codes: EcmReasonCode[], kind: string): EcmReasonCode[] {
  const k = kind.toUpperCase()
  if (k.includes('LATE') || k.includes('EARLY_ARRIVAL')) {
    return codes.filter(c => c.category === 'LATE')
  }
  if (k.includes('SHORT') || k.includes('EARLY_DEPARTURE')) {
    return codes.filter(c => c.category === 'SHORT')
  }
  if (k.includes('LONG') || k.includes('OVERRUN')) {
    return codes.filter(c => c.category === 'LONG')
  }
  if (k.includes('MISSED')) {
    return codes.filter(c => c.category === 'MISSED')
  }
  if (k.includes('GEOFENCE') || k.includes('MANUAL') || k.includes('MOCK')) {
    return codes.filter(c => c.category === 'AMEND' || c.category === 'OTHER')
  }
  return codes.filter(c => c.category === 'AMEND' || c.category === 'OTHER')
}

function ExceptionActions({
  row,
  reasonCodes,
  onOpenVisit,
}: {
  row: EcmExceptionRow
  reasonCodes: EcmReasonCode[]
  onOpenVisit: (jobId: string) => void
}) {
  const canManage = useAuthStore(s => s.can('ecm.exceptions.manage' as never))
  const acknowledge = useAcknowledgeEcmException()
  const resolve = useResolveEcmException()
  const close = useCloseEcmException()
  const [reasonCode, setReasonCode] = React.useState('')
  const [note, setNote] = React.useState('')
  const options = reasonCodesForKind(reasonCodes, row.kind)

  const busy = acknowledge.isPending || resolve.isPending || close.isPending
  const isOpen = !['RESOLVED', 'MANAGER_REVIEWED', 'CLOSED'].includes(row.lifecycle)
  const canClose = row.lifecycle === 'RESOLVED' || row.lifecycle === 'MANAGER_REVIEWED'

  if (!canManage) {
    return (
      <Button type="button" size="sm" variant="ghost" onClick={() => onOpenVisit(row.scheduledJobId)}>
        View visit
      </Button>
    )
  }

  return (
    <div className="space-y-2 border-t border-border pt-2" onClick={e => e.stopPropagation()}>
      {isOpen ? (
        <>
          <div className="flex flex-wrap gap-2">
            {row.lifecycle !== 'ACKNOWLEDGED' &&
            row.lifecycle !== 'INVESTIGATING' &&
            row.lifecycle !== 'ACTION_TAKEN' ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => {
                  acknowledge.mutate(
                    { id: row.id, note: note || undefined },
                    {
                      onSuccess: () => toastSuccess('Exception acknowledged'),
                      onError: e => toastApiError(e, 'Could not acknowledge'),
                    },
                  )
                }}
              >
                {acknowledge.isPending ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                )}
                Acknowledge
              </Button>
            ) : null}
            <Button type="button" size="sm" variant="ghost" onClick={() => onOpenVisit(row.scheduledJobId)}>
              View visit
            </Button>
          </div>
          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <Select value={reasonCode || undefined} onValueChange={setReasonCode}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Resolution reason code" />
              </SelectTrigger>
              <SelectContent>
                {options.map(c => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              size="sm"
              className="h-9"
              disabled={busy || !reasonCode}
              onClick={() => {
                resolve.mutate(
                  { id: row.id, reasonCode, note: note || undefined },
                  {
                    onSuccess: () => {
                      toastSuccess('Exception resolved')
                      setReasonCode('')
                      setNote('')
                    },
                    onError: e => toastApiError(e, 'Could not resolve'),
                  },
                )
              }}
            >
              {resolve.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
              Resolve
            </Button>
          </div>
          <Textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Supporting note (optional)"
            className="min-h-[60px] text-sm"
          />
        </>
      ) : canClose ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => {
            close.mutate(
              { id: row.id, note: note || undefined },
              {
                onSuccess: () => toastSuccess('Exception closed'),
                onError: e => toastApiError(e, 'Could not close'),
              },
            )
          }}
        >
          {close.isPending ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Lock className="mr-1.5 h-3.5 w-3.5" />
          )}
          Close
        </Button>
      ) : (
        <Button type="button" size="sm" variant="ghost" onClick={() => onOpenVisit(row.scheduledJobId)}>
          View visit
        </Button>
      )}
    </div>
  )
}

export function EcmExceptionQueuePanel({
  onOpenVisit,
  serviceUserId,
}: {
  onOpenVisit: (jobId: string) => void
  /** When set, only exceptions for this service user are loaded. */
  serviceUserId?: string
}) {
  const exceptions = useEcmExceptions({ limit: 50, serviceUserId })
  const reasons = useEcmReasonCodes()
  const [expandedId, setExpandedId] = React.useState<string | null>(null)

  if (exceptions.isLoading) {
    return (
      <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading exception queue…
      </div>
    )
  }

  if (exceptions.isError) {
    return (
      <p className="text-sm text-muted-foreground">
        Exception queue unavailable — apply the ECM exceptions migration and restart the API.
      </p>
    )
  }

  const rows = exceptions.data ?? []

  return (
    <section className="space-y-2" data-testid="ecm-exception-queue">
      <div className="flex items-center gap-2">
        <Radio className="h-4 w-4 text-muted-foreground" aria-hidden />
        <h3 className="text-sm font-semibold">
          {serviceUserId ? 'Exceptions for this service user' : 'Exception queue'}
        </h3>
        <span className="text-xs text-muted-foreground">
          {rows.length} open · acknowledge / resolve with reason codes
        </span>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No open ECM exceptions.</p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {rows.map(row => {
            const open = expandedId === row.id
            return (
              <li key={row.id} className="px-3 py-2.5">
                <button
                  type="button"
                  className="flex w-full items-start justify-between gap-3 text-left"
                  onClick={() => setExpandedId(open ? null : row.id)}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{row.serviceUserName}</p>
                    <p className="text-xs text-muted-foreground">
                      {row.title}
                      {row.detail ? ` — ${row.detail}` : ''}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap justify-end gap-1">
                    {row.overdue ? (
                      <EcmStatusBadge code="OVERDUE" kind="generic" />
                    ) : null}
                    <EcmStatusBadge code={row.kind} kind="arrival" />
                    <EcmStatusBadge code={row.lifecycle} kind="exceptionLifecycle" />
                  </div>
                </button>
                {open ? (
                  <ExceptionActions
                    row={row}
                    reasonCodes={reasons.data ?? []}
                    onOpenVisit={onOpenVisit}
                  />
                ) : null}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
