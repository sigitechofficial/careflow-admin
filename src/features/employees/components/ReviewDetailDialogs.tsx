import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { History, Loader2 } from 'lucide-react'
import {
  fetchEmployeeReviewHistory,
  type EmployeeReviewHistory,
  type EmployeeReviewRow,
} from '@/features/employees/api/employee-reviews-api'
import { useDeleteEmployeeReview } from '@/features/employees/hooks/useEmployeeReviews'
import { ReviewStatusBadge } from '@/features/employees/components/ReviewStatusBadge'
import type { ReviewTypeOption } from '@/features/employees/components/RecordReviewDialog'
import { personName } from '@/features/supervision/api'
import { resolveMediaUrl } from '@/shared/lib/media-url'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { formatDate, formatDateTime } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import { DictationProvider } from '@/shared/ui/dictation'
import { Textarea } from '@/shared/ui/form-field'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'

const ACTION_LABELS: Record<string, string> = {
  employee_review_added: 'Recorded',
  employee_review_updated: 'Changed',
  employee_review_deleted: 'Removed',
}

const FIELD_LABELS: Record<string, string> = {
  reviewTypeId: 'Review type',
  lastDone: 'Last done',
  nextDue: 'Next due',
  notes: 'Notes',
  documentUrl: 'Document',
  reviewedById: 'Reviewed by',
}


/** A changed value in words: dates as dates, ids as names where known, long text shortened. */
function describeValue(field: string, value: unknown, typeName: (id: string) => string | undefined): string {
  if (value === null || value === undefined || value === '') return 'none'
  if (field === 'lastDone' || field === 'nextDue') return typeof value === 'string' ? formatDate(value) : String(value)
  if (field === 'reviewTypeId' && typeof value === 'string') return typeName(value) ?? 'another type'
  if (field === 'documentUrl') return 'a document'
  if (field === 'reviewedById') return 'set'
  const text = String(value)
  return text.length > 80 ? `${text.slice(0, 80)}…` : text
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  )
}

function HistoryList({ history, typeName }: { history: EmployeeReviewHistory; typeName: (id: string) => string | undefined }) {
  if (!history.events.length) {
    return <p className="text-sm text-muted-foreground">No changes recorded.</p>
  }
  return (
    <ol className="space-y-3" data-testid="review-history">
      {history.events.map(e => (
        <li key={e.id} className="border-l-2 border-border pl-3">
          <p className="text-sm">
            <span className="font-medium">{ACTION_LABELS[e.action] ?? e.action}</span>
            <span className="text-muted-foreground"> by {e.by ? personName(e.by) : 'the system'} · {formatDateTime(e.at)}</span>
          </p>
          {e.reason ? <p className="text-sm">Reason: {e.reason}</p> : null}
          {e.action !== 'employee_review_added' && e.changes.length ? (
            <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
              {e.changes.map(c => (
                <li key={c.field}>
                  {FIELD_LABELS[c.field] ?? c.field}: {describeValue(c.field, c.from, typeName)} →{' '}
                  {describeValue(c.field, c.to, typeName)}
                </li>
              ))}
            </ul>
          ) : null}
        </li>
      ))}
    </ol>
  )
}

