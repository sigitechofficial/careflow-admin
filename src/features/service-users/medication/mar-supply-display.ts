import type { MedicationSupplySummary } from '@/features/service-users/api/medication-mar.api'
import { supplyModelLabel } from '@/features/service-users/medication/mar-status-utils'

export type MarSupplyContextItem = { label: string; value: string }

export function formatMarSupplyDate(iso: string | null | undefined): string | null {
  if (!iso) return null
  const d = new Date(`${iso.slice(0, 10)}T12:00:00.000Z`)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
}

export function formatMarSupplyDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })
}

export function marSupplyContextItems(summary: MedicationSupplySummary): MarSupplyContextItem[] {
  const items: MarSupplyContextItem[] = []

  const delivery = formatMarSupplyDate(summary.deliveredAt)
  if (delivery) items.push({ label: 'Delivery', value: delivery })

  if (summary.supplyModel === 'BLISTER_CYCLE') {
    if (summary.packName) items.push({ label: 'Blister pack', value: summary.packName })
    const cycleEnd = formatMarSupplyDate(summary.cycleEndDate)
    if (cycleEnd) items.push({ label: 'Cycle ends', value: cycleEnd })
  } else if (summary.supplyModel === 'BOTTLE_28DAY') {
    const opened = formatMarSupplyDate(summary.openedAt)
    if (opened) items.push({ label: 'Opened', value: opened })
    const discard = formatMarSupplyDate(summary.expiresAt)
    if (discard) items.push({ label: 'Discard', value: discard })
  } else {
    const runsOut = formatMarSupplyDate(summary.runsOutDate)
    if (runsOut) items.push({ label: 'Runs out', value: runsOut })
    const cycleEnd = formatMarSupplyDate(summary.cycleEndDate)
    if (cycleEnd && cycleEnd !== runsOut) items.push({ label: 'Cycle ends', value: cycleEnd })
  }

  if (summary.pharmacyName) items.push({ label: 'Pharmacy', value: summary.pharmacyName })

  return items
}

export function marSupplyDaysLabel(summary: MedicationSupplySummary): string {
  if (summary.daysRemaining == null) return 'left'
  if (summary.supplyModel === 'BLISTER_CYCLE') {
    return summary.daysRemaining === 1 ? 'day left in cycle' : 'days left in cycle'
  }
  if (summary.supplyModel === 'BOTTLE_28DAY') {
    return summary.daysRemaining === 1 ? 'day until discard' : 'days until discard'
  }
  return summary.daysRemaining === 1 ? 'day left' : 'days left'
}

export function marSupplyModelShortLabel(model: MedicationSupplySummary['supplyModel']): string {
  return supplyModelLabel(model)
}
