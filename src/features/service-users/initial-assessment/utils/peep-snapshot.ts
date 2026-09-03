/** PEEP snapshot stored on assessment completions (`snapshot.peep`). Matches IA §16 fieldKeys. */

export type PeepSnapshot = {
  canSelfEvacuate?: boolean | null
  peepAssistanceRequired?: string
  peepEquipmentRequired?: string
  peepEvacuationProcedure?: string
  peepAlarmWarningConsiderations?: string
  peepRefugeLocation?: string
  peepDiscussedWithPerson?: boolean | null
  peepReviewDate?: string
}

const PEEP_ASSISTED_TEXT_KEYS = [
  'peepAssistanceRequired',
  'peepEquipmentRequired',
  'peepEvacuationProcedure',
  'peepAlarmWarningConsiderations',
  'peepRefugeLocation',
] as const

function boolAnswered(value: boolean | null | undefined): boolean {
  return value === true || value === false
}

export function defaultPeepSnapshot(): PeepSnapshot {
  return {}
}

export function normalizePeepSnapshot(raw: unknown): PeepSnapshot {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return defaultPeepSnapshot()
  const row = raw as Record<string, unknown>
  const out: PeepSnapshot = {}
  if (row.canSelfEvacuate === true || row.canSelfEvacuate === false) {
    out.canSelfEvacuate = row.canSelfEvacuate
  }
  for (const key of PEEP_ASSISTED_TEXT_KEYS) {
    if (typeof row[key] === 'string') out[key] = row[key]
  }
  if (row.peepDiscussedWithPerson === true || row.peepDiscussedWithPerson === false) {
    out.peepDiscussedWithPerson = row.peepDiscussedWithPerson
  }
  if (typeof row.peepReviewDate === 'string') out.peepReviewDate = row.peepReviewDate
  return out
}

/** Parent Yes is complete. Parent No requires the assisted-evacuation fields. */
export function isPeepSnapshotComplete(peep: PeepSnapshot | undefined): boolean {
  if (!peep) return false
  if (!boolAnswered(peep.canSelfEvacuate)) return false
  if (peep.canSelfEvacuate === true) return true
  for (const key of PEEP_ASSISTED_TEXT_KEYS) {
    if (!peep[key]?.trim()) return false
  }
  if (!boolAnswered(peep.peepDiscussedWithPerson)) return false
  if (!peep.peepReviewDate?.trim()) return false
  return true
}

export function formatPeepHistorySummary(peep: PeepSnapshot | undefined): string | null {
  if (!isPeepSnapshotComplete(peep)) return null
  return peep!.canSelfEvacuate === true
    ? 'PEEP completed — can self-evacuate'
    : 'PEEP completed — assistance required'
}
