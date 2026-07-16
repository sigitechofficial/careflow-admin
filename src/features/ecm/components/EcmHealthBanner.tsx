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
        'rounded-lg border px-3 py-2 text-sm',
        status === 'DEGRADED'
          ? 'border-destructive/40 bg-destructive/10 text-destructive'
          : 'border-orange-500/40 bg-orange-500/10 text-orange-900 dark:text-orange-200',
      )}
      data-testid="ecm-health-banner"
    >
      <p className="font-medium">ECM monitor: {status}</p>
      <p className="text-xs opacity-90">{health.data.guidance}</p>
    </div>
  )
}
