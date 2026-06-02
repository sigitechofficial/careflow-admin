import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, X } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { dismissBodyMapAlert, fetchBodyMapAlerts } from '@/features/service-users/body-map/api'
import { bodyMapKeys } from '@/features/service-users/body-map/keys'
import { canReviewBodyMap } from '@/features/service-users/body-map/body-map-permissions'
import { useAuthStore } from '@/features/auth/store'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import type { BodyMapAlertRow } from '@/features/service-users/body-map/types'

type Props = {
  serviceUserId: string
  onSelectRecord?: (recordId: string) => void
}

function severityClass(severity: BodyMapAlertRow['severity']): string {
  switch (severity) {
    case 'URGENT':
    case 'HIGH':
      return 'border-red-300 bg-red-50 text-red-950'
    case 'MEDIUM':
      return 'border-amber-300 bg-amber-50 text-amber-950'
    default:
      return 'border-slate-300 bg-slate-50 text-slate-900'
  }
}

export function BodyMapAlertsBanner({ serviceUserId, onSelectRecord }: Props) {
  const qc = useQueryClient()
  const permissions = useAuthStore(s => s.user?.permissions) ?? []
  const canDismiss = canReviewBodyMap(permissions)

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: bodyMapKeys.alerts(serviceUserId),
    queryFn: ({ signal }) => fetchBodyMapAlerts(serviceUserId, signal),
    enabled: Boolean(serviceUserId),
  })

  const dismissMutation = useMutation({
    mutationFn: (alertId: string) => dismissBodyMapAlert(serviceUserId, alertId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: bodyMapKeys.alerts(serviceUserId) })
      void qc.invalidateQueries({ queryKey: bodyMapKeys.list(serviceUserId) })
      toastSuccess('Alert dismissed')
    },
    onError: toastApiError,
  })

  if (isLoading || alerts.length === 0) return null

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50/90 p-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-amber-950">
        <AlertTriangle className="size-4 shrink-0" aria-hidden />
        Governance alerts ({alerts.length})
      </div>
      <ul className="mt-2 space-y-2">
        {alerts.map(a => (
          <li
            key={a.id}
            className={`flex flex-wrap items-start justify-between gap-2 rounded-md border px-2 py-1.5 text-xs ${severityClass(a.severity)}`}
          >
            <div className="min-w-0 flex-1">
              <span className="font-medium">{a.alertType.replace(/_/g, ' ')}</span>
              <p className="mt-0.5">{a.message}</p>
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
                disabled={dismissMutation.isPending}
                onClick={() => dismissMutation.mutate(a.id)}
              >
                <X className="size-3.5" />
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  )
}
