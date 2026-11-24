import { ArrowDown, ArrowUp, EyeOff, ListChecks } from 'lucide-react'
import { Button } from '@/shared/ui/button'

type Props = {
  /** False = missing fields are hidden; the bar only offers to show them. */
  shown: boolean
  onShow: () => void
  onHide: () => void
  /** Missing fields on the open tab (inline "Required" / "Sign-off required"). */
  tabFieldCount: number
  /** Other items on the open tab that are not a single field (e.g. ADL scores, agreed goals). */
  tabOtherItems: string[]
  /** All submit issues across the assessment (same list as the submit dialog). */
  totalCount: number
  /** Label of the next tab that still has items, e.g. "Tab 23"; null when no other tab has any. */
  nextTabLabel: string | null
  onPrevious: () => void
  onNext: () => void
  onNextTab: () => void
  onReviewAll: () => void
}

/**
 * Bar above the open tab. Hidden state: offers "Show missing fields". Shown (sticky): counts for the tab
 * and Previous / Next missing, so the assessor can step through them. Display/navigation only — it does
 * not change what can be submitted.
 */
export function InitialAssessmentMissingFieldsBar({
  shown,
  onShow,
  onHide,
  tabFieldCount,
  tabOtherItems,
  totalCount,
  nextTabLabel,
  onPrevious,
  onNext,
  onNextTab,
  onReviewAll,
}: Props) {
  const otherCount = tabOtherItems.length
  const tabHasItems = tabFieldCount > 0 || otherCount > 0

  if (!shown) {
    return (
      <div
        className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground"
        role="region"
        aria-label="Missing fields"
        data-testid="ia-missing-fields-bar-hidden"
      >
        <span className="flex items-center gap-2">
          <EyeOff className="h-4 w-4 shrink-0" aria-hidden />
          Missing fields are hidden · {totalCount} to complete before submit
        </span>
        <Button type="button" size="sm" variant="outline" onClick={onShow} data-testid="ia-missing-show">
          Show missing fields
        </Button>
      </div>
    )
  }

  return (
    <div
      className="sticky top-0 z-20 mb-3 flex flex-wrap items-center justify-between gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950 shadow-sm dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100"
      role="region"
      aria-label="Missing fields"
      data-testid="ia-missing-fields-bar"
    >
      <div className="flex min-w-0 items-center gap-2">
        <ListChecks className="h-4 w-4 shrink-0" aria-hidden />
        <p className="min-w-0">
          {tabHasItems ? (
            <>
              <span className="font-semibold" data-testid="ia-missing-fields-tab-count">
                {tabFieldCount} missing field{tabFieldCount === 1 ? '' : 's'} in this tab
              </span>
              {otherCount > 0 ? (
                <span className="ml-1 cursor-help underline decoration-dotted" title={tabOtherItems.join('\n')}>
                  + {otherCount} other item{otherCount === 1 ? '' : 's'}
                </span>
              ) : null}
            </>
          ) : (
            <span className="font-semibold">Nothing missing in this tab</span>
          )}
          <span className="ml-1 text-amber-900/80 dark:text-amber-200/80">· {totalCount} in total</span>
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {tabFieldCount > 0 ? (
          <>
            <Button type="button" size="sm" variant="outline" onClick={onPrevious} data-testid="ia-missing-previous">
              <ArrowUp className="mr-1 h-3.5 w-3.5" aria-hidden />
              Previous
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={onNext} data-testid="ia-missing-next">
              Next missing
              <ArrowDown className="ml-1 h-3.5 w-3.5" aria-hidden />
            </Button>
          </>
        ) : null}
        {nextTabLabel ? (
          <Button type="button" size="sm" variant="outline" onClick={onNextTab} data-testid="ia-missing-next-tab">
            Next tab with missing: {nextTabLabel}
          </Button>
        ) : null}
        <Button type="button" size="sm" variant="ghost" onClick={onReviewAll}>
          View list
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onHide} data-testid="ia-missing-hide">
          Hide
        </Button>
      </div>
    </div>
  )
}
