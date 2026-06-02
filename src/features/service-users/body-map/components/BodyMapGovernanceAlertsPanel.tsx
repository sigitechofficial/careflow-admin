import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, X } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import {
  dismissBodyMapAlert,
  fetchBodyMapGovernanceAlerts,
} from '@/features/service-users/body-map/api'
import { bodyMapKeys } from '@/features/service-users/body-map/keys'
import { canReviewBodyMap } from '@/features/service-users/body-map/body-map-permissions'
import { useAuthStore } from '@/features/auth/store'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import type { BodyMapGovernanceAlertRow } from '@/features/service-users/body-map/types'

function severityClass(severity: BodyMapGovernanceAlertRow['severity']): string {
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

export function BodyMapGovernanceAlertsPanel() {
  const qc = useQueryClient()
  const permissions = useAuthStore(s => s.user?.permissions) ?? []
  const canDismiss = canReviewBodyMap(permissions)

  const { data, isLoading } = useQuery({
    queryKey: bodyMapKeys.governanceAlerts(),
    queryFn: ({ signal }) => fetchBodyMapGovernanceAlerts(signal),
  })

  const dismissMutation = useMutation({
    mutationFn: ({ serviceUserId, alertId }: { serviceUserId: string; alertId: string }) =>
      dismissBodyMapAlert(serviceUserId, alertId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: bodyMapKeys.governanceAlerts() })
      void qc.invalidateQueries({ queryKey: bodyMapKeys.all })
      toastSuccess('Alert dismissed')
    },
    onError: e => toastApiError(e),
  })

  const alerts = data?.alerts ?? []
  if (isLoading || alerts.length === 0) return null

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-amber-950">
        <AlertTriangle className="size-4 shrink-0" aria-hidden />
        Governance alerts ({data?.total ?? alerts.length})
      </div>
      <p className="mt-1 text-xs text-amber-900/90">
        Outstanding gaps across service users — overdue reviews, missing links, MAR evidence
      </p>
      <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto">
        {alerts.map(a => (
          <li
            key={a.id}
            className={`flex flex-wrap items-start justify-between gap-2 rounded-md border px-3 py-2 text-xs ${severityClass(a.severity)}`}
          >
            <div className="min-w-0 flex-1">
              <p className="font-medium">
                {a.serviceUserName ?? 'Service user'} · {a.alertType.replace(/_/g, ' ')}
              </p>
              <p className="mt-0.5">{a.message}</p>
              <Button variant="link" size="sm" className="h-auto px-0 text-indigo-700" asChild>
                <Link
                  to="/service-users/$serviceUserId/body-map"
                  params={{ serviceUserId: a.serviceUserId }}
                >
                  Open body map
                </Link>
              </Button>
            </div>
            {canDismiss ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7 shrink-0"
                aria-label="Dismiss alert"
                disabled={dismissMutation.isPending}
                onClick={() =>
                  dismissMutation.mutate({
                    serviceUserId: a.serviceUserId,
                    alertId: a.id,
                  })
                }
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
