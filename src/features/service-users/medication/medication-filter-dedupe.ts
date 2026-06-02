import type { ServiceUserMedicationRow } from '@/features/service-users/api/service-users.api'

export type MedicationFilterOption = {
  /** Primary id shown in the UI */
  canonicalId: string
  name: string
  /** All DB row ids for this medication name (demo duplicates, etc.) */
  relatedIds: string[]
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase()
}

/** One checkbox per medication name; export/chart filter uses all related row ids. */
export function groupMedicationsForFilter(
  rows: ServiceUserMedicationRow[],
): MedicationFilterOption[] {
  const active = rows.filter(r => r.status === 'ACTIVE' || r.status === 'PAUSED')
  const byKey = new Map<string, ServiceUserMedicationRow[]>()

  for (const row of active) {
    const key = normalizeName(row.medicationName)
    const list = byKey.get(key) ?? []
    list.push(row)
    byKey.set(key, list)
  }

  const options: MedicationFilterOption[] = []
  for (const members of byKey.values()) {
    const canonical = [...members].sort((a, b) => a.id.localeCompare(b.id))[0]!
    options.push({
      canonicalId: canonical.id,
      name: canonical.medicationName,
      relatedIds: members.map(m => m.id),
    })
  }

  return options.sort((a, b) => a.name.localeCompare(b.name))
}

export type MarExportPackFilterGroup = {
  packId: string
  packName: string
  members: MedicationFilterOption[]
}

export type MarExportMedicationFilterGroups = {
  packGroups: MarExportPackFilterGroup[]
  standalone: MedicationFilterOption[]
}

/** Split active medications into blister pack groups and standalone rows for MAR export filters. */
export function buildExportMedicationFilterGroups(
  rows: ServiceUserMedicationRow[],
): MarExportMedicationFilterGroups {
  const active = rows.filter(r => r.status === 'ACTIVE' || r.status === 'PAUSED')
  const standaloneRows: ServiceUserMedicationRow[] = []
  const byPackId = new Map<string, ServiceUserMedicationRow[]>()

  for (const row of active) {
    const packId = row.medicationPack?.id
    if (packId) {
      const list = byPackId.get(packId) ?? []
      list.push(row)
      byPackId.set(packId, list)
    } else {
      standaloneRows.push(row)
    }
  }

  const packGroups: MarExportPackFilterGroup[] = [...byPackId.entries()]
    .map(([packId, packRows]) => ({
      packId,
      packName: packRows[0]!.medicationPack!.name,
      members: groupMedicationsForFilter(packRows),
    }))
    .sort((a, b) => a.packName.localeCompare(b.packName))

  return {
    packGroups,
    standalone: groupMedicationsForFilter(standaloneRows),
  }
}

export function packFilterMemberIds(pack: MarExportPackFilterGroup): string[] {
  return expandMedicationFilterIds(
    pack.members.map(m => m.canonicalId),
    pack.members,
  )
}

export function isPackFullySelected(
  pack: MarExportPackFilterGroup,
  selectedCanonicalIds: string[],
): boolean {
  return pack.members.every(m => selectedCanonicalIds.includes(m.canonicalId))
}

export function isPackPartiallySelected(
  pack: MarExportPackFilterGroup,
  selectedCanonicalIds: string[],
): boolean {
  const selected = pack.members.filter(m => selectedCanonicalIds.includes(m.canonicalId))
  return selected.length > 0 && selected.length < pack.members.length
}

export function expandMedicationFilterIds(
  selectedCanonicalIds: string[],
  options: MedicationFilterOption[],
): string[] {
  if (selectedCanonicalIds.length === 0) return []
  const byCanonical = new Map(options.map(o => [o.canonicalId, o]))
  return [
    ...new Set(
      selectedCanonicalIds.flatMap(id => byCanonical.get(id)?.relatedIds ?? [id]),
    ),
  ]
}
