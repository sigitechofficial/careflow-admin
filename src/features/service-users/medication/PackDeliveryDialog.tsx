import * as React from 'react'
import { Loader2, Check, X, AlertTriangle, ShieldCheck } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/shared/ui/dialog'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Badge } from '@/shared/ui/badge'
import { cn } from '@/shared/lib/utils'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import type {
  MedicationPackConditionValue,
  MedicationPackDelivery,
} from '@/features/service-users/types'
import {
  useCreateMedicationPackDelivery,
  useReconcileMedicationPackDeliveryLine,
  useCountersignMedicationPackDelivery,
} from '@/features/service-users/hooks/useMedicationPackLifecycle'

type Step = 'details' | 'reconcile' | 'countersign'

function nowLocalInput(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function PackDeliveryDialog({
  open,
  onOpenChange,
  serviceUserId,
  packId,
  cycleNumber,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  serviceUserId: string
  packId: string | null
  cycleNumber?: number
}) {
  const [step, setStep] = React.useState<Step>('details')
  const [delivery, setDelivery] = React.useState<MedicationPackDelivery | null>(null)
  const [receivedAt, setReceivedAt] = React.useState(nowLocalInput())
  const [deliveredBy, setDeliveredBy] = React.useState('')
  const [batchReference, setBatchReference] = React.useState('')
  const [condition, setCondition] = React.useState<MedicationPackConditionValue>('INTACT')
  const [conditionNotes, setConditionNotes] = React.useState('')

  const createDelivery = useCreateMedicationPackDelivery(serviceUserId)
  const reconcileLine = useReconcileMedicationPackDeliveryLine(serviceUserId)
  const countersign = useCountersignMedicationPackDelivery(serviceUserId)

  React.useEffect(() => {
    if (open) {
      setStep('details')
      setDelivery(null)
      setReceivedAt(nowLocalInput())
      setDeliveredBy('')
      setBatchReference('')
      setCondition('INTACT')
      setConditionNotes('')
    }
  }, [open])

  const handleCreate = async () => {
    if (!packId) return
    try {
      const created = await createDelivery.mutateAsync({
        packId,
        body: {
          receivedAt: new Date(receivedAt).toISOString(),
          deliveredBy: deliveredBy || undefined,
          batchReference: batchReference || undefined,
          condition,
          conditionNotes: conditionNotes || undefined,
        },
      })
      setDelivery(created)
      setStep('reconcile')
    } catch (e) {
      toastApiError(e, 'Could not log delivery')
    }
  }

  const handleConfirm = async (lineId: string, confirmedPresent: boolean) => {
    if (!packId || !delivery) return
    try {
      const updated = await reconcileLine.mutateAsync({
        packId,
        deliveryId: delivery.id,
        lineId,
        confirmedPresent,
        state: confirmedPresent ? 'MATCHED' : 'MISSING',
      })
      setDelivery(updated)
    } catch (e) {
      toastApiError(e, 'Could not update line')
    }
  }

  const handleCountersign = async () => {
    if (!packId || !delivery) return
    try {
      const updated = await countersign.mutateAsync({ packId, deliveryId: delivery.id })
      setDelivery(updated)
      toastSuccess('Delivery countersigned — cycle is live')
      onOpenChange(false)
    } catch (e) {
      toastApiError(e, 'Could not countersign delivery')
    }
  }

  const allConfirmed =
    delivery != null && delivery.lines.length > 0 && delivery.lines.every(l => l.confirmedPresent)
  const flaggedCount = delivery?.lines.filter(l => !l.confirmedPresent).length ?? 0

  return (
    <Dialog open={open} onOpenChange={o => !createDelivery.isPending && onOpenChange(o)}>
      <DialogContent size="lg" className="max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Log delivery {cycleNumber != null && <span className="text-muted-foreground">· Cycle {cycleNumber}</span>}
          </DialogTitle>
        </DialogHeader>

        <DialogBody className="space-y-4">
          {step === 'details' && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-sm font-medium">Date / time received *</label>
                <Input type="datetime-local" value={receivedAt} onChange={e => setReceivedAt(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Delivered by</label>
                <Input
                  value={deliveredBy}
                  onChange={e => setDeliveredBy(e.target.value)}
                  placeholder="Pharmacy courier / collected"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Pharmacy batch ref</label>
                <Input value={batchReference} onChange={e => setBatchReference(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Pack condition</label>
                <Select value={condition} onValueChange={v => setCondition(v as MedicationPackConditionValue)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INTACT">Intact</SelectItem>
                    <SelectItem value="DAMAGED">Damaged</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Condition notes</label>
                <Input
                  value={conditionNotes}
                  onChange={e => setConditionNotes(e.target.value)}
                  placeholder={condition === 'DAMAGED' ? 'Describe the damage' : 'Optional'}
                />
              </div>
            </div>
          )}

          {step === 'reconcile' && delivery && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Confirm each medicine from the published contents record is present in the new pack. Flag any
                that are missing or different — flagged deliveries cannot be countersigned until resolved.
              </p>
              <ul className="space-y-2">
                {delivery.lines.map(line => (
                  <li
                    key={line.id}
                    className={cn(
                      'flex items-center gap-3 rounded-lg border p-3',
                      line.confirmedPresent ? 'border-teal-500 bg-teal-50 dark:bg-teal-950/30' : 'border-border',
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <span className="font-medium">{line.medicationName}</span>
                      {line.strength && <span className="ml-2 text-sm text-muted-foreground">{line.strength}</span>}
                      {line.dose && <span className="ml-2 text-sm text-muted-foreground">· {line.dose}</span>}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        variant={line.confirmedPresent ? 'default' : 'outline'}
                        className={cn('h-8 gap-1', line.confirmedPresent && 'bg-teal-700 hover:bg-teal-800')}
                        disabled={reconcileLine.isPending}
                        onClick={() => void handleConfirm(line.id, true)}
                      >
                        <Check className="h-3.5 w-3.5" /> Present
                      </Button>
                      <Button
                        size="sm"
                        variant={!line.confirmedPresent && line.state === 'MISSING' ? 'destructive' : 'outline'}
                        className="h-8 gap-1"
                        disabled={reconcileLine.isPending}
                        onClick={() => void handleConfirm(line.id, false)}
                      >
                        <X className="h-3.5 w-3.5" /> Flag
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
              {flaggedCount > 0 && (
                <p className="flex items-center gap-1.5 text-sm text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  {flaggedCount} item(s) not confirmed — resolve before countersigning.
                </p>
              )}
            </div>
          )}

          {step === 'countersign' && delivery && (
            <div className="space-y-4">
              <div className="rounded-lg border border-border p-4 text-sm">
                <div className="mb-2 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-teal-600" />
                  <span className="font-semibold">Manager countersignature</span>
                </div>
                <p className="text-muted-foreground">
                  By countersigning you confirm the contents received match the prescription, any discrepancies
                  were investigated, and the pack is safe to administer.
                </p>
                <ul className="mt-3 space-y-1">
                  {delivery.lines.map(l => (
                    <li key={l.id} className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-teal-600" />
                      <span>{l.medicationName}</span>
                      <span className="text-muted-foreground">{l.strength}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {step === 'details' && (
            <Button size="sm" disabled={createDelivery.isPending} onClick={() => void handleCreate()}>
              {createDelivery.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Start reconciliation
            </Button>
          )}
          {step === 'reconcile' && (
            <Button size="sm" disabled={!allConfirmed} onClick={() => setStep('countersign')}>
              {allConfirmed ? 'Continue to countersign' : `${flaggedCount} unresolved`}
            </Button>
          )}
          {step === 'countersign' && (
            <Button
              size="sm"
              className="bg-teal-700 hover:bg-teal-800"
              disabled={countersign.isPending || !allConfirmed}
              onClick={() => void handleCountersign()}
            >
              {countersign.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Countersign & go live
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

const STATUS_BADGE: Record<string, { label: string; variant: 'muted' | 'success' | 'warning' | 'secondary' }> = {
  PENDING: { label: 'Pending', variant: 'muted' },
  RECONCILED: { label: 'Reconciled', variant: 'secondary' },
  FLAGGED: { label: 'Flagged', variant: 'warning' },
  VERIFIED: { label: 'Verified', variant: 'success' },
}

export function DeliveryStatusBadge({ status }: { status: string }) {
  const meta = STATUS_BADGE[status] ?? { label: status, variant: 'muted' as const }
  return (
    <Badge variant={meta.variant} size="sm">
      {meta.label}
    </Badge>
  )
}
