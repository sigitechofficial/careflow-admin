import { AlertTriangle, HeartPulse } from 'lucide-react'
import { useEcmHealth } from '@/features/ecm/hooks/useEcm'
import { cn } from '@/shared/lib/utils'

export function EcmHealthBanner() {
  const health = useEcmHealth()
  if (!health.data) return null
  const status = health.data.status
  if (status === 'HEALTHY') return null

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-lg border px-3 py-2 text-sm',
        status === 'DEGRADED'
          ? 'border-destructive/40 bg-destructive/10 text-destructive'
          : 'border-orange-500/40 bg-orange-500/10 text-orange-900 dark:text-orange-200',
      )}
      data-testid="ecm-health-banner"
    >
      <span
        className={cn(
          'mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
          status === 'DEGRADED'
            ? 'bg-destructive/15 text-destructive'
            : 'bg-orange-500/15 text-orange-800 dark:text-orange-200',
        )}
      >
        {status === 'DEGRADED' ? (
          <AlertTriangle className="h-4 w-4" aria-hidden />
        ) : (
          <HeartPulse className="h-4 w-4" aria-hidden />
        )}
      </span>
      <div className="min-w-0">
        <p className="font-medium">ECM monitor: {status}</p>
        <p className="text-xs opacity-90">{health.data.guidance}</p>
      </div>
    </div>
  )
}
