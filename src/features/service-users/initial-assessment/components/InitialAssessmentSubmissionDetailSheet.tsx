import * as React from 'react'
import { Button } from '@/shared/ui/button'
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/shared/ui/sheet'
import { cn } from '@/shared/lib/utils'
import { InitialAssessmentStatusBadge } from '@/features/service-users/initial-assessment/components/InitialAssessmentStatusBadge'
import {
  parseSubmissionMetadata,
} from '@/features/service-users/initial-assessment/utils/submission-metadata'
import {
  formatInitialAssessmentDateTime,
  formatInitialAssessmentUser,
  formatRichTextForDisplay,
} from '@/features/service-users/initial-assessment/utils/submission-display'
import { computeWaterlowScore } from '@/features/service-users/initial-assessment/utils/waterlow-scoring'
import type { InitialAssessmentSubmission } from '@/features/service-users/initial-assessment/types'

function DetailRow({
  label,
  value,
  mono,
}: {
  label: string
  value: React.ReactNode
  mono?: boolean
}) {
  return (
    <div className="grid grid-cols-[minmax(0,7.5rem)_1fr] gap-x-3 gap-y-0.5 border-b border-border/60 py-2.5 text-sm last:border-b-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn('min-w-0 break-words text-foreground', mono && 'font-mono text-xs')}>{value}</dd>
    </div>
  )
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  submission: InitialAssessmentSubmission | null
  sequence?: number
  activeId: string | null
  onOpenInForm?: (id: string) => void
}

export function InitialAssessmentSubmissionDetailSheet({
  open,
  onOpenChange,
  submission,
  sequence,
  activeId,
  onOpenInForm,
}: Props) {
  const meta = React.useMemo(() => parseSubmissionMetadata(submission), [submission])
  const raw = meta.raw
  const managerReviewRequired = meta.managerReviewRequired
  const approvedForCareStart = raw.approvedForCareStart === true
  const careStartConditions =
    typeof raw.careStartConditions === 'string' && raw.careStartConditions.trim()
      ? raw.careStartConditions.trim()
      : null
  const reopenedAt = typeof raw.reopenedAt === 'string' ? raw.reopenedAt : null
  const lastReopenReason =
    typeof raw.lastReopenReason === 'string' && raw.lastReopenReason.trim()
      ? raw.lastReopenReason.trim()
      : null
  const correctionRequired = raw.correctionRequired === true
  const waterlowScore = computeWaterlowScore(meta.waterlow)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" size="lg" className="flex w-full flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle>
            {sequence != null ? `Assessment #${sequence}` : 'Assessment details'}
          </SheetTitle>
          <SheetDescription>
            {submission?.template?.name ?? 'Initial assessment'}
            {submission?.template?.version != null ? ` · v${submission.template.version}` : ''}
          </SheetDescription>
        </SheetHeader>

        <SheetBody className="space-y-6">
          {!submission ? (
            <p className="text-sm text-muted-foreground">No assessment selected.</p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <InitialAssessmentStatusBadge
                  status={submission.status}
                  managerReviewRequired={managerReviewRequired}
                />
                {activeId === submission.id ? (
                  <span className="rounded-md bg-teal-100 px-2 py-0.5 text-xs font-medium text-teal-900 dark:bg-teal-950 dark:text-teal-200">
                    Open in form
                  </span>
                ) : null}
                {correctionRequired ? (
                  <span className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-950 dark:text-amber-200">
                    Correction required
                  </span>
                ) : null}
              </div>

              <section>
                <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Record
                </h4>
                <dl>
                  <DetailRow label="Submission ID" value={submission.id} mono />
                  <DetailRow
                    label="Form template"
                    value={
                      <>
                        {submission.template?.name ?? '—'}
                        {submission.template?.version != null ? ` (v${submission.template.version})` : ''}
                      </>
                    }
                  />
                </dl>
              </section>

              <section>
                <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Timeline
                </h4>
                <dl>
                  <DetailRow
                    label="Created"
                    value={
                      <>
                        {formatInitialAssessmentDateTime(submission.createdAt)}
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          by {formatInitialAssessmentUser(submission.createdBy)}
                        </span>
                      </>
                    }
                  />
                  <DetailRow
                    label="Last updated"
                    value={
                      <>
                        {formatInitialAssessmentDateTime(submission.updatedAt)}
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          by {formatInitialAssessmentUser(submission.updatedBy)}
                        </span>
                      </>
                    }
                  />
                  <DetailRow
                    label="Started"
                    value={formatInitialAssessmentDateTime(submission.startedAt)}
                  />
                  <DetailRow
                    label="Completed"
                    value={formatInitialAssessmentDateTime(submission.completedAt)}
                  />
                  <DetailRow
                    label="Submitted"
                    value={
                      <>
                        {formatInitialAssessmentDateTime(submission.submittedAt)}
                        {submission.submittedAt ? (
                          <span className="mt-0.5 block text-xs text-muted-foreground">
                            by {formatInitialAssessmentUser(submission.submittedBy)}
                          </span>
                        ) : null}
                      </>
                    }
                  />
                  <DetailRow
                    label="Reviewed"
                    value={
                      <>
                        {formatInitialAssessmentDateTime(submission.reviewedAt)}
                        {submission.reviewedAt ? (
                          <span className="mt-0.5 block text-xs text-muted-foreground">
                            by {formatInitialAssessmentUser(submission.reviewedBy)}
                          </span>
                        ) : null}
                      </>
                    }
                  />
                  {reopenedAt ? (
                    <DetailRow
                      label="Reopened"
                      value={
                        <>
                          {formatInitialAssessmentDateTime(reopenedAt)}
                          {lastReopenReason ? (
                            <span className="mt-1 block text-xs text-muted-foreground">
                              Reason: {formatRichTextForDisplay(lastReopenReason)}
                            </span>
                          ) : null}
                        </>
                      }
                    />
                  ) : null}
                </dl>
              </section>

              {(submission.reviewNotes?.trim() ||
                submission.overallNotes?.trim() ||
                approvedForCareStart ||
                careStartConditions ||
                waterlowScore > 0) && (
                <section>
                  <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Review &amp; notes
                  </h4>
                  <dl>
                    {waterlowScore > 0 ? (
                      <DetailRow label="Waterlow score" value={String(waterlowScore)} />
                    ) : null}
                    {submission.status === 'REVIEWED' || approvedForCareStart ? (
                      <DetailRow
                        label="Care start approved"
                        value={approvedForCareStart ? 'Yes' : 'No'}
                      />
                    ) : null}
                    {careStartConditions ? (
                      <DetailRow
                        label="Care start conditions"
                        value={formatRichTextForDisplay(careStartConditions)}
                      />
                    ) : null}
                    {submission.reviewNotes?.trim() ? (
                      <DetailRow
                        label="Review notes"
                        value={formatRichTextForDisplay(submission.reviewNotes)}
                      />
                    ) : null}
                    {submission.overallNotes?.trim() ? (
                      <DetailRow
                        label="Overall notes"
                        value={formatRichTextForDisplay(submission.overallNotes)}
                      />
                    ) : null}
                  </dl>
                </section>
              )}
            </>
          )}
        </SheetBody>

        {submission && onOpenInForm ? (
          <SheetFooter className="flex-col gap-2 sm:flex-col">
            <Button
              type="button"
              className="w-full"
              onClick={() => {
                onOpenInForm(submission.id)
                onOpenChange(false)
              }}
            >
              Open in form
            </Button>
            <Button type="button" variant="outline" className="w-full" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </SheetFooter>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
