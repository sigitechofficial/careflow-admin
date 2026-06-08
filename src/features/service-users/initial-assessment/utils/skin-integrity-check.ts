export type SkinIntegrityCheckRow = {
  id: string
  label: string
  right: string
  left: string
}

export type SkinIntegrityCheckMetadata = {
  rows: SkinIntegrityCheckRow[]
}

/** Body parts from the paper Total skin integrity check worksheet. */
export const SKIN_INTEGRITY_CHECK_BODY_PARTS: ReadonlyArray<{ id: string; label: string }> = [
  { id: 'ears', label: 'Ears' },
  { id: 'jaw', label: 'Jaw' },
  { id: 'cheeks', label: 'Cheeks' },
  { id: 'shoulders', label: 'Shoulders' },
  { id: 'hips', label: 'Hips' },
  { id: 'knees', label: 'Knees (inner/outer)' },
  { id: 'elbows', label: 'Elbows' },
  { id: 'sacrum', label: 'Sacrum' },
  { id: 'spine', label: 'Spine (thoracic/lumbar)' },
  { id: 'buttocks', label: 'Buttocks' },
  { id: 'ischial-tuberosities', label: 'Ischial Tuberosities' },
  { id: 'heels', label: 'Heels' },
  { id: 'toes', label: 'Toes (list toes affected)' },
  { id: 'ankles', label: 'Ankles' },
]

export const SKIN_INTEGRITY_CHECK_COMPLETION_NOTES =
  'Inspect all areas labelled and complete condition of each – state whether erythema present (blanching or non-blanching), moisture lesions, blister, discolouration, pressure ulcers (with category if able to state).'

export function defaultSkinIntegrityCheckRows(): SkinIntegrityCheckRow[] {
  return SKIN_INTEGRITY_CHECK_BODY_PARTS.map((part) => ({
    id: part.id,
    label: part.label,
    right: '',
    left: '',
  }))
}

export function defaultSkinIntegrityCheckMetadata(): SkinIntegrityCheckMetadata {
  return { rows: defaultSkinIntegrityCheckRows() }
}

export function normalizeSkinIntegrityCheckRows(
  raw: unknown,
): SkinIntegrityCheckRow[] {
  const defaults = defaultSkinIntegrityCheckRows()
  if (!Array.isArray(raw)) return defaults

  const byId = new Map<string, Partial<SkinIntegrityCheckRow>>()
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    const id = typeof row.id === 'string' ? row.id : undefined
    if (!id) continue
    byId.set(id, {
      right: typeof row.right === 'string' ? row.right : '',
      left: typeof row.left === 'string' ? row.left : '',
    })
  }

  return defaults.map((base) => {
    const saved = byId.get(base.id)
    return {
      ...base,
      right: saved?.right ?? '',
      left: saved?.left ?? '',
    }
  })
}

export function normalizeSkinIntegrityCheckMetadata(
  raw: unknown,
): SkinIntegrityCheckMetadata {
  if (!raw || typeof raw !== 'object') return defaultSkinIntegrityCheckMetadata()
  const meta = raw as Record<string, unknown>
  return { rows: normalizeSkinIntegrityCheckRows(meta.rows) }
}

export function patchSkinIntegrityCheckRow(
  rows: SkinIntegrityCheckRow[],
  rowId: string,
  side: 'right' | 'left',
  text: string,
): SkinIntegrityCheckRow[] {
  return rows.map((row) =>
    row.id === rowId ? { ...row, [side]: text } : { ...row },
  )
}

export function skinIntegrityCheckHasEntries(metadata: SkinIntegrityCheckMetadata): boolean {
  return metadata.rows.some((row) => row.right.trim() || row.left.trim())
}
