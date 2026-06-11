import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { BodyMapCanvas } from '@/features/service-users/body-map/components/BodyMapCanvas'
import { useServiceUserBodyMap } from '@/features/service-users/body-map/hooks/useBodyMap'
import { initialAssessmentBodyMapSearch } from '@/features/service-users/initial-assessment/utils/body-map-navigation'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { Button } from '@/shared/ui/button'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  serviceUserId?: string
  submissionId?: string | null
  openRecordCount?: number
}

export function InitialAssessmentBodyMapDialog({
  open,
  onOpenChange,
  serviceUserId,
  submissionId,
  openRecordCount,
}: Props) {
  const [selectedRecordId, setSelectedRecordId] = React.useState<string | null>(null)
  const bodyMapQuery = useServiceUserBodyMap(serviceUserId ?? '', false, { enabled: open })
  const records = bodyMapQuery.data?.records ?? []

  React.useEffect(() => {
    if (!open) setSelectedRecordId(null)
  }, [open])

  const bodyMapSearch = initialAssessmentBodyMapSearch(submissionId)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>Body map — section 11</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Wound or pressure areas flagged in section 11. Open the body map to place markers, review
            existing records, or start a baseline skin assessment.
          </p>
          {openRecordCount != null && openRecordCount > 0 ? (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
              {openRecordCount} open body map record{openRecordCount > 1 ? 's' : ''} on file — review before
              completing section 11.
            </p>
          ) : (
            <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
              No open body map records yet. Consider adding a baseline marker for any wound or pressure area.
            </p>
          )}
          <div className="flex justify-center rounded-lg border border-border bg-muted/20 p-4">
            {!serviceUserId ? (
              <p className="py-8 text-sm text-muted-foreground">
                Save the service user first to preview the body map.
              </p>
            ) : bodyMapQuery.isLoading ? (
              <div className="flex min-h-[360px] w-full max-w-md items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden />
              </div>
            ) : bodyMapQuery.isError ? (
              <p className="py-8 text-sm text-destructive" role="alert">
                {bodyMapQuery.error instanceof Error
                  ? bodyMapQuery.error.message
                  : 'Could not load body map'}
              </p>
            ) : (
              <BodyMapCanvas
                embedded
                className="min-h-[360px] w-full max-w-md"
                records={records}
                pendingMarker={null}
                selectedRecordId={selectedRecordId}
                markMode={false}
                showCleared={false}
                showMeds
                onPlaceMarker={() => {}}
                onSelectRecord={setSelectedRecordId}
              />
            )}
          </div>
        </DialogBody>
        <DialogFooter>
          {serviceUserId ? (
            <Button type="button" variant="outline" asChild>
              <Link
                to="/service-users/$serviceUserId/body-map"
                params={{ serviceUserId }}
                search={bodyMapSearch}
                onClick={() => onOpenChange(false)}
              >
                Open body map
              </Link>
            </Button>
          ) : null}
          <Button type="button" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