/** Everything about one review record, its change history and the sessions held for it. */
export function ViewReviewDialog({
  review,
  employeeId,
  reviewTypes,
  onClose,
  onEdit,
}: {
  review: EmployeeReviewRow | null
  employeeId: string
  reviewTypes: ReviewTypeOption[]
  onClose: () => void
  onEdit?: (review: EmployeeReviewRow) => void
}) {
  const history = useQuery({
    queryKey: ['employee-review-history', employeeId, review?.id],
    queryFn: () => fetchEmployeeReviewHistory(employeeId, review!.id),
    enabled: Boolean(review),
  })
  const typeName = (id: string) => reviewTypes.find(t => t.id === id)?.name
  const docHref = resolveMediaUrl(review?.documentUrl ?? null)

  return (
    <Dialog open={Boolean(review)} onOpenChange={open => (open ? null : onClose())}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{review?.reviewType?.name ?? 'Review'}</DialogTitle>
          <DialogDescription>Recorded review, its history and the supervision sessions held for it.</DialogDescription>
        </DialogHeader>
        {review ? (
          <DialogBody className="space-y-5">
            <dl className="grid gap-3 sm:grid-cols-3">
              <Detail label="Status">
                <ReviewStatusBadge status={review.status} />
              </Detail>
              <Detail label="Last done">{formatDate(review.lastDone)}</Detail>
              <Detail label="Next due">{formatDate(review.nextDue)}</Detail>
              <Detail label="Reviewed by">{review.reviewedBy ? personName(review.reviewedBy) : 'Not recorded'}</Detail>
              <Detail label="Document">
                {docHref ? (
                  <a href={docHref} target="_blank" rel="noreferrer" className="text-primary underline-offset-2 hover:underline">
                    Open
                  </a>
                ) : (
                  'None'
                )}
              </Detail>
              <Detail label="Last changed">{review.updatedAt ? formatDateTime(review.updatedAt) : '—'}</Detail>
            </dl>
            <div>
              <p className="text-xs text-muted-foreground">Notes</p>
              <p className="whitespace-pre-wrap rounded-md bg-muted/30 px-3 py-2 text-sm">{review.notes || '—'}</p>
            </div>

            <section className="space-y-2">
              <h3 className="text-sm font-semibold">Supervision sessions held in CareFlow</h3>
              {history.isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : history.data?.sessions.length ? (
                <ul className="space-y-1 text-sm">
                  {history.data.sessions.map(s => (
                    <li key={s.id}>
                      <Link
                        to="/supervision/sessions/$sessionId"
                        params={{ sessionId: s.id }}
                        className="font-medium text-primary underline-offset-2 hover:underline"
                      >
                        {formatDate(s.heldAt ?? s.completedAt)}
                      </Link>
                      <span className="text-muted-foreground"> with {s.supervisor ? personName(s.supervisor) : '—'}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">None: this review was recorded on the staff record.</p>
              )}
            </section>

            <section className="space-y-2">
              <h3 className="flex items-center gap-1 text-sm font-semibold">
                <History className="h-4 w-4" />
                History
              </h3>
              {history.isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : history.data ? (
                <HistoryList history={history.data} typeName={typeName} />
              ) : (
                <p className="text-sm text-destructive">Could not load the history.</p>
              )}
            </section>
          </DialogBody>
        ) : null}
        <DialogFooter>
          {review && onEdit ? (
            <Button type="button" variant="outline" onClick={() => onEdit(review)}>
              Edit
            </Button>
          ) : null}
          <Button type="button" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Removing a review is a change to a compliance record, so it asks why (kept in the history). */
export function RemoveReviewDialog({
  review,
  employeeId,
  onClose,
}: {
  review: EmployeeReviewRow | null
  employeeId: string
  onClose: () => void
}) {
  const remove = useDeleteEmployeeReview(employeeId)
  const [reason, setReason] = React.useState('')
  React.useEffect(() => setReason(''), [review])
  const ok = reason.trim().length >= 3

  const onRemove = () =>
    review &&
    remove.mutate(
      { reviewId: review.id, reason: reason.trim() },
      {
        onSuccess: () => {
          toastSuccess('Review removed', 'Its due date goes back to the schedule.')
          onClose()
        },
        onError: e => toastApiError(e, 'Could not remove the review'),
      },
    )

  return (
    <Dialog open={Boolean(review)} onOpenChange={open => (open ? null : onClose())}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Remove {review?.reviewType?.name ?? 'review'}?</DialogTitle>
          <DialogDescription>
            The record is kept in the history with your name and reason. Its due date goes back to the schedule.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <label className="block space-y-1 text-sm">
            <span className="text-xs font-medium text-muted-foreground">Why is it being removed?</span>
            <DictationProvider>
              <Textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                rows={2}
                maxLength={500}
                placeholder="e.g. recorded against the wrong carer"
                aria-label="Reason"
              />
            </DictationProvider>
          </label>
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" onClick={onRemove} disabled={!ok || remove.isPending}>
            {remove.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
            Remove
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
