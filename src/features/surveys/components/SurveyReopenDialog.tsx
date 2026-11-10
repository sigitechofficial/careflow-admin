import * as React from 'react'
import { Button } from '@/shared/ui/button'
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import { SurveyDateTimeField } from '@/features/surveys/components/SurveyDateTimeField'
import { formatSurveyDateTime, isoToSurveyLocal, surveyLocalToIso } from '@/features/surveys/survey-datetime'

/**
 * Reopen a survey whose end date has passed: it needs a new end date in the future, or none —
 * otherwise CareFlow would close it again within a minute. `onReopen` gets the new end date
 * (UTC ISO) or null for no end date. A survey whose answers were deleted under its retention period
 * (all of them, or some) cannot be reopened at all (the API refuses it too): the dialog says so and
 * offers no reopen.
 */
export function SurveyReopenDialog({
  open,
  onOpenChange,
  closesAt,
  pending,
  onReopen,
  answersDeleted = null,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The end date that has passed. */
  closesAt: string | null
  pending: boolean
  onReopen: (closesAt: string | null) => void
  /** Answers deleted under the retention period: ALL (answersDeletedAt) or SOME (answersDeletedBefore). */
  answersDeleted?: 'ALL' | 'SOME' | null
}) {
  const [value, setValue] = React.useState('')
  React.useEffect(() => {
    if (open) setValue('')
  }, [open])
  const nowLocal = isoToSurveyLocal(new Date().toISOString())
  const iso = surveyLocalToIso(value)
  const inPast = Boolean(iso && new Date(iso).getTime() <= Date.now())

  if (answersDeleted) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>This survey cannot be reopened</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <p className="text-sm text-muted-foreground" data-testid="reopen-answers-deleted">
              {answersDeleted === 'ALL'
                ? 'Its answers were deleted under its retention period, so it cannot be reopened.'
                : 'Some of its answers were deleted under its retention period, so it cannot be reopened.'}{' '}
              Duplicate it to run it again.
            </p>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Reopen survey</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-3">
          <p className="text-sm text-muted-foreground" data-testid="reopen-end-date-passed">
            Its end date ({formatSurveyDateTime(closesAt)}) has passed, so it would close again straight away. Choose a
            new end date, or reopen it with no end date.
          </p>
          <SurveyDateTimeField label="New end date" value={value} onChange={setValue} min={nowLocal} defaultTime="17:00" />
          {inPast ? <p className="text-xs text-destructive">The new end date must be in the future.</p> : null}
        </DialogBody>
        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" disabled={pending} onClick={() => onReopen(null)}>
            Reopen with no end date
          </Button>
          <Button type="button" disabled={pending || !iso || inPast} onClick={() => iso && onReopen(iso)}>
            {pending ? 'Reopening…' : 'Reopen with this end date'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
