/**
 * Current conditions staged in the IA (`metadata.conditionProposals`). The API promotes them to the
 * conditions register on submit without overwriting — see careflow-api
 * `initial-assessment-condition-proposals.util.ts` (same shape).
 */
export type ConditionProposal = {
  id: string
  conditionId: string
  conditionName?: string
  impactOnCare?: string
  carerGuidance?: string
  confirmationSource?: string
}

export function normalizeConditionProposals(raw: unknown): ConditionProposal[] {
  if (!Array.isArray(raw)) return []
  const seen = new Set<string>()
  return raw.filter((r): r is ConditionProposal => {
    if (!r || typeof r !== 'object') return false
    const p = r as Partial<ConditionProposal>
    if (typeof p.id !== 'string' || typeof p.conditionId !== 'string' || !p.conditionId) return false
    if (seen.has(p.conditionId)) return false
    seen.add(p.conditionId)
    return true
  })
}

export function newConditionProposal(conditionId: string, conditionName: string): ConditionProposal {
  const id = globalThis.crypto?.randomUUID?.() ?? `cp-${Date.now()}-${Math.random().toString(16).slice(2)}`
  return { id, conditionId, conditionName }
}
