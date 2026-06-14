import { Link } from '@tanstack/react-router'
import { ExternalLink, RefreshCw } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { initialAssessmentBodyMapSearch } from '@/features/service-users/initial-assessment/utils/body-map-navigation'
import { IA_CALLOUT_TEAL_CLASS, IA_HINT_CLASS } from '@/features/service-users/initial-assessment/utils/form-typography'
import { cn } from '@/shared/lib/utils'

type Props = {
  serviceUserId: string
  submissionId?: string | null
  disabled?: boolean
  onSyncBodyMap?: () => void
  syncBodyMapLoading?: boolean
  onOpenSkinIntegrityCheckTab?: () => void
  onOpenWaterlowTab?: () => void
  /** Inline hint under a single Yes gate; omit for panel-level callout. */
  hint?: string
  variant?: 'inline' | 'callout'
}

export function InitialAssessmentBodyMapObservationLinks({
  serviceUserId,
  submissionId,
  disabled,
  onSyncBodyMap,
  syncBodyMapLoading = false,
  onOpenSkinIntegrityCheckTab,
  onOpenWaterlowTab,
  hint = 'Record wound location, skin changes, and observations on the body map. Complete the Total Skin Integrity Check worksheet when required.',
  variant = 'inline',
}: Props) {
  const buttons = (
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="outline" size="sm" asChild>
        <Link
          to="/service-users/$serviceUserId/body-map"
          params={{ serviceUserId }}
          search={initialAssessmentBodyMapSearch(submissionId)}
        >
          <ExternalLink className="mr-2 h-4 w-4" aria-hidden />
          Open body map
        </Link>
      </Button>
      {onSyncBodyMap ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || syncBodyMapLoading}
          onClick={onSyncBodyMap}
        >
          <RefreshCw
            className={cn('mr-2 h-4 w-4', syncBodyMapLoading && 'animate-spin')}
            aria-hidden
          />
          Sync from body map
        </Button>
      ) : null}
      {onOpenSkinIntegrityCheckTab ? (
        <Button type="button" variant="outline" size="sm" onClick={onOpenSkinIntegrityCheckTab}>
          Total skin integrity check
        </Button>
      ) : null}
      {onOpenWaterlowTab ? (
        <Button type="button" variant="outline" size="sm" onClick={onOpenWaterlowTab}>
          Open Waterlow tab
        </Button>
      ) : null}
    </div>
  )

  if (variant === 'callout') {
    return (
      <div className={cn(IA_CALLOUT_TEAL_CLASS, 'text-sm')} data-testid="ia-body-map-observation-callout">
        <p className="font-medium text-teal-950 dark:text-teal-100">Body map observations required</p>
        {hint ? <p className={cn('mt-1', IA_HINT_CLASS)}>{hint}</p> : null}
        <div className="mt-3">{buttons}</div>
      </div>
    )
  }

  return (
    <div
      className="rounded-lg border border-teal-200/80 bg-teal-50/50 px-3 py-2.5 dark:border-teal-900 dark:bg-teal-950/30"
      data-testid="ia-body-map-observation-inline"
    >
      {hint ? <p className={cn('mb-2 text-xs', IA_HINT_CLASS)}>{hint}</p> : null}
      {buttons}
    </div>
  )
}
