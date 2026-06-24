import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Textarea } from '@/shared/ui/form-field'
import { useReviewMedicationEvent } from '@/features/service-users/hooks/useMedicationMarChart'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import type { MedicationEventDetail } from '@/features/service-users/api/medication-mar.api'
import { userDisplayName, formatGbDateTime } from '@/features/service-users/medication/medication-event-display'

const REVIEWABLE = new Set(['REFUSED', 'MISSED', 'NOT_GIVEN', 'HELD'])

export function RecordReviewPanel({
  serviceUserId,
  event,
  onReviewed,
}: {
  serviceUserId: string
  event: MedicationEventDetail
  onReviewed?: () => void
}) {
  const reviewMutation = useReviewMedicationEvent(serviceUserId)
  const [notes, setNotes] = React.useState('')
  const needsReview = REVIEWABLE.has(event.status) && !event.managerReviewedAt

  if (!needsReview && !event.managerReviewedAt) return null

  const handleReview = async () => {
    try {
      await reviewMutation.mutateAsync({ eventId: event.id, notes: notes.trim() || undefined })
      toastSuccess('Record marked as reviewed')
      setNotes('')
      onReviewed?.()
    } catch (err) {
      toastApiError(err, 'Could not complete review')
    }
  }

  if (event.managerReviewedAt) {
    return (
      <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm dark:border-emerald-900 dark:bg-emerald-950">
        <p className="font-medium text-emerald-900 dark:text-emerald-100">Manager reviewed</p>
        <p className="text-xs text-emerald-800 dark:text-emerald-200">
          {formatGbDateTime(event.managerReviewedAt)} ·{' '}
          {userDisplayName(event.managerReviewedBy)}
        </p>
        {event.managerReviewNotes && (
          <p className="mt-1 text-xs text-emerald-900 dark:text-emerald-100">{event.managerReviewNotes}</p>
        )}
      </div>
    )
  }

  return (
    <div className="mt-4 space-y-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 dark:border-amber-900 dark:bg-amber-950">
      <p className="text-sm font-medium text-amber-950 dark:text-amber-100">Awaiting manager review</p>
      <Textarea
        value={notes}
        onChange={e => setNotes(e.target.value)}
        rows={2}
        placeholder="Review notes (optional)"
        className="bg-white dark:bg-background"
      />
      <Button
        type="button"
        size="sm"
        className="bg-teal-700 text-white hover:bg-teal-800"
        disabled={reviewMutation.isPending}
        onClick={() => void handleReview()}
      >
        {reviewMutation.isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving…
          </>
        ) : (
          'Mark as reviewed'
        )}
      </Button>
    </div>
  )
}
