import * as React from 'react'
import { CalendarCheck, Plus } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Input } from '@/shared/ui/input'
import { useAuthStore } from '@/features/auth/store'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { useAddPathwayReview } from '@/features/specialist-pathways/hooks/useSpecialistPathways'
import {
  REVIEW_OUTCOME_LABELS,
  REVIEW_OUTCOME_OPTIONS,
  fmtDate,
} from '@/features/specialist-pathways/pathway-labels'
import type { PathwayCase, ReviewOutcome } from '@/features/specialist-pathways/types/specialist-pathway.types'

const today = () => new Date().toISOString().slice(0, 10)
const inMonths = (n: number) => {
  const d = new Date()
  d.setMonth(d.getMonth() + n)
  return d.toISOString().slice(0, 10)
}

const OUTCOME_CLASS: Record<ReviewOutcome, string> = {
  NO_CHANGE: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  PLAN_UPDATE_NEEDED: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  ESCALATED: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
  CASE_CLOSED: 'bg-muted text-muted-foreground',
}

export function PathwayReviewsPanel({ caseData }: { caseData: PathwayCase }) {
  const closed = caseData.status === 'CLOSED'
  const canManage = useAuthStore(s => s.can)('specialist_pathways.manage') && !closed
  const add = useAddPathwayReview(caseData.id)
  const [open, setOpen] = React.useState(false)
  const [reviewedAt, setReviewedAt] = React.useState(today())
  const [outcome, setOutcome] = React.useState<ReviewOutcome>('NO_CHANGE')
  const [notes, setNotes] = React.useState('')
  const [nextReviewDate, setNextReviewDate] = React.useState(inMonths(3))
  const closing = outcome === 'CASE_CLOSED'

  const submit = () => {
    if (closing && !notes.trim()) {
      toastApiError(null, 'Add a note explaining why the case is closing')
      return
    }
    add.mutate(
      {
        reviewedAt,
        outcome,
        notes: notes.trim() || undefined,
        nextReviewDate: closing ? undefined : nextReviewDate || undefined,
      },
      {
        onSuccess: () => {
          toastSuccess(closing ? 'Review recorded and case closed' : 'Review recorded')
          setOpen(false)
          setNotes('')
          setOutcome('NO_CHANGE')
        },
        onError: e => toastApiError(e, 'Could not record review'),
      },
    )
  }

  return (
    <div className="flex flex-col gap-4" data-testid="pathway-reviews-panel">
      <Card className={caseData.reviewOverdue ? 'border-red-300 dark:border-red-900' : undefined}>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4 text-sm">
          <div className="flex items-center gap-3">
            <CalendarCheck
              className={`h-5 w-5 ${caseData.reviewOverdue ? 'text-red-600' : 'text-muted-foreground'}`}
              aria-hidden
            />
            <div>
              <p className="font-medium">Next review: {fmtDate(caseData.reviewDueDate)}</p>
              {caseData.reviewOverdue && (
                <p className="text-xs font-semibold text-red-600">Overdue — record a review</p>
              )}
            </div>
          </div>
          {canManage && !open && (
            <Button onClick={() => setOpen(true)}>
              <Plus className="mr-2 h-4 w-4" aria-hidden />
              Record review
            </Button>
          )}
        </CardContent>
      </Card>

      {open && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Record review</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">Review date</span>
              <Input type="date" value={reviewedAt} onChange={e => setReviewedAt(e.target.value)} />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">Outcome</span>
              <select
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                value={outcome}
                onChange={e => setOutcome(e.target.value as ReviewOutcome)}
              >
                {REVIEW_OUTCOME_OPTIONS.map(o => (
                  <option key={o} value={o}>
                    {REVIEW_OUTCOME_LABELS[o]}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm sm:col-span-2">
              <span className="font-medium">Notes {closing && '(required)'}</span>
              <textarea
                className="min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="What was discussed, what changed, who attended"
              />
            </label>
            {!closing && (
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium">Next review date</span>
                <Input type="date" value={nextReviewDate} onChange={e => setNextReviewDate(e.target.value)} />
              </label>
            )}
            <div className="flex items-end gap-2 sm:col-span-2">
              <Button onClick={submit} disabled={add.isPending}>
                {add.isPending ? 'Saving…' : closing ? 'Record & close case' : 'Record review'}
              </Button>
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Review history</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          {caseData.reviews.length === 0 ? (
            <p className="text-muted-foreground">No reviews recorded yet.</p>
          ) : (
            caseData.reviews.map(r => (
              <div key={r.id} className="flex flex-col gap-1 border-b border-border pb-3 last:border-0 last:pb-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">
                    {fmtDate(r.reviewedAt)}
                    {r.reviewedByName && <span className="font-normal text-muted-foreground"> · {r.reviewedByName}</span>}
                  </p>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${OUTCOME_CLASS[r.outcome]}`}>
                    {REVIEW_OUTCOME_LABELS[r.outcome]}
                  </span>
                </div>
                {r.notes && <p className="whitespace-pre-wrap text-muted-foreground">{r.notes}</p>}
                {r.nextReviewDate && <p className="text-xs text-muted-foreground">Next review set for {fmtDate(r.nextReviewDate)}</p>}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
