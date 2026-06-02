import * as React from 'react'
import { Loader2, Plus } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { useMedicationSupplyBundle } from '@/features/service-users/hooks/useMedicationSupply'
import { LogDeliveryDialog } from '@/features/service-users/medication/LogDeliveryDialog'
import { SupplyMedicationCard } from '@/features/service-users/medication/SupplyMedicationCard'
import type { MedicationSupplyCard } from '@/features/service-users/api/medication-mar.api'
import { dedupeSupplyCards } from '@/features/service-users/medication/supply-card-dedupe'

export function MedicationSupplyTab({ serviceUserId }: { serviceUserId: string }) {
  const supplyQuery = useMedicationSupplyBundle(serviceUserId)
  const [deliveryCard, setDeliveryCard] = React.useState<MedicationSupplyCard | null>(null)
  const [deliveryOpen, setDeliveryOpen] = React.useState(false)

  const openDelivery = (card: MedicationSupplyCard) => {
    setDeliveryCard(card)
    setDeliveryOpen(true)
  }

  const meds = React.useMemo(
    () => dedupeSupplyCards(supplyQuery.data?.medications ?? []),
    [supplyQuery.data?.medications],
  )

  if (supplyQuery.isLoading) {
    return (
      <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading supply…
      </div>
    )
  }

  if (supplyQuery.error) {
    return (
      <p className="text-sm text-destructive" role="alert">
        {supplyQuery.error instanceof Error ? supplyQuery.error.message : 'Failed to load supply'}
      </p>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm text-muted-foreground">
          Track pharmacy deliveries, cycle dates, and remaining stock. Logging delivery here is
          separate from recording administration on the MAR calendar.
        </p>
        {meds.length > 0 && (
          <Button
            type="button"
            size="sm"
            className="gap-1 bg-teal-700 text-white hover:bg-teal-800"
            onClick={() => {
              const card = meds[0]
              if (card) openDelivery(card)
            }}
          >
            <Plus className="h-3.5 w-3.5" />
            Log delivery
          </Button>
        )}
      </div>

      {meds.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          No active medications. Add medications on the Records tab first.
        </p>
      ) : (
        <div className="flex flex-col gap-5">
          {meds.map(card => (
            <SupplyMedicationCard
              key={card.medicationId}
              serviceUserId={serviceUserId}
              card={card}
              onLogDelivery={() => openDelivery(card)}
            />
          ))}
        </div>
      )}

      <LogDeliveryDialog
        open={deliveryOpen}
        onOpenChange={setDeliveryOpen}
        serviceUserId={serviceUserId}
        card={deliveryCard}
      />
    </div>
  )
}
