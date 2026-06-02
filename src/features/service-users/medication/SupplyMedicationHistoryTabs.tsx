import * as React from 'react'
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import type {
  MedicationEventListRow,
  MedicationSupplyCard,
  MedicationSupplyDeliveryRow,
} from '@/features/service-users/api/medication-mar.api'
import { useMedicationEventsList } from '@/features/service-users/hooks/useMedicationEvents'
import { MarEventStatusBadge } from '@/features/service-users/medication/MarEventStatusBadge'
import { RecordDetailDrawer } from '@/features/service-users/medication/RecordDetailDrawer'
import {
  formatMarSupplyDate,
  formatMarSupplyDateTime,
} from '@/features/service-users/medication/mar-supply-display'
import { Button } from '@/shared/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs'
import { cn } from '@/shared/lib/utils'

const REVIEWABLE_STATUSES = new Set(['REFUSED', 'MISSED', 'NOT_GIVEN', 'HELD'])

function deliveryTabLabel(model: MedicationSupplyCard['supplyModel']): string {
  switch (model) {
    case 'BLISTER_CYCLE':
      return 'Delivery & cycle log'
    case 'BOTTLE_28DAY':
      return 'Delivery & bottle log'
    default:
      return 'Supply & prescription log'
  }
}

function formatDueTime(value: string | null | undefined): string {
  if (!value) return '—'
  const match = value.match(/T(\d{2}:\d{2})/)
  if (match?.[1]) return match[1]
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

function eventDateLabel(ev: MedicationEventListRow): string {
  const iso = ev.scheduledDateTime ?? ev.actualDateTime ?? ev.createdAt
  return formatMarSupplyDate(iso) ?? '—'
}

function eventRecordedAt(ev: MedicationEventListRow): string {
  return formatMarSupplyDateTime(ev.actualDateTime ?? ev.createdAt)
}

function carerLabel(ev: MedicationEventListRow): string {
  const pd = ev.administeredBy?.personalDetail
  if (pd) {
    const name = [pd.firstName, pd.lastName].filter(Boolean).join(' ').trim()
    if (name) return name
  }
  const entered = ev.enteredBy
  if (entered) {
    const name = [entered.firstName, entered.lastName].filter(Boolean).join(' ').trim()
    if (name) return name
  }
  return '—'
}

function eventReason(ev: MedicationEventListRow): string {
  return ev.notGivenReason?.name ?? ev.reason ?? ev.notes ?? '—'
}

function reviewLabel(ev: MedicationEventListRow): string {
  if (!REVIEWABLE_STATUSES.has(ev.status)) return 'N/A'
  return ev.managerReviewedAt ? 'Reviewed' : 'Pending'
}

function qtyLabel(d: MedicationSupplyDeliveryRow, unit: string | undefined): string {
  if (d.quantity == null) return '—'
  return unit ? `${d.quantity} ${unit}` : String(d.quantity)
}

function DeliveryHistoryTable({
  card,
  onLogDelivery,
}: {
  card: MedicationSupplyCard
  onLogDelivery: () => void
}) {
  const unit = card.supplySummary?.qtyUnit ?? undefined
  const rows = card.recentDeliveries

  return (
    <div>
      <div className="flex items-center justify-end border-b border-border bg-muted/20 px-4 py-2">
        <Button type="button" size="sm" variant="outline" onClick={onLogDelivery}>
          Log delivery
        </Button>
      </div>
      {rows.length === 0 ? (
        <p className="px-4 py-6 text-sm text-muted-foreground">No deliveries logged yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {card.supplyModel === 'BLISTER_CYCLE' && (
                  <>
                    <th className="px-3 py-2">Delivered</th>
                    <th className="px-3 py-2">Cycle ends</th>
                    <th className="px-3 py-2">Qty</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Received by</th>
                    <th className="px-3 py-2">Logged at</th>
                  </>
                )}
                {card.supplyModel === 'BOTTLE_28DAY' && (
                  <>
                    <th className="px-3 py-2">Delivered</th>
                    <th className="px-3 py-2">Opened</th>
                    <th className="px-3 py-2">Expires</th>
                    <th className="px-3 py-2">Qty</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Received by</th>
                    <th className="px-3 py-2">Logged at</th>
                  </>
                )}
                {card.supplyModel === 'PRESCRIPTION_QTY' && (
                  <>
                    <th className="px-3 py-2">Delivered</th>
                    <th className="px-3 py-2">Runs out</th>
                    <th className="px-3 py-2">Qty</th>
                    <th className="px-3 py-2">Pharmacy</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Received by</th>
                    {card.isControlledMedication && <th className="px-3 py-2">Witness</th>}
                    <th className="px-3 py-2">Logged at</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((d, index) => {
                const isActive = index === 0
                const receivedBy = d.receivedBy?.name ?? '—'
                const witness = d.witnessBy?.name ?? '—'
                const loggedAt = formatMarSupplyDateTime(d.createdAt)
                const statusCell = (
                  <span
                    className={cn(
                      'inline-flex rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
                    )}
                  >
                    {isActive ? 'Active' : 'Complete'}
                  </span>
                )

                return (
                  <tr
                    key={d.id}
                    className={cn(
                      'border-b border-border/80 last:border-0',
                      isActive && 'bg-muted/20',
                    )}
                  >
                    {card.supplyModel === 'BLISTER_CYCLE' && (
                      <>
                        <td className="px-3 py-2 tabular-nums">
                          {formatMarSupplyDate(d.deliveredAt) ?? '—'}
                        </td>
                        <td className="px-3 py-2 tabular-nums">
                          {formatMarSupplyDate(d.cycleEndDate) ?? '—'}
                        </td>
                        <td className="px-3 py-2">{qtyLabel(d, unit)}</td>
                        <td className="px-3 py-2">{statusCell}</td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {[receivedBy, d.pharmacyName].filter(v => v && v !== '—').join(' · ') ||
                            '—'}
                        </td>
                        <td className="px-3 py-2 font-mono text-xs tabular-nums text-muted-foreground">
                          {loggedAt}
                        </td>
                      </>
                    )}
                    {card.supplyModel === 'BOTTLE_28DAY' && (
                      <>
                        <td className="px-3 py-2 tabular-nums">
                          {formatMarSupplyDate(d.deliveredAt) ?? '—'}
                        </td>
                        <td className="px-3 py-2 tabular-nums">
                          {formatMarSupplyDate(d.openedAt) ?? '—'}
                        </td>
                        <td className="px-3 py-2 tabular-nums">
                          {formatMarSupplyDate(d.expiresAt) ?? '—'}
                        </td>
                        <td className="px-3 py-2">{qtyLabel(d, unit)}</td>
                        <td className="px-3 py-2">{statusCell}</td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {[receivedBy, d.pharmacyName].filter(v => v && v !== '—').join(' · ') ||
                            '—'}
                        </td>
                        <td className="px-3 py-2 font-mono text-xs tabular-nums text-muted-foreground">
                          {loggedAt}
                        </td>
                      </>
                    )}
                    {card.supplyModel === 'PRESCRIPTION_QTY' && (
                      <>
                        <td className="px-3 py-2 tabular-nums">
                          {formatMarSupplyDate(d.deliveredAt) ?? '—'}
                        </td>
                        <td className="px-3 py-2 tabular-nums">
                          {formatMarSupplyDate(d.runsOutDate) ?? '—'}
                        </td>
                        <td className="px-3 py-2">{qtyLabel(d, unit)}</td>
                        <td className="px-3 py-2 text-muted-foreground">{d.pharmacyName ?? '—'}</td>
                        <td className="px-3 py-2">{statusCell}</td>
                        <td className="px-3 py-2 text-muted-foreground">{receivedBy}</td>
                        {card.isControlledMedication && (
                          <td className="px-3 py-2 text-muted-foreground">{witness}</td>
                        )}
                        <td className="px-3 py-2 font-mono text-xs tabular-nums text-muted-foreground">
                          {loggedAt}
                        </td>
                      </>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function AdministrationHistoryTable({
  serviceUserId,
  medicationIds,
}: {
  serviceUserId: string
  medicationIds: string[]
}) {
  const [page, setPage] = React.useState(1)
  const [detailEventId, setDetailEventId] = React.useState<string | null>(null)
  const [detailOpen, setDetailOpen] = React.useState(false)

  const eventsQuery = useMedicationEventsList(serviceUserId, page, true, {
    medicationIds,
    medicationId: medicationIds.length === 1 ? medicationIds[0] : undefined,
  })
  const rows = eventsQuery.data?.data ?? []
  const meta = eventsQuery.data?.meta
  const totalPages = meta ? Math.max(1, Math.ceil(meta.total / meta.limit)) : 1

  if (eventsQuery.isLoading && !eventsQuery.data) {
    return (
      <div className="flex items-center gap-2 px-4 py-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading administration history…
      </div>
    )
  }

  if (eventsQuery.error) {
    return (
      <p className="px-4 py-6 text-sm text-destructive" role="alert">
        {eventsQuery.error instanceof Error
          ? eventsQuery.error.message
          : 'Failed to load administration history'}
      </p>
    )
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/20 px-4 py-2">
        <span className="text-xs font-medium text-muted-foreground">
          {meta?.total ?? rows.length} record{(meta?.total ?? rows.length) === 1 ? '' : 's'}
        </span>
        {totalPages > 1 && (
          <div className="flex items-center gap-1 text-xs">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span>
              Page {page} of {totalPages}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
      {rows.length === 0 ? (
        <p className="px-4 py-6 text-sm text-muted-foreground">No administrations recorded yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Time slot</th>
                <th className="px-3 py-2">Due</th>
                <th className="px-3 py-2">Status · reason</th>
                <th className="px-3 py-2">Carer</th>
                <th className="px-3 py-2">Recorded at</th>
                <th className="px-3 py-2">Review</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(ev => (
                <tr
                  key={ev.id}
                  className="cursor-pointer border-b border-border/80 last:border-0 hover:bg-muted/30"
                  onClick={() => {
                    setDetailEventId(ev.id)
                    setDetailOpen(true)
                  }}
                >
                  <td className="px-3 py-2 tabular-nums">{eventDateLabel(ev)}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {ev.schedule?.round?.name ?? ev.round?.name ?? '—'}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs tabular-nums text-muted-foreground">
                    {formatDueTime(ev.schedule?.dueTime ?? ev.scheduledDateTime)}
                  </td>
                  <td className="px-3 py-2">
                    <MarEventStatusBadge status={ev.status} statusCode={ev.statusCode} />
                    <span className="ml-2 text-xs text-muted-foreground">{eventReason(ev)}</span>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{carerLabel(ev)}</td>
                  <td className="px-3 py-2 font-mono text-xs tabular-nums text-muted-foreground">
                    {eventRecordedAt(ev)}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={cn(
                        'text-xs font-medium',
                        reviewLabel(ev) === 'Pending'
                          ? 'text-amber-700 dark:text-amber-400'
                          : 'text-muted-foreground',
                      )}
                    >
                      {reviewLabel(ev)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <RecordDetailDrawer
        open={detailOpen}
        onOpenChange={setDetailOpen}
        serviceUserId={serviceUserId}
        eventId={detailEventId}
      />
    </>
  )
}

export function SupplyMedicationHistoryTabs({
  serviceUserId,
  card,
  onLogDelivery,
}: {
  serviceUserId: string
  card: MedicationSupplyCard
  onLogDelivery: () => void
}) {
  const [activeTab, setActiveTab] = React.useState('delivery')
  const adminLabel = card.isControlledMedication
    ? 'Administration history (CD)'
    : 'Administration history'

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="border-t border-border">
      <TabsList
        variant="underline"
        className="h-auto w-full justify-start rounded-none border-b border-border bg-muted/20 px-4"
      >
        <TabsTrigger value="delivery" variant="underline" className="text-xs">
          {deliveryTabLabel(card.supplyModel)}
        </TabsTrigger>
        <TabsTrigger value="administration" variant="underline" className="text-xs">
          {adminLabel}
        </TabsTrigger>
      </TabsList>
      <TabsContent value="delivery" className="mt-0">
        <DeliveryHistoryTable card={card} onLogDelivery={onLogDelivery} />
      </TabsContent>
      <TabsContent value="administration" className="mt-0">
        {activeTab === 'administration' && (
          <AdministrationHistoryTable
            serviceUserId={serviceUserId}
            medicationIds={card.relatedMedicationIds ?? [card.medicationId]}
          />
        )}
      </TabsContent>
    </Tabs>
  )
}
