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

export function EcmAppliedSettingsBadge({
  level,
  thresholdRuleVersion,
  className,
}: {
  level: string | null | undefined
  thresholdRuleVersion?: string | null
  className?: string
}) {
  if (!level) return null
  const label = LEVEL_LABEL[level] ?? level
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
      Rule: {label}
      {thresholdRuleVersion ? ` · ${thresholdRuleVersion}` : ''}
    </Badge>
  )
}
