import type { MedicationSupplyCard } from '@/features/service-users/api/medication-mar.api'

/** Client-side merge when API returns duplicate-name cards (e.g. stale backend). */
export function dedupeSupplyCards(cards: MedicationSupplyCard[]): MedicationSupplyCard[] {
  const byKey = new Map<string, MedicationSupplyCard>()

  for (const card of cards) {
    const key = card.medicationName.trim().toLowerCase()
    const existing = byKey.get(key)
    if (!existing) {
      byKey.set(key, {
        ...card,
        relatedMedicationIds: card.relatedMedicationIds ?? [card.medicationId],
      })
      continue
    }

    const relatedMedicationIds = [
      ...new Set([
        ...(existing.relatedMedicationIds ?? [existing.medicationId]),
        ...(card.relatedMedicationIds ?? [card.medicationId]),
      ]),
    ]

    const mergedDeliveries = [...existing.recentDeliveries, ...card.recentDeliveries]
      .sort((a, b) => new Date(b.deliveredAt).getTime() - new Date(a.deliveredAt).getTime())
      .filter((d, i, arr) => arr.findIndex(x => x.id === d.id) === i)
      .slice(0, 10)

    const pick =
      (existing.supplySummary ? existing : null) ??
      (card.supplySummary ? card : null) ??
      existing

    byKey.set(key, {
      ...pick,
      relatedMedicationIds,
      recentDeliveries: mergedDeliveries,
      supplySummary: pick.supplySummary ?? card.supplySummary,
    })
  }

  return [...byKey.values()].sort((a, b) => a.medicationName.localeCompare(b.medicationName))
}
