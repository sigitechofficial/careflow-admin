import { Link } from '@tanstack/react-router'
import { ExternalLink, FileText } from 'lucide-react'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { Button } from '@/shared/ui/button'
import { VisitPlanSlotCarePlanLinks } from '@/features/service-users/visit-plan/VisitPlanSlotCarePlanLinks'
import { resolveCarePlansForSlot } from '@/features/service-users/visit-plan/visit-plan-care-plan-links.util'
import type { AcceptedCarePlanItem } from '@/features/service-users/initial-assessment/api'
import type { VisitPlanSlot } from '@/features/service-users/visit-plan/types'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  serviceUserId: string
  slot: VisitPlanSlot
  acceptedCarePlans: AcceptedCarePlanItem[]
  disabled?: boolean
  onChange: (linkedCarePlanFormIds: string[]) => void
}

export function VisitPlanSlotCarePlansDialog({
  open,
  onOpenChange,
  serviceUserId,
  slot,
  acceptedCarePlans,
  disabled,
  onChange,
}: Props) {
  const linked = resolveCarePlansForSlot(slot, acceptedCarePlans)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" className="max-h-[90vh] overflow-hidden p-0">
        <DialogHeader>
          <DialogTitle>Care plans — {slot.label}</DialogTitle>
          <DialogDescription>
            Clinical care plans delivered during this call. Morning, lunch, tea, and other slots can link to
            different plans.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="max-h-[calc(90vh-8rem)] space-y-4 overflow-y-auto">
          {linked.length > 0 ? (
            <ul className="space-y-2">
              {linked.map((cp) => (
                <li
                  key={cp.formId}
                  className="flex items-start justify-between gap-3 rounded-lg border border-border bg-muted/20 px-3 py-2"
                >
                  <div className="flex min-w-0 items-start gap-2">
                    <FileText className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" aria-hidden />
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{cp.formName}</p>
                      <p className="text-xs text-muted-foreground">{cp.carePlanArea}</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        Accepted {new Date(cp.acceptedAt).toLocaleDateString('en-GB')}
                      </p>
                    </div>
                  </div>
                  <Button type="button" variant="outline" size="sm" asChild className="shrink-0">
                    <Link
                      to="/service-users/$serviceUserId/care-plan"
                      params={{ serviceUserId }}
                      onClick={() => onOpenChange(false)}
                    >
                      Open
                      <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              No care plans linked to this visit yet. Use the checklist below or accept plans on initial
              assessment.
            </p>
          )}

          <VisitPlanSlotCarePlanLinks
            slot={slot}
            acceptedCarePlans={acceptedCarePlans}
            disabled={disabled}
            onChange={onChange}
          />
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}
