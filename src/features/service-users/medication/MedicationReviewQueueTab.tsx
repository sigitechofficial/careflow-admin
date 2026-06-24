import { Loader2 } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { useMedicationEventsList } from '@/features/service-users/hooks/useMedicationEvents'
import { useReviewMedicationEvent } from '@/features/service-users/hooks/useMedicationMarChart'
import { MarEventStatusBadge } from '@/features/service-users/medication/MarEventStatusBadge'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'

import { formatGbDateTime } from '@/features/service-users/medication/medication-event-display'

function formatWhen(iso: string | null): string {
  return formatGbDateTime(iso)
}

export function MedicationReviewQueueTab({
  serviceUserId,
  onOpenEvent,
}: {
  serviceUserId: string
  onOpenEvent?: (eventId: string) => void
}) {
  const eventsQuery = useMedicationEventsList(serviceUserId, 1, true, { needsReview: true })
  const reviewMutation = useReviewMedicationEvent(serviceUserId)
  const rows = eventsQuery.data?.data ?? []

  const markReviewed = async (eventId: string) => {
    try {
      await reviewMutation.mutateAsync({ eventId })
      toastSuccess('Marked as reviewed')
      await eventsQuery.refetch()
    } catch (err) {
      toastApiError(err, 'Could not mark as reviewed')
    }
  }

  if (eventsQuery.isLoading) {
    return (
      <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading review queue…
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Exception administrations (refused, missed, unavailable, etc.) that may need manager
        review.
      </p>
      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        <div className="border-b border-border bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-950 dark:bg-amber-950 dark:text-amber-100">
          Pending review ({rows.length})
        </div>
        {rows.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">No records awaiting review.</p>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map(ev => (
              <li key={ev.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-3">
                <div>
                  <p className="font-medium">{ev.medication?.medicationName ?? 'Medication'}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatWhen(ev.actualDateTime ?? ev.scheduledDateTime ?? ev.createdAt)} ·{' '}
                    <MarEventStatusBadge status={ev.status} statusCode={ev.statusCode} className="mr-1.5" />
                    {ev.status.replace(/_/g, ' ')}
                  </p>
                  {(ev.reason || ev.notGivenReason?.name) && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {ev.notGivenReason?.name ?? ev.reason}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    className="bg-teal-700 text-white hover:bg-teal-800"
                    disabled={reviewMutation.isPending}
                    onClick={() => void markReviewed(ev.id)}
                  >
                    Mark reviewed
                  </Button>
                  {onOpenEvent && (
                    <Button type="button" size="sm" variant="outline" onClick={() => onOpenEvent(ev.id)}>
                      View
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
