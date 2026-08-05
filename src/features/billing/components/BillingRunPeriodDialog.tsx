import * as React from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { defaultBillingMonthRange } from '@/features/billing/utils/billing-run.util'

type BillingRunPeriodDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  isPending?: boolean
  onSubmit: (values: { periodStart: string; periodEnd: string }) => void | Promise<void>
}

export function BillingRunPeriodDialog({
  open,
  onOpenChange,
  title,
  description,
  isPending,
  onSubmit,
}: BillingRunPeriodDialogProps) {
  const defaults = React.useMemo(() => defaultBillingMonthRange(), [])
  const [periodStart, setPeriodStart] = React.useState(defaults.periodStart)
  const [periodEnd, setPeriodEnd] = React.useState(defaults.periodEnd)

  React.useEffect(() => {
    if (open) {
      const range = defaultBillingMonthRange()
      setPeriodStart(range.periodStart)
      setPeriodEnd(range.periodEnd)
    }
  }, [open])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    void onSubmit({ periodStart, periodEnd })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="periodStart" className="text-sm font-medium text-foreground">
                Period start
              </label>
              <Input
                id="periodStart"
                type="date"
                value={periodStart}
                onChange={e => setPeriodStart(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="periodEnd" className="text-sm font-medium text-foreground">
                Period end
              </label>
              <Input
                id="periodEnd"
                type="date"
                value={periodEnd}
                onChange={e => setPeriodEnd(e.target.value)}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Creating…' : 'Create run'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
