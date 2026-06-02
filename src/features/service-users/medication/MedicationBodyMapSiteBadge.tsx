import { Link } from '@tanstack/react-router'
import { MapPin } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import type { MedicationBodyMapSiteIndexEntry } from '@/features/service-users/body-map/hooks/useMedicationBodyMapSiteIndex'

type Props = {
  serviceUserId: string
  medicationId: string
  siteEntry: MedicationBodyMapSiteIndexEntry | undefined
  requiresSite: boolean
  compact?: boolean
}

export function MedicationBodyMapSiteBadge({
  serviceUserId,
  medicationId,
  siteEntry,
  requiresSite,
  compact,
}: Props) {
  if (!requiresSite) {
    return compact ? null : (
      <span className="text-xs text-muted-foreground">—</span>
    )
  }

  if (siteEntry) {
    return (
      <Link
        to="/service-users/$serviceUserId/body-map"
        params={{ serviceUserId }}
        className={cn(
          'inline-flex items-center gap-1 rounded-full bg-blue-500/15 px-2 py-0.5 text-xs font-medium text-blue-900 hover:bg-blue-500/25 dark:text-blue-100',
          compact && 'max-w-[140px] truncate',
        )}
        title={`View on body map — ${siteEntry.bodyPart}`}
      >
        <MapPin className="h-3 w-3 shrink-0" />
        {compact ? 'On map' : `On map · ${siteEntry.bodyPart}`}
      </Link>
    )
  }

  return (
    <Link
      to="/service-users/$serviceUserId/body-map"
      params={{ serviceUserId }}
      search={{ linkMedicationId: medicationId }}
      className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-900 hover:bg-amber-500/25 dark:text-amber-100"
    >
      <MapPin className="h-3 w-3 shrink-0" />
      Add site
    </Link>
  )
}
