import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, ChevronDown, Loader2, X } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { cn } from '@/shared/lib/utils'
import {
  dismissBodyMapAlert,
  fetchBodyMapAlerts,
  fetchBodyMapHandover,
} from '@/features/service-users/body-map/api'
import { bodyMapKeys } from '@/features/service-users/body-map/keys'
import { recordTypeLabel, type BodyMapRecordTypeCode } from '@/features/service-users/body-map/catalog/record-types'
import type { BodyMapSummary } from '@/features/service-users/body-map/types'
import { canReviewBodyMap } from '@/features/service-users/body-map/body-map-permissions'
import { useAuthStore } from '@/features/auth/store'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'

export function useBodyMapAttentionData(
  serviceUserId: string,
  summary: BodyMapSummary | undefined,
) {
  const handoverQuery = useQuery({
    queryKey: [...bodyMapKeys.all, 'handover', serviceUserId] as const,
    queryFn: ({ signal }) => fetchBodyMapHandover(serviceUserId, signal),
    enabled: Boolean(serviceUserId),
  })

  const alertsQuery = useQuery({
    queryKey: bodyMapKeys.alerts(serviceUserId),
    queryFn: ({ signal }) => fetchBodyMapAlerts(serviceUserId, signal),
    enabled: Boolean(serviceUserId),
  })

  const medMissing = summary?.medicationAlerts?.missingBodyMapSiteCount ?? 0
  const patchOverdue = summary?.medicationAlerts?.overduePatchChangeCount ?? 0
  const governanceAlerts = alertsQuery.data ?? []
  const handover = handoverQuery.data
  const handoverActive = (handover?.activeCount ?? 0) > 0

  const itemCount =
    governanceAlerts.length +
    (medMissing > 0 ? 1 : 0) +
    (patchOverdue > 0 ? 1 : 0) +
    (handoverActive ? 1 : 0)

  const urgent =
    (summary?.safeguardingCount ?? 0) > 0 ||
    (summary?.highRiskCount ?? 0) > 0 ||
    patchOverdue > 0 ||
    governanceAlerts.some(a => a.severity === 'HIGH' || a.severity === 'URGENT')

  return {
    isLoading: handoverQuery.isLoading || alertsQuery.isLoading,
    itemCount,
    urgent,
    medMissing,
    patchOverdue,
    governanceAlerts,
    handover,
    handoverActive,
  }
}

type Props = {
  serviceUserId: string
  summary: BodyMapSummary | undefined
  onSelectRecord?: (recordId: string) => void
  /** `banner` = collapsible strip (legacy). `tab` = full panel for the Attention tab. */
  variant?: 'banner' | 'tab'
}

