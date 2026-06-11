import type { BodyMapMarkerRow, BodyMapRecordRow } from '@/features/service-users/body-map/types'
import type { BodyMapRecordTypeCode } from '@/features/service-users/body-map/catalog/record-types'
import type { SkinIntegrityCheckMetadata } from '@/features/service-users/initial-assessment/utils/skin-integrity-check'

const SKIN_RELEVANT_RECORD_TYPES = new Set<BodyMapRecordTypeCode>([
  'INJURY',
  'WOUND',
  'PRESSURE',
  'PAIN',
  'SKIN',
  'SAFEGUARDING',
  'DEVICE',
])

const CLOSED_MARKER_STATUSES = new Set(['CLOSED', 'RESOLVED'])

type BodyPartRule = {
  rowId: string
  test: (bodyPart: string) => boolean
}

const BODY_PART_RULES: BodyPartRule[] = [
  { rowId: 'ischial-tuberosities', test: (p) => /\bischial\b/i.test(p) },
  { rowId: 'sacrum', test: (p) => /\bsacrum\b/i.test(p) },
  { rowId: 'buttocks', test: (p) => /\bbuttock\b/i.test(p) },
  { rowId: 'ears', test: (p) => /\bear\b/i.test(p) },
  { rowId: 'jaw', test: (p) => /\bjaw\b|\bchin\b/i.test(p) },
  { rowId: 'cheeks', test: (p) => /\bcheek\b/i.test(p) },
  { rowId: 'shoulders', test: (p) => /\bshoulder\b/i.test(p) },
  { rowId: 'elbows', test: (p) => /\belbow\b/i.test(p) },
  { rowId: 'knees', test: (p) => /\bknee\b/i.test(p) },
  { rowId: 'heels', test: (p) => /\bheel\b/i.test(p) },
  { rowId: 'toes', test: (p) => /\btoe\b/i.test(p) },
  { rowId: 'ankles', test: (p) => /\bankle\b|\bachilles\b/i.test(p) },
  { rowId: 'hips', test: (p) => /\bhip\b/i.test(p) },
  {
    rowId: 'spine',
    test: (p) =>
      /\bspine\b|\bupper back\b|\blower back\b|\blumbar\b|\bthoracic\b/i.test(p),
  },
]

export function resolveSkinIntegrityRowId(bodyPart: string): string | null {
  const trimmed = bodyPart.trim()
  if (!trimmed) return null
  for (const rule of BODY_PART_RULES) {
    if (rule.test(trimmed)) return rule.rowId
  }
  return null
}

export function resolveSkinIntegritySide(marker: BodyMapMarkerRow): 'right' | 'left' {
  if (marker.side === 'LEFT') return 'left'
  return 'right'
}

export function formatBodyMapRecordForSkinIntegrity(record: BodyMapRecordRow): string {
  const marker = record.markers[0]
  const location = marker?.specificLocation?.trim() || marker?.bodyPart?.trim()
  const typeBits = [record.recordType, record.subType].filter(Boolean).join(' — ')
  const description = record.description?.trim()
  const status =
    marker?.status && marker.status !== 'ACTIVE' && marker.status !== 'MONITORING'
      ? ` [${marker.status}]`
      : ''

  const headline = [typeBits, location].filter(Boolean).join(' · ')
  if (description) return `${headline}: ${description}${status}`
  return `${headline}${status}`
}

function mergeCellText(existing: string, addition: string): string {
  const base = existing.trim()
  const next = addition.trim()
  if (!next) return base
  if (!base) return next
  if (base.includes(next)) return base
  return `${base}\n${next}`
}

export function isBodyMapRecordSyncable(record: BodyMapRecordRow): boolean {
  if (!SKIN_RELEVANT_RECORD_TYPES.has(record.recordType)) return false
  const marker = record.markers[0]
  if (!marker) return false
  if (CLOSED_MARKER_STATUSES.has(marker.status)) return false
  return Boolean(marker.bodyPart?.trim())
}

export type SkinIntegrityBodyMapSyncResult = {
  metadata: SkinIntegrityCheckMetadata
  syncedRecordCount: number
  skippedRecordCount: number
}

export function syncSkinIntegrityCheckFromBodyMap(
  current: SkinIntegrityCheckMetadata,
  records: BodyMapRecordRow[],
): SkinIntegrityBodyMapSyncResult {
  const rowIndex = new Map(current.rows.map((row, index) => [row.id, index]))
  const nextRows = current.rows.map((row) => ({ ...row }))

  let syncedRecordCount = 0
  let skippedRecordCount = 0

  for (const record of records) {
    if (!isBodyMapRecordSyncable(record)) continue
    const marker = record.markers[0]!
    const rowId = resolveSkinIntegrityRowId(marker.bodyPart)
    if (!rowId) {
      skippedRecordCount += 1
      continue
    }

    const rowIdx = rowIndex.get(rowId)
    if (rowIdx == null) {
      skippedRecordCount += 1
      continue
    }

    const side = resolveSkinIntegritySide(marker)
    const line = formatBodyMapRecordForSkinIntegrity(record)
    const row = nextRows[rowIdx]!
    row[side] = mergeCellText(row[side], line)
    syncedRecordCount += 1
  }

  return {
    metadata: { rows: nextRows },
    syncedRecordCount,
    skippedRecordCount,
  }
}
