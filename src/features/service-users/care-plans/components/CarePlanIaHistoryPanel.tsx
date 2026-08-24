import * as React from 'react'
import { Button } from '@/shared/ui/button'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/ui/dialog'
import type { CarePlanFieldSuggestion, CarePlanPreviousAssessment } from '@/features/service-users/care-plans/types'
import { formatSuggestionSourceDate } from '@/features/service-users/care-plans/care-plan-suggestion-state'

export function CarePlanIaHistoryPanel({
  currentSubmittedAt,
  currentStatus,
  previousAssessments,
  disabled,
  onUseHistorical,
}: {
  currentSubmittedAt?: string | null
  currentStatus?: 'SUBMITTED' | 'REVIEWED' | null
  previousAssessments: CarePlanPreviousAssessment[]
  disabled?: boolean
  onUseHistorical: (suggestion: CarePlanFieldSuggestion) => void
}) {
  const [open, setOpen] = React.useState(false)
  if (previousAssessments.length === 0) return null

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        View previous assessments
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Previous assessments</AlertDialogTitle>
            <AlertDialogDescription>
              Latest eligible Initial Assessment remains the default source. Historical values are never
              merged automatically.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 text-sm">
            <div className="rounded-md bg-muted/40 px-3 py-2">
              <p className="font-medium text-foreground">
                Current — {formatSuggestionSourceDate(currentSubmittedAt) ?? 'Latest eligible IA'}
              </p>
              <p className="text-xs text-muted-foreground">
                {currentStatus === 'SUBMITTED' ? 'Submitted · Awaiting manager review' : currentStatus ?? 'Eligible'}
              </p>
            </div>
            {previousAssessments.map((assessment) => (
              <div key={assessment.submissionId} className="rounded-md border border-border px-3 py-2">
                <p className="font-medium text-foreground">
                  Previous — {formatSuggestionSourceDate(assessment.submittedAt) ?? 'Unknown date'}
                </p>
                <p className="text-xs text-muted-foreground">{assessment.status}</p>
                {assessment.suggestions.length === 0 ? (
                  <p className="mt-2 text-muted-foreground">No Falls field values on this assessment.</p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {assessment.suggestions.map((item) => (
                      <li key={item.id} className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-foreground">{item.targetLabel}</p>
                          <p className="text-muted-foreground">{item.displayText}</p>
                        </div>
                        {disabled || item.kind !== 'value' || item.suggestedValue == null ? null : (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              onUseHistorical(item)
                              setOpen(false)
                            }}
                          >
                            Use this value
                          </Button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
