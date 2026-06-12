import { FileCode2, FileDown, Loader2, MapPinned } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { Button } from '@/shared/ui/button'
import { Label } from '@/shared/ui/form-field'
import { InitialAssessmentTextarea as Textarea } from '@/features/service-users/initial-assessment/components/InitialAssessmentTextarea'
import { cn } from '@/shared/lib/utils'
import type { InitialAssessmentSubmission } from '@/features/service-users/initial-assessment/types'
import { parseSubmissionMetadata } from '@/features/service-users/initial-assessment/utils/submission-metadata'
import { formatRichTextForDisplay } from '@/features/service-users/initial-assessment/utils/submission-display'

type Props = {
  serviceUserId?: string
  submission: InitialAssessmentSubmission | null | undefined
  reviewNotes: string
  onReviewNotesChange: (v: string) => void
  approvedForCareStart: boolean
  onApprovedForCareStartChange: (v: boolean) => void
  careStartConditions: string
  onCareStartConditionsChange: (v: string) => void
  canReview: boolean
  canReopen: boolean
  reviewing?: boolean
  onApprove: () => void
  onArchive: () => void
  onReopen: () => void
  canExport?: boolean
  onExportHtml?: () => void
  onExportPdf?: () => void
}

export function InitialAssessmentManagerReviewPanel({
  serviceUserId,
  submission,
  reviewNotes,
  onReviewNotesChange,
  approvedForCareStart,
  onApprovedForCareStartChange,
  careStartConditions,
  onCareStartConditionsChange,
  canReview,
  canReopen,
  reviewing,
  onApprove,
  onArchive,
  onReopen,
  canExport = false,
  onExportHtml,
  onExportPdf,
}: Props) {
  if (!submission) {
    return (
      <p className="rounded-lg border border-dashed px-6 py-10 text-center text-sm text-muted-foreground">
        Select a submission to review.
      </p>
    )
  }

  const status = submission.status
  const { managerReviewRequired, approvedForCareStart: savedApproval, careStartConditions: savedConditions } =
    parseSubmissionMetadata(submission)

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold">Manager review</h3>
          {managerReviewRequired ? (
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-xs font-semibold',
                'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200',
              )}
            >
              Manager review required
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Status: <strong>{status.replace('_', ' ')}</strong>
          {submission.submittedAt ? (
            <> · Submitted {new Date(submission.submittedAt).toLocaleString()}</>
          ) : null}
        </p>

        {status === 'SUBMITTED' && canReview ? (
          <div className="mt-4 space-y-3">
            <div>
              <Label htmlFor="ia-review-notes">Review notes</Label>
              <Textarea
                id="ia-review-notes"
                rows={4}
                className="mt-1"
                value={reviewNotes}
                onChange={(e) => onReviewNotesChange(e.target.value)}
                placeholder="Sign-off comments, actions required, or return reasons…"
              />
            </div>
            <div className="rounded-lg border border-teal-200 bg-teal-50/50 p-3 dark:border-teal-900 dark:bg-teal-950/30">
              <label className="flex cursor-pointer items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={approvedForCareStart}
                  onChange={(e) => onApprovedForCareStartChange(e.target.checked)}
                />
                <span>
                  <span className="font-medium">Approve care package activation</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    Required before domiciliary care visits can be activated for this service user.
                  </span>
                </span>
              </label>
              {approvedForCareStart ? (
                <div className="mt-3">
                  <Label htmlFor="ia-care-conditions" className="text-xs">
                    Conditions (optional)
                  </Label>
                  <Textarea
                    id="ia-care-conditions"
                    rows={2}
                    className="mt-1"
                    value={careStartConditions}
                    onChange={(e) => onCareStartConditionsChange(e.target.value)}
                    placeholder="e.g. Double-up visits for first 2 weeks, equipment delivery pending…"
                  />
                </div>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={onApprove} disabled={reviewing}>
                {reviewing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Mark reviewed
              </Button>
              <Button type="button" variant="outline" onClick={onArchive} disabled={reviewing}>
                Archive
              </Button>
            </div>
          </div>
        ) : null}

        {status === 'REVIEWED' ? (
          <div className="mt-4 space-y-2 text-sm">
            {submission.reviewNotes ? (
              <p>
                <span className="font-medium">Review notes:</span>{' '}
                {formatRichTextForDisplay(submission.reviewNotes)}
              </p>
            ) : null}
            <p>
              <span className="font-medium">Approved for care start:</span>{' '}
              {savedApproval ? 'Yes' : 'No'}
            </p>
            {savedConditions ? (
              <p className="text-muted-foreground">
                <span className="font-medium text-foreground">Conditions:</span>{' '}
                {formatRichTextForDisplay(savedConditions)}
              </p>
            ) : null}
            {submission.reviewedAt ? (
              <p className="text-muted-foreground">
                Reviewed {new Date(submission.reviewedAt).toLocaleString()}
              </p>
            ) : null}
            {savedApproval && serviceUserId ? (
              <div className="mt-3 rounded-lg border border-teal-200 bg-teal-50/50 p-3 dark:border-teal-900 dark:bg-teal-950/30">
                <p className="text-xs text-muted-foreground">
                  Care package approved — configure the authorised visit pattern and activate when ready.
                </p>
                <Link
                  to="/service-users/$serviceUserId/visit-plan"
                  params={{ serviceUserId }}
                  className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-teal-900 underline-offset-2 hover:underline dark:text-teal-100"
                >
                  <MapPinned className="h-4 w-4" aria-hidden />
                  Open Visit Plan
                </Link>
              </div>
            ) : null}
            {canReopen ? (
              <Button type="button" variant="outline" size="sm" className="mt-2" onClick={onReopen}>
                Reopen for edits
              </Button>
            ) : null}
          </div>
        ) : null}

        {status !== 'SUBMITTED' && status !== 'REVIEWED' ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Manager review is available after the assessment is submitted.
          </p>
        ) : null}
      </div>

      {canExport && onExportHtml && onExportPdf ? (
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <h3 className="text-sm font-semibold">Export full assessment</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Download the complete assessment with all answered questions, clinical summaries, risks, actions,
            sign-off, and manager review. HTML can be opened in a browser or archived; PDF is print-ready.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" onClick={onExportHtml}>
              <FileCode2 className="mr-2 h-4 w-4" />
              Preview HTML
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={onExportPdf}>
              <FileDown className="mr-2 h-4 w-4" />
              Export PDF
            </Button>
          </div>
        </div>
      ) : null}

      <div className="rounded-lg border border-border bg-muted/30 p-4 text-xs text-muted-foreground">
        <p className="font-semibold text-foreground">Workflow</p>
        <p className="mt-1">
          Draft → In progress → Submitted → Reviewed (with care start approval) → Care package activation.
          Reopen returns a reviewed submission to In progress.
        </p>
      </div>
    </div>
  )
}
