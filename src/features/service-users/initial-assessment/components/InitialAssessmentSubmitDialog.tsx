import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { Button } from '@/shared/ui/button'
import { cn } from '@/shared/lib/utils'
import type { HubTabId } from '@/features/service-users/initial-assessment/components/InitialAssessmentHubTabs'
import type { ValidationIssue } from '@/features/service-users/initial-assessment/utils/submit-validation'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  blocks: ValidationIssue[]
  warnings: ValidationIssue[]
  canSubmit: boolean
  submitting?: boolean
  validating?: boolean
  flaggedRiskCount?: number
  carePlanTriggerCount?: number
  openActionsCount?: number
  onGoToSection: (sectionNumber: number) => void
  onGoToHubTab?: (tab: HubTabId) => void
  onConfirm: () => void
}

export function InitialAssessmentSubmitDialog({
  open,
  onOpenChange,
  blocks,
  warnings,
  canSubmit,
  submitting,
  validating,
  flaggedRiskCount,
  carePlanTriggerCount,
  openActionsCount,
  onGoToSection,
  onGoToHubTab,
  onConfirm,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="xl">
        <DialogHeader>
          <DialogTitle>Submit for manager review</DialogTitle>
        </DialogHeader>
        <DialogBody className="max-h-[72vh] space-y-4 overflow-y-auto pe-1">
          {validating ? (
            <p className="text-sm text-muted-foreground">Checking submission rules…</p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {blocks.length ? (
              <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-900">
                {blocks.length} blocking
              </span>
            ) : (
              <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-900">
                No blocking issues
              </span>
            )}
            {warnings.length ? (
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-900">
                {warnings.length} warning{warnings.length > 1 ? 's' : ''}
              </span>
            ) : null}
          </div>

          {(flaggedRiskCount != null || carePlanTriggerCount != null || openActionsCount != null) && !validating ? (
            <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">On submit</p>
              <ul className="mt-1 list-inside list-disc space-y-0.5">
                {flaggedRiskCount != null && flaggedRiskCount > 0 ? (
                  <li>{flaggedRiskCount} flagged risk{flaggedRiskCount > 1 ? 's' : ''} will sync to the risk matrix</li>
                ) : null}
                {carePlanTriggerCount != null && carePlanTriggerCount > 0 ? (
                  <li>{carePlanTriggerCount} care plan trigger{carePlanTriggerCount > 1 ? 's' : ''} identified</li>
                ) : null}
                {openActionsCount != null && openActionsCount > 0 ? (
                  <li>{openActionsCount} open action{openActionsCount > 1 ? 's' : ''} on the register</li>
                ) : null}
                {(flaggedRiskCount ?? 0) === 0 && (carePlanTriggerCount ?? 0) === 0 && (openActionsCount ?? 0) === 0 ? (
                  <li>Action register and risk matrix will be auto-generated from flagged answers</li>
                ) : null}
              </ul>
            </div>
          ) : null}

          {blocks.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-red-800">Must fix before submit</p>
              <ul className="grid grid-cols-1 gap-2 md:grid-cols-3">
                {blocks.map((b, i) => (
                  <li
                    key={`${b.sectionNumber}-${i}`}
                    className="flex flex-col rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900"
                  >
                    <span className="leading-snug">{b.message}</span>
                    {b.hubTab && onGoToHubTab ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="mt-3 w-fit bg-white/80"
                        onClick={() => onGoToHubTab(b.hubTab!)}
                      >
                        Open Waterlow
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="mt-3 w-fit bg-white/80"
                        onClick={() => onGoToSection(b.sectionNumber)}
                      >
                        Go to section
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {warnings.length > 0 ? (
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Warnings (can still submit)</p>
              {warnings.map((w, i) => (
                <p key={`${w.sectionNumber}-${i}`} className={cn('text-sm text-amber-800')}>
                  {w.message}
                </p>
              ))}
            </div>
          ) : null}

          {!blocks.length && !warnings.length ? (
            <p className="text-sm text-emerald-800">
              All required checks passed. Submitting will lock answers until manager review completes or the
              assessment is reopened.
            </p>
          ) : null}
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Back to assessment
          </Button>
          <Button type="button" disabled={!canSubmit || submitting || validating} onClick={onConfirm}>
            Submit for manager review
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
