import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/form-field'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  isPending?: boolean
  onConfirm: (reactivationReason?: string) => Promise<void>
}

export function VisitPlanReactivateDialog({
  open,
  onOpenChange,
  isPending = false,
  onConfirm,
}: Props) {
  const [reactivationReason, setReactivationReason] = React.useState('')

  React.useEffect(() => {
    if (open) setReactivationReason('')
  }, [open])

  const handleSubmit = async () => {
    await onConfirm(reactivationReason.trim() || undefined)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md" className="gap-0 p-0">
        <DialogHeader className="border-b border-border px-6 py-4">
          <DialogTitle>Re-activate authorised package</DialogTitle>
          <DialogDescription>
            Saves your latest schedule, then makes this package live again. Generate the rota after re-activation.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-4">
          <Label className="text-xs text-muted-foreground">Re-activation note (optional)</Label>
          <Input
            className="mt-1"
            value={reactivationReason}
            onChange={(e) => setReactivationReason(e.target.value)}
            placeholder="e.g. Discharged home — family agreed to resume morning and evening calls"
          />
        </div>

        <DialogFooter className="border-t border-border px-6 py-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void handleSubmit()} disabled={isPending}>
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Re-activate package
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
