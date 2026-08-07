import { Badge } from '@/shared/ui/badge'
import { cn } from '@/shared/lib/utils'

const LEVEL_LABEL: Record<string, string> = {
  PLATFORM: 'Platform',
  ORGANISATION: 'Organisation',
  BRANCH: 'Branch',
  CONTRACT: 'Contract',
  SERVICE_USER: 'Service user',
  VISIT_TEMPLATE: 'Visit template',
  VISIT: 'Visit override',
}

function formatThresholdsLabel(
  level: string,
  thresholdRuleVersion?: string | null,
  lateArrivalToleranceMinutes?: number | null,
): string {
  const levelLabel = LEVEL_LABEL[level] ?? level
  const lateFromSettings =
    typeof lateArrivalToleranceMinutes === 'number' && Number.isFinite(lateArrivalToleranceMinutes)
      ? lateArrivalToleranceMinutes
      : null
  const version = thresholdRuleVersion?.trim() || null
  const lateFromVersion = (() => {
    if (!version) return null
    const m = version.match(/(?:^|-)late-(\d+)\b/i)
    return m ? Number(m[1]) : null
  })()
  const lateMins = lateFromSettings ?? lateFromVersion
  if (lateMins != null && Number.isFinite(lateMins)) {
    return `Thresholds: ${levelLabel} · late after ${lateMins} min`
  }
  if (version) {
    return `Thresholds: ${levelLabel} · ${version.replace(/-/g, ' ')}`
  }
  return `Thresholds: ${levelLabel}`
}

export function EcmAppliedSettingsBadge({
  level,
  thresholdRuleVersion,
  lateArrivalToleranceMinutes,
  className,
}: {
  level: string | null | undefined
  thresholdRuleVersion?: string | null
  lateArrivalToleranceMinutes?: number | null
  className?: string
}) {
  if (!level) return null
  const label = formatThresholdsLabel(level, thresholdRuleVersion, lateArrivalToleranceMinutes)
  return (
    <Badge
      variant="outline"
      className={cn('font-normal bg-muted/50 text-muted-foreground border-border', className)}
      title={
        thresholdRuleVersion
          ? `Rule version: ${thresholdRuleVersion}`
          : 'Settings level that supplied applied ECM thresholds'
      }
    >
      {label}
    </Badge>
  )
}
