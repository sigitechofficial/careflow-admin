import { Link } from '@tanstack/react-router'
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
  const bodyMapSearch = submissionId
    ? { from: 'initial-assessment', submissionId }
    : { from: 'initial-assessment' }

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
            <img
              src="/assets/body-map-diagram.svg"
              alt="Clinical body map — anterior and posterior figures"
              className="max-h-[360px] w-full max-w-md object-contain"
            />
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
