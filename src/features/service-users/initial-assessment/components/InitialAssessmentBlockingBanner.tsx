import { AlertTriangle, ShieldAlert } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { cn } from '@/shared/lib/utils'
import type { HubTabId } from '@/features/service-users/initial-assessment/components/InitialAssessmentHubTabs'
import type { ValidationIssue } from '@/features/service-users/initial-assessment/utils/submit-validation'

type Props = {
  blocks: ValidationIssue[]
  warnings: ValidationIssue[]
  editable: boolean
  onGoToSection: (sectionNumber: number) => void
  onGoToHubTab?: (tab: HubTabId) => void
  onReviewSubmit?: () => void
}

export function InitialAssessmentBlockingBanner({
  blocks,
  warnings,
  editable,
  onGoToSection,
  onGoToHubTab,
  onReviewSubmit,
}: Props) {
  if (!editable) return null
  if (blocks.length === 0 && warnings.length === 0) return null

  const topBlock = blocks[0]
  const topWarning = warnings[0]

  return (
    <div
      className={cn(
        'flex flex-wrap items-start justify-between gap-3 rounded-md border border-border/80 bg-muted/30 px-3 py-2.5 text-sm',
        blocks.length > 0
          ? 'border-l-4 border-l-destructive pl-2.5'
          : 'border-l-4 border-l-amber-500 pl-2.5',
      )}
      data-testid="ia-blocking-banner"
    >
        <div className="flex min-w-0 items-start gap-2">
          {blocks.length > 0 ? (
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          ) : (
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          )}
          <div className="min-w-0 space-y-1">
            {blocks.length > 0 ? (
              <>
                <p className="font-semibold">
                  {blocks.length} blocking issue{blocks.length > 1 ? 's' : ''} — fix before submit
                </p>
                <p className="text-xs opacity-90">{topBlock?.message}</p>
              </>
            ) : (
              <>
                <p className="font-semibold">
                  {warnings.length} warning{warnings.length > 1 ? 's' : ''} before submit
                </p>
                <p className="text-xs opacity-90">{topWarning?.message}</p>
              </>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {blocks.length > 0 && topBlock != null ? (
            topBlock.hubTab && onGoToHubTab ? (
              <Button type="button" size="sm" variant="outline" onClick={() => onGoToHubTab(topBlock.hubTab!)}>
                Open Waterlow tab
              </Button>
            ) : (
              <Button type="button" size="sm" variant="outline" onClick={() => onGoToSection(topBlock.sectionNumber)}>
                Go to section {topBlock.sectionNumber}
              </Button>
            )
          ) : topWarning != null ? (
            topWarning.hubTab && onGoToHubTab ? (
              <Button type="button" size="sm" variant="outline" onClick={() => onGoToHubTab(topWarning.hubTab!)}>
                Open Waterlow tab
              </Button>
            ) : (
              <Button type="button" size="sm" variant="outline" onClick={() => onGoToSection(topWarning.sectionNumber)}>
                Go to section {topWarning.sectionNumber}
              </Button>
            )
          ) : null}
          {onReviewSubmit ? (
            <Button type="button" size="sm" variant="ghost" onClick={onReviewSubmit}>
              Review all
            </Button>
          ) : null}
        </div>
    </div>
  )
}