function AttentionContent({
  handoverActive,
  handover,
  medMissing,
  patchOverdue,
  governanceAlerts,
  canDismiss,
  dismissPending,
  onDismiss,
  onSelectRecord,
}: {
  handoverActive: boolean
  handover: ReturnType<typeof useBodyMapAttentionData>['handover']
  medMissing: number
  patchOverdue: number
  governanceAlerts: NonNullable<ReturnType<typeof useBodyMapAttentionData>['governanceAlerts']>
  canDismiss: boolean
  dismissPending: boolean
  onDismiss: (alertId: string) => void
  onSelectRecord?: (recordId: string) => void
}) {
  return (
    <div className="space-y-2 text-xs">
      {handoverActive && handover ? (
        <div className="rounded-md border border-blue-200/80 bg-blue-50/60 px-2.5 py-2">
          <p className="font-semibold text-blue-950">
            Handover — {handover.activeCount} active concern
            {handover.activeCount === 1 ? '' : 's'}
          </p>
          <ul className="mt-1 space-y-0.5 text-blue-900">
            {handover.concerns.slice(0, 3).map(c => (
              <li key={c.recordId}>
                {recordTypeLabel(c.recordType as BodyMapRecordTypeCode)}
                {c.bodyPart ? ` · ${c.bodyPart}` : ''}
                {c.reviewOverdue ? ' · overdue' : ''}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {medMissing > 0 ? (
        <p className="rounded-md border border-amber-200 bg-background/80 px-2.5 py-2 text-amber-950">
          {medMissing} topical/patch medicine{medMissing === 1 ? '' : 's'} without a body map site —
          open MAR to add sites.
        </p>
      ) : null}

      {patchOverdue > 0 ? (
        <p className="rounded-md border border-red-200 bg-background/80 px-2.5 py-2 text-red-950">
          {patchOverdue} patch site{patchOverdue === 1 ? '' : 's'} past next change due.
        </p>
      ) : null}

      {governanceAlerts.length > 0 ? (
        <ul className="space-y-1.5">
          {governanceAlerts.map(a => (
            <li
              key={a.id}
              className="flex items-start justify-between gap-2 rounded-md border border-border bg-background/90 px-2.5 py-2"
            >
              <div className="min-w-0">
                <span className="font-medium">{a.alertType.replace(/_/g, ' ')}</span>
                <p className="mt-0.5 text-muted-foreground">{a.message}</p>
                {a.record && onSelectRecord ? (
                  <button
                    type="button"
                    className="mt-1 text-indigo-700 underline"
                    onClick={() => onSelectRecord(a.record!.id)}
                  >
                    View record
                  </button>
                ) : null}
              </div>
              {canDismiss ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7 shrink-0"
                  aria-label="Dismiss alert"
                  disabled={dismissPending}
                  onClick={() => onDismiss(a.id)}
                >
                  <X className="size-3.5" />
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

export function BodyMapAttentionPanel({
  serviceUserId,
  summary,
  onSelectRecord,
  variant = 'banner',
}: Props) {
  const qc = useQueryClient()
  const permissions = useAuthStore(s => s.user?.permissions) ?? []
  const canDismiss = canReviewBodyMap(permissions)

  const {
    isLoading,
    itemCount,
    urgent,
    medMissing,
    patchOverdue,
    governanceAlerts,
    handover,
    handoverActive,
  } = useBodyMapAttentionData(serviceUserId, summary)

  const dismissMutation = useMutation({
    mutationFn: (alertId: string) => dismissBodyMapAlert(serviceUserId, alertId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: bodyMapKeys.alerts(serviceUserId) })
      void qc.invalidateQueries({ queryKey: bodyMapKeys.list(serviceUserId) })
      toastSuccess('Alert dismissed')
    },
    onError: toastApiError,
  })

  const [open, setOpen] = React.useState(variant === 'tab')

  React.useEffect(() => {
    if (variant === 'banner' && urgent) setOpen(true)
  }, [urgent, variant])

  if (isLoading) {
    if (variant === 'tab') {
      return (
        <div className="flex min-h-[200px] items-center justify-center print:hidden">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )
    }
    return null
  }

  if (itemCount === 0) {
    if (variant === 'tab') {
      return (
        <p className="rounded-lg border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground print:hidden">
          No items need attention right now.
        </p>
      )
    }
    return null
  }

  const shellClass = cn(
    'rounded-lg border print:hidden',
    urgent ? 'border-amber-300 bg-amber-50/80' : 'border-border bg-muted/30',
  )

  const content = (
    <AttentionContent
      handoverActive={handoverActive}
      handover={handover}
      medMissing={medMissing}
      patchOverdue={patchOverdue}
      governanceAlerts={governanceAlerts}
      canDismiss={canDismiss}
      dismissPending={dismissMutation.isPending}
      onDismiss={id => dismissMutation.mutate(id)}
      onSelectRecord={onSelectRecord}
    />
  )

  if (variant === 'tab') {
    return (
      <div className={shellClass}>
        <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3 text-sm">
          <AlertTriangle
            className={cn('size-4 shrink-0', urgent ? 'text-amber-800' : 'text-muted-foreground')}
            aria-hidden
          />
          <span className="font-medium">
            Attention needed
            <span className="ml-1.5 font-normal text-muted-foreground">({itemCount})</span>
          </span>
        </div>
        <div className="px-4 py-3">{content}</div>
      </div>
    )
  }

  return (
    <div className={shellClass}>
      <button
        type="button"
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm"
        onClick={() => setOpen(v => !v)}
      >
        <AlertTriangle
          className={cn('size-4 shrink-0', urgent ? 'text-amber-800' : 'text-muted-foreground')}
          aria-hidden
        />
        <span className="min-w-0 flex-1 font-medium">
          Attention needed
          <span className="ml-1.5 font-normal text-muted-foreground">({itemCount})</span>
        </span>
        <ChevronDown
          className={cn('size-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')}
          aria-hidden
        />
      </button>

      {open ? (
        <div className="space-y-2 border-t border-border/60 px-3 pb-3 pt-2">{content}</div>
      ) : null}
    </div>
  )
}
