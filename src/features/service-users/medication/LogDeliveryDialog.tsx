import * as React from 'react'
import { Info, Loader2 } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { Input } from '@/shared/ui/input'
import type { MedicationSupplyCard } from '@/features/service-users/api/medication-mar.api'
import { useLogMedicationDelivery } from '@/features/service-users/hooks/useMedicationSupply'
import { supplyModelLabel } from '@/features/service-users/medication/mar-status-utils'
import {
  addDaysIsoDate,
  cycleCalcHint,
  cycleEndDateFromQuantity,
  DEFAULT_PHARMACIES,
  defaultCycleEndDate,
  formatSupplyCycleRange,
  quantityUnitHint,
  suggestedDeliveryQuantity,
} from '@/features/service-users/medication/supply-delivery-form'
import { formatMarSupplyDate } from '@/features/service-users/medication/mar-supply-display'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { operationalTodayIso } from '@/shared/lib/operational-day.util'

function todayIsoDate(): string {
  return operationalTodayIso()
}

export function LogDeliveryDialog({
  open,
  onOpenChange,
  serviceUserId,
  card,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  serviceUserId: string
  card: MedicationSupplyCard | null
}) {
  const logMutation = useLogMedicationDelivery(serviceUserId)
  const model = card?.supplyModel ?? 'PRESCRIPTION_QTY'
  const unit = quantityUnitHint(card)
  const dosesPerDay = card?.dosesPerDay ?? 0

  const [deliveredAt, setDeliveredAt] = React.useState(todayIsoDate())
  const [cycleEndDate, setCycleEndDate] = React.useState('')
  const [openedAt, setOpenedAt] = React.useState('')
  const [expiresAt, setExpiresAt] = React.useState('')
  const [runsOutDate, setRunsOutDate] = React.useState('')
  const [quantity, setQuantity] = React.useState('')
  const [pharmacyName, setPharmacyName] = React.useState('')
  const [notes, setNotes] = React.useState('')
  const [cycleEndManual, setCycleEndManual] = React.useState(false)
  const [formError, setFormError] = React.useState<string | null>(null)

  const activeDelivery = card?.recentDeliveries?.[0] ?? null
  const qtyNum = quantity.trim() ? Number(quantity) : 0

  const autoCycleEnd = React.useMemo(() => {
    if (!deliveredAt) return ''
    if (qtyNum > 0 && dosesPerDay > 0) {
      return cycleEndDateFromQuantity(deliveredAt, qtyNum, dosesPerDay)
    }
    return defaultCycleEndDate(deliveredAt)
  }, [deliveredAt, qtyNum, dosesPerDay])

  const calcHint = React.useMemo(
    () => (qtyNum > 0 && dosesPerDay > 0 ? cycleCalcHint(qtyNum, dosesPerDay, deliveredAt) : null),
    [qtyNum, dosesPerDay, deliveredAt],
  )

  const applyAutoCycleDates = React.useCallback(
    (received: string, qty: number, manual: boolean) => {
      const end =
        qty > 0 && dosesPerDay > 0
          ? cycleEndDateFromQuantity(received, qty, dosesPerDay)
          : defaultCycleEndDate(received)

      if (manual) return

      if (model === 'BLISTER_CYCLE') {
        setCycleEndDate(end)
      } else if (model === 'BOTTLE_28DAY') {
        setOpenedAt(received)
        setExpiresAt(addDaysIsoDate(received, 27))
      } else {
        setRunsOutDate(end)
      }
    },
    [model, dosesPerDay],
  )

  React.useEffect(() => {
    if (!open || !card) return
    const today = todayIsoDate()
    const suggestedQty = suggestedDeliveryQuantity(card)
    const pharmacy =
      card.supplySummary?.pharmacyName ??
      card.recentDeliveries?.[0]?.pharmacyName ??
      DEFAULT_PHARMACIES[0]

    setDeliveredAt(today)
    setQuantity(suggestedQty)
    setPharmacyName(pharmacy)
    setNotes('')
    setCycleEndManual(false)
    setFormError(null)
    const q = Number(suggestedQty) || 0
    applyAutoCycleDates(today, q, false)
  }, [open, card?.medicationId, card, applyAutoCycleDates])

  React.useEffect(() => {
    if (!open) return
    applyAutoCycleDates(deliveredAt, qtyNum, cycleEndManual)
  }, [deliveredAt, qtyNum, open, cycleEndManual, applyAutoCycleDates])

  const cycleEndPreview =
    model === 'BLISTER_CYCLE' ? cycleEndDate : model === 'BOTTLE_28DAY' ? expiresAt : runsOutDate

  const futureDateError =
    deliveredAt > todayIsoDate() ? 'Received date cannot be in the future.' : null

  const handleSave = async () => {
    if (!card || futureDateError) return
    if (!qtyNum || qtyNum < 1) {
      setFormError('Enter the quantity received.')
      return
    }
    setFormError(null)
    try {
      await logMutation.mutateAsync({
        serviceUserMedicationId: card.medicationId,
        deliveredAt,
        quantity: qtyNum,
        pharmacyName: pharmacyName.trim() || undefined,
        cycleEndDate:
          model === 'BLISTER_CYCLE'
            ? (cycleEndManual ? cycleEndDate : autoCycleEnd) || undefined
            : undefined,
        openedAt: model === 'BOTTLE_28DAY' ? openedAt || deliveredAt : undefined,
        expiresAt: model === 'BOTTLE_28DAY' ? expiresAt || undefined : undefined,
        runsOutDate:
          model === 'PRESCRIPTION_QTY'
            ? (cycleEndManual ? runsOutDate : autoCycleEnd) || undefined
            : undefined,
        notes: notes.trim() || undefined,
      })
      toastSuccess('Delivery logged')
      onOpenChange(false)
    } catch (err) {
      toastApiError(err, 'Could not log delivery')
    }
  }

  const disabled = !card || logMutation.isPending
  const meta = [card?.dose, card?.strength].filter(Boolean).join(' · ')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" className="max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-teal-800 dark:text-teal-200">Log pharmacy delivery</DialogTitle>
          <DialogDescription>
            Book stock in for the supply cycle — separate from recording administration on the MAR.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-5">
          {card && (
            <div className="rounded-lg border border-border bg-muted/20 px-4 py-3 text-sm">
              <div className="font-semibold text-foreground">{card.medicationName}</div>
              {(meta || card.packName) && (
                <div className="text-muted-foreground">
                  {[meta, card.packName].filter(Boolean).join(' · ')}
                </div>
              )}
              <div className="mt-1 text-xs text-muted-foreground">
                {supplyModelLabel(model)}
                {card.isControlledMedication ? ' · Controlled drug' : ''}
                {dosesPerDay > 0 && (
                  <>
                    {' '}
                    · {card.scheduleSlotCount ?? '—'} round
                    {(card.scheduleSlotCount ?? 0) === 1 ? '' : 's'}/day (~{dosesPerDay.toFixed(2)}{' '}
                    doses/day)
                  </>
                )}
              </div>
            </div>
          )}

          {activeDelivery && (
            <div
              className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
              role="status"
            >
              <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>
                Active cycle from{' '}
                <strong>{formatMarSupplyDate(activeDelivery.deliveredAt) ?? '—'}</strong>
                {activeDelivery.quantity != null && (
                  <>
                    {' '}
                    ({activeDelivery.quantity} {unit})
                  </>
                )}
                . Saving starts a new cycle.
              </span>
            </div>
          )}

          {formError && (
            <p className="text-sm text-destructive" role="alert">
              {formError}
            </p>
          )}
          {futureDateError && (
            <p className="text-sm text-destructive" role="alert">
              {futureDateError}
            </p>
          )}

          <div className="space-y-4 rounded-lg border border-border bg-muted/20 p-4">
            <p className="text-sm font-medium text-foreground">When stock arrived</p>
            <div className="space-y-1">
              <label className="text-sm font-medium">
                Received from pharmacy <span className="text-destructive">*</span>
              </label>
              <Input
                type="date"
                max={todayIsoDate()}
                value={deliveredAt}
                onChange={e => {
                  setDeliveredAt(e.target.value)
                  setCycleEndManual(false)
                }}
                disabled={disabled}
              />
              <p className="text-xs text-muted-foreground">
                Starts the supply cycle and MAR consumption count — use the day stock arrived, not
                today unless it arrived today.
              </p>
            </div>
          </div>

          <div className="space-y-4 rounded-lg border border-border bg-muted/20 p-4">
            <p className="text-sm font-medium text-foreground">Quantity & cycle</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm font-medium">
                  Quantity ({unit}) <span className="text-destructive">*</span>
                </label>
                <Input
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={e => {
                    setQuantity(e.target.value)
                    setCycleEndManual(false)
                  }}
                  placeholder={model === 'BOTTLE_28DAY' ? 'e.g. 56' : 'e.g. 28'}
                  disabled={disabled}
                />
                {calcHint && (
                  <p className="text-xs font-medium text-teal-800 dark:text-teal-200">{calcHint}</p>
                )}
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Pharmacy</label>
                <Input
                  list="supply-pharmacy-suggestions"
                  value={pharmacyName}
                  onChange={e => setPharmacyName(e.target.value)}
                  placeholder="Pharmacy name"
                  disabled={disabled}
                />
                <datalist id="supply-pharmacy-suggestions">
                  {DEFAULT_PHARMACIES.map(p => (
                    <option key={p} value={p} />
                  ))}
                </datalist>
              </div>
            </div>

            {model === 'BLISTER_CYCLE' && (
              <div className="space-y-1">
                <label className="text-sm font-medium">Cycle ends</label>
                <Input
                  type="date"
                  value={cycleEndManual ? cycleEndDate : autoCycleEnd}
                  onChange={e => {
                    setCycleEndManual(true)
                    setCycleEndDate(e.target.value)
                  }}
                  disabled={disabled}
                />
                {!cycleEndManual && calcHint && (
                  <p className="text-xs text-muted-foreground">Auto-calculated from quantity</p>
                )}
              </div>
            )}

            {model === 'BOTTLE_28DAY' && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Opened</label>
                  <Input
                    type="date"
                    value={openedAt}
                    onChange={e => {
                      setCycleEndManual(true)
                      setOpenedAt(e.target.value)
                    }}
                    disabled={disabled}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Discard by (28-day rule)</label>
                  <Input
                    type="date"
                    value={expiresAt}
                    onChange={e => {
                      setCycleEndManual(true)
                      setExpiresAt(e.target.value)
                    }}
                    disabled={disabled}
                  />
                  {calcHint && (
                    <p className="text-xs text-muted-foreground">
                      Discard date follows 28-day bottle rule; {calcHint.toLowerCase()}
                    </p>
                  )}
                </div>
              </div>
            )}

            {model === 'PRESCRIPTION_QTY' && (
              <div className="space-y-1">
                <label className="text-sm font-medium">Runs out</label>
                <Input
                  type="date"
                  value={cycleEndManual ? runsOutDate : autoCycleEnd}
                  onChange={e => {
                    setCycleEndManual(true)
                    setRunsOutDate(e.target.value)
                  }}
                  disabled={disabled}
                />
                {!cycleEndManual && calcHint && (
                  <p className="text-xs text-muted-foreground">Auto-calculated from quantity</p>
                )}
              </div>
            )}

            {cycleEndPreview && deliveredAt && (
              <p className="rounded-md border border-border bg-card px-3 py-2 text-sm">
                <span className="text-muted-foreground">Cycle: </span>
                <span className="font-medium text-foreground">
                  {formatSupplyCycleRange(
                    deliveredAt,
                    cycleEndManual
                      ? cycleEndPreview
                      : autoCycleEnd || cycleEndPreview,
                  )}
                </span>
              </p>
            )}
          </div>

          <div className="space-y-4 rounded-lg border border-border bg-muted/20 p-4">
            <p className="text-sm font-medium text-foreground">Notes</p>
            <div className="space-y-1">
              <label className="text-sm font-medium text-muted-foreground">Optional</label>
              <textarea
                className="flex min-h-[4rem] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={2}
                placeholder="e.g. Monthly blister pack — checked against prescription chart"
                disabled={disabled}
              />
            </div>
          </div>
        </DialogBody>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={disabled}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={disabled || !deliveredAt || !qtyNum || Boolean(futureDateError)}
            onClick={() => void handleSave()}
          >
            {logMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              'Log delivery'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
