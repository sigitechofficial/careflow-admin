import * as React from 'react'
import { Button } from '@/shared/ui/button'
import { Checkbox } from '@/shared/ui/toggle-controls'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { VisitPlanRotaImpactSummary } from '@/features/service-users/visit-plan/components/VisitPlanRotaImpactSummary'
import type { ScheduleImpactSummary } from '@/features/service-users/visit-plan/types'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  impact?: ScheduleImpactSummary | null
  impactFromDate?: string
  requireAcknowledge?: boolean
  acknowledgeLabel?: string
  confirmLabel?: string
  cancelLabel?: string
  isPending?: boolean
  onConfirm: () => void | Promise<void>
  children?: React.ReactNode
}

export function VisitPlanConfirmGate({
  open,
  onOpenChange,
  title,
  description,
  impact,
  impactFromDate,
  requireAcknowledge = false,
  acknowledgeLabel = 'I understand the rota will not change automatically',
  confirmLabel = 'Confirm',
  cancelLabel = 'Back',
  isPending = false,
  onConfirm,
  children,
}: Props) {
  const [acknowledged, setAcknowledged] = React.useState(false)

  React.useEffect(() => {
    if (!open) setAcknowledged(false)
  }, [open])

  const canConfirm = !requireAcknowledge || acknowledged

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {children}
          <VisitPlanRotaImpactSummary impact={impact} fromDate={impactFromDate} />
          {requireAcknowledge ? (
            <label className="flex items-start gap-2 text-sm">
              <Checkbox
                checked={acknowledged}
                onCheckedChange={(v) => setAcknowledged(Boolean(v))}
                className="mt-0.5"
              />
              <span>{acknowledgeLabel}</span>
            </label>
          ) : null}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            {cancelLabel}
          </Button>
          <Button type="button" onClick={() => onConfirm()} disabled={isPending || !canConfirm}>
            {isPending ? 'Applying…' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
