import type { ServiceUserMedicationRow } from '@/features/service-users/api/service-users.api'

export type MedicationPickerOption = {
  /** Canonical row id for the checkbox value */
  id: string
  name: string
  /** All DB ids with the same medication name (demo duplicates, etc.) */
  relatedIds: string[]
}

function normalizeMedName(name: string): string {
  return name.trim().toLowerCase()
}

/** One checkbox per distinct medication name; export/chart filters use all relatedIds. */
export function groupMedicationsForPicker(
  rows: ServiceUserMedicationRow[],
): MedicationPickerOption[] {
  const byKey = new Map<string, ServiceUserMedicationRow[]>()

  for (const row of rows) {
    if (row.status !== 'ACTIVE' && row.status !== 'PAUSED') continue
    const key = normalizeMedName(row.medicationName)
    const list = byKey.get(key)
    if (list) list.push(row)
    else byKey.set(key, [row])
  }

  const options: MedicationPickerOption[] = []
  for (const members of byKey.values()) {
    const sorted = [...members].sort((a, b) => a.id.localeCompare(b.id))
    const canonical = sorted[0]!
    options.push({
      id: canonical.id,
      name: canonical.medicationName,
      relatedIds: sorted.map(m => m.id),
    })
  }

  return options.sort((a, b) => a.name.localeCompare(b.name))
}

export function expandMedicationFilterIds(
  selectedCanonicalIds: string[],
  options: MedicationPickerOption[],
): string[] {
  if (selectedCanonicalIds.length === 0) return []
  const byCanonical = new Map(options.map(o => [o.id, o]))
  const ids = new Set<string>()
  for (const id of selectedCanonicalIds) {
    const opt = byCanonical.get(id)
    if (opt) opt.relatedIds.forEach(rid => ids.add(rid))
    else ids.add(id)
  }
  return [...ids]
}
