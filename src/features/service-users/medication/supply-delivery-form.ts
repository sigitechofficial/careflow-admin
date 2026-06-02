import type { MedicationSupplyCard } from '@/features/service-users/api/medication-mar.api'

const DEFAULT_CYCLE_DAYS = 28

export function addDaysIsoDate(iso: string, days: number): string {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00.000Z`)
  if (Number.isNaN(d.getTime())) return iso
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/** Fallback when quantity unknown — calendar month-style cycle. */
export function defaultCycleEndDate(deliveredAt: string, cycleDays = DEFAULT_CYCLE_DAYS): string {
  return addDaysIsoDate(deliveredAt, cycleDays - 1)
}

/** Last day of supply: quantity ÷ doses per day (inclusive of start day). */
export function cycleEndDateFromQuantity(
  deliveredAt: string,
  quantity: number,
  dosesPerDay: number,
): string {
  if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(dosesPerDay) || dosesPerDay <= 0) {
    return defaultCycleEndDate(deliveredAt)
  }
  const daysOfSupply = Math.max(1, Math.ceil(quantity / dosesPerDay))
  return addDaysIsoDate(deliveredAt, daysOfSupply - 1)
}

export function formatSupplyCycleRange(deliveredAt: string, endDate: string): string {
  const fmt = (iso: string) => {
    const d = new Date(`${iso.slice(0, 10)}T12:00:00.000Z`)
    return d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    })
  }
  return `${fmt(deliveredAt)} → ${fmt(endDate)}`
}

export function quantityUnitHint(card: MedicationSupplyCard | null): string {
  const unit = card?.supplySummary?.qtyUnit
  if (unit) return unit
  if (card?.supplyModel === 'BOTTLE_28DAY') return 'doses'
  return 'tabs'
}

export function suggestedDeliveryQuantity(card: MedicationSupplyCard | null): string {
  if (!card) return ''
  const total = card.supplySummary?.quantityTotal
  if (total != null) return String(total)
  const slots = card.scheduleSlotCount ?? 0
  const dpd = card.dosesPerDay ?? 1
  if (slots > 0 && dpd > 0) {
    return String(Math.round(dpd * DEFAULT_CYCLE_DAYS))
  }
  const name = card.medicationName.toLowerCase()
  if (name.includes('metformin')) return '56'
  if (name.includes('furosemide')) return '12'
  return '28'
}

export function cycleCalcHint(
  quantity: number,
  dosesPerDay: number,
  deliveredAt: string,
): string | null {
  if (!quantity || !dosesPerDay || !deliveredAt) return null
  const days = Math.max(1, Math.ceil(quantity / dosesPerDay))
  const unit = dosesPerDay === 1 ? 'dose' : 'doses'
  return `${quantity} ÷ ${dosesPerDay} ${unit}/day ≈ ${days} day${days === 1 ? '' : 's'} of supply`
}

export const DEFAULT_PHARMACIES = [
  'Boots Pharmacy — High Street',
  'Day Lewis Pharmacy',
  'Lloyds Pharmacy — Station Road',
  'Well Pharmacy — Care Home delivery',
] as const
