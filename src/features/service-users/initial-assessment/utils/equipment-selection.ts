/** Equipment selection worksheet — holistic tab 6 (selection recorded against Waterlow band). */

export type EquipmentSelectionMetadata = {
  waterlowScore?: string
  selectedRiskLevel?: string
  selectedEquipment?: string
  equipmentInPlace?: boolean | null
  otReferralRequired?: boolean | null
  notes?: string
}

export function defaultEquipmentSelectionMetadata(): EquipmentSelectionMetadata {
  return {}
}

export function normalizeEquipmentSelectionMetadata(raw: unknown): EquipmentSelectionMetadata {
  if (!raw || typeof raw !== 'object') return defaultEquipmentSelectionMetadata()
  const row = raw as EquipmentSelectionMetadata
  return {
    waterlowScore: typeof row.waterlowScore === 'string' ? row.waterlowScore : undefined,
    selectedRiskLevel:
      typeof row.selectedRiskLevel === 'string' ? row.selectedRiskLevel : undefined,
    selectedEquipment:
      typeof row.selectedEquipment === 'string' ? row.selectedEquipment : undefined,
    equipmentInPlace: row.equipmentInPlace ?? undefined,
    otReferralRequired: row.otReferralRequired ?? undefined,
    notes: typeof row.notes === 'string' ? row.notes : undefined,
  }
}

export function isEquipmentSelectionComplete(meta: EquipmentSelectionMetadata | undefined): boolean {
  if (!meta) return false
  if (!meta.selectedRiskLevel?.trim()) return false
  if (!meta.selectedEquipment?.trim()) return false
  return true
}

export function formatEquipmentSelectionHistorySummary(
  meta: EquipmentSelectionMetadata | undefined,
): string | null {
  if (!isEquipmentSelectionComplete(meta)) return null
  const risk = meta!.selectedRiskLevel!.trim()
  const equipment = meta!.selectedEquipment!.trim()
  return `Equipment selection recorded (${risk}: ${equipment})`
}
