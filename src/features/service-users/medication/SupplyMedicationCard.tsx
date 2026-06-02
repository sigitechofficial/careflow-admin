import { Package } from 'lucide-react'
import type { MedicationSupplyCard } from '@/features/service-users/api/medication-mar.api'
import { cn } from '@/shared/lib/utils'
import {
  marSupplyContextItems,
  marSupplyDaysLabel,
} from '@/features/service-users/medication/mar-supply-display'
import { supplyModelLabel } from '@/features/service-users/medication/mar-status-utils'
import { SupplyMedicationHistoryTabs } from '@/features/service-users/medication/SupplyMedicationHistoryTabs'

const MODEL_THEME = {
  BLISTER_CYCLE: {
    border: 'border-violet-200 dark:border-violet-900',
    header: 'bg-gradient-to-r from-violet-600 to-violet-700',
    accent: 'text-violet-700 dark:text-violet-300',
    bar: 'bg-violet-600',
    panel: 'bg-violet-50 dark:bg-violet-950/30',
  },
  BOTTLE_28DAY: {
    border: 'border-cyan-200 dark:border-cyan-900',
    header: 'bg-gradient-to-r from-cyan-600 to-cyan-700',
    accent: 'text-cyan-700 dark:text-cyan-300',
    bar: 'bg-cyan-600',
    panel: 'bg-cyan-50 dark:bg-cyan-950/30',
  },
  PRESCRIPTION_QTY: {
    border: 'border-emerald-200 dark:border-emerald-900',
    header: 'bg-gradient-to-r from-emerald-600 to-emerald-700',
    accent: 'text-emerald-700 dark:text-emerald-300',
    bar: 'bg-emerald-600',
    panel: 'bg-emerald-50 dark:bg-emerald-950/30',
  },
} as const

function qtyLabel(summary: NonNullable<MedicationSupplyCard['supplySummary']>): string {
  const unit = summary.qtyUnit
  if (summary.supplyModel === 'BOTTLE_28DAY') return `doses left`
  return `${unit} left`
}

export function SupplyMedicationCard({
  serviceUserId,
  card,
  onLogDelivery,
}: {
  serviceUserId: string
  card: MedicationSupplyCard
  onLogDelivery: () => void
}) {
  const theme = MODEL_THEME[card.supplyModel]
  const summary = card.supplySummary
  const contextItems = summary ? marSupplyContextItems(summary) : []
  const qtyPct =
    summary?.quantityRemaining != null &&
    summary.quantityTotal != null &&
    summary.quantityTotal > 0
      ? Math.round((summary.quantityRemaining / summary.quantityTotal) * 100)
      : null
  const daysPct =
    summary?.daysRemaining != null && summary.supplyModel === 'BLISTER_CYCLE'
      ? Math.max(0, Math.min(100, Math.round((summary.daysRemaining / 28) * 100)))
      : summary?.daysRemaining != null
        ? Math.max(0, Math.min(100, Math.round((summary.daysRemaining / 28) * 100)))
        : null

  const meta = [card.dose, card.strength].filter(Boolean).join(' · ')

  return (
    <div className={cn('overflow-hidden rounded-xl border shadow-sm', theme.border)}>
      <div className={cn('flex items-start gap-3 px-4 py-3 text-white', theme.header)}>
        <Package className="mt-0.5 h-4 w-4 shrink-0 opacity-90" aria-hidden />
        <div className="min-w-0 flex-1">
          <div className="font-semibold leading-tight">{card.medicationName}</div>
          {(meta || card.packName) && (
            <div className="mt-0.5 text-xs text-white/70">
              {[meta, card.packName].filter(Boolean).join(' · ')}
            </div>
          )}
        </div>
        <span className="shrink-0 rounded-md bg-white/20 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide">
          {supplyModelLabel(card.supplyModel)}
          {card.isControlledMedication ? ' · CD' : ''}
        </span>
      </div>

      {summary ? (
        <div className="grid gap-0 bg-card md:grid-cols-3">
          <div className="border-b border-border p-4 md:border-b-0 md:border-r">
            <div className={cn('text-[10px] font-bold uppercase tracking-wide', theme.accent)}>
              {card.supplyModel === 'BOTTLE_28DAY' ? 'Doses remaining' : 'Quantity remaining'}
            </div>
            {summary.quantityRemaining != null ? (
              <>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="font-mono text-2xl font-semibold text-foreground">
                    {summary.quantityRemaining}
                  </span>
                  {summary.quantityTotal != null && (
                    <span className="text-xs text-muted-foreground">
                      of {summary.quantityTotal} {summary.qtyUnit}
                    </span>
                  )}
                </div>
                {qtyPct != null && (
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn('h-full rounded-full transition-all', theme.bar)}
                      style={{ width: `${qtyPct}%` }}
                    />
                  </div>
                )}
                <p className="mt-2 text-xs text-muted-foreground">{qtyLabel(summary)}</p>
              </>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">No quantity logged</p>
            )}
          </div>

          <div className="border-b border-border p-4 md:border-b-0 md:border-r">
            <div className={cn('text-[10px] font-bold uppercase tracking-wide', theme.accent)}>
              {summary.supplyModel === 'BLISTER_CYCLE'
                ? 'Pack days remaining'
                : summary.supplyModel === 'BOTTLE_28DAY'
                  ? 'Days until discard'
                  : 'Supply days remaining'}
            </div>
            {summary.daysRemaining != null ? (
              <>
                <div className="mt-2 font-mono text-2xl font-semibold text-foreground">
                  {summary.daysRemaining}
                </div>
                {daysPct != null && (
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn('h-full rounded-full transition-all', theme.bar)}
                      style={{ width: `${daysPct}%` }}
                    />
                  </div>
                )}
                <p className="mt-2 text-xs text-muted-foreground">{marSupplyDaysLabel(summary)}</p>
              </>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">—</p>
            )}
          </div>

          <div className={cn('p-4', theme.panel)}>
            <div className={cn('text-[10px] font-bold uppercase tracking-wide', theme.accent)}>
              Supply & cycle
            </div>
            <ul className="mt-2 space-y-2 text-sm">
              {contextItems.map(item => (
                <li key={`${item.label}-${item.value}`} className="flex justify-between gap-2">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="font-medium text-foreground">{item.value}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <div className="bg-card p-4 text-sm text-muted-foreground">
          No supply delivery logged yet. Use Log delivery to record when stock was received.
        </div>
      )}

      <SupplyMedicationHistoryTabs
        serviceUserId={serviceUserId}
        card={card}
        onLogDelivery={onLogDelivery}
      />
    </div>
  )
}
