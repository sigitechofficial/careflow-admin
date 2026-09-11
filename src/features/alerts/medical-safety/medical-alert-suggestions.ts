import type { InitialAssessmentRiskRecord } from '@/features/service-users/initial-assessment/types'
import type { MedicalSafetyItem } from '@/features/alerts/medical-safety/types'

export type ClinicalGateSuggestion = 'YES' | 'NO' | 'UNKNOWN'

/** Evidence-backed suggestion only — never invent YES/NO without supporting information. */
export type ResolvedSuggestion = {
  suggestion: ClinicalGateSuggestion
  suggestionDetail: string | null
}

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}

function looksLikeQuestion(text: string): boolean {
  const t = normalizeText(text)
  if (!t) return false
  if (t.endsWith('?')) return true
  return /^(any|is|are|does|do|has|have|was|were|please\s+confirm)\b/i.test(t)
}

function isYesNoStub(text: string): boolean {
  return /^(yes|no|n\/a|na|-|—)$/i.test(normalizeText(text))
}

/** Titles / labels / section names are not supporting clinical answers. */
function isLabelOrTitleOnly(text: string): boolean {
  const t = normalizeText(text)
  if (!t) return true
  if (looksLikeQuestion(t)) return true
  // Generic risk-type titles produced by snapshot mapping, e.g. "Falls risk"
  if (/^(falls|choking|nutrition|hydration|moving\s*&\s*handling|medication|safeguarding|other)\s+risk$/i.test(t)) {
    return true
  }
  return false
}

export function isMeaningfulSupportingText(text: string | null | undefined, question = ''): boolean {
  const t = normalizeText(text ?? '')
  if (!t || t.length < 3) return false
  if (isYesNoStub(t)) return false
  if (looksLikeQuestion(t)) return false
  if (isLabelOrTitleOnly(t)) return false
  // API / UI status placeholders are not clinical evidence
  if (/^no active flash message\b/i.test(t)) return false
  if (question && normalizeText(question).toLowerCase() === t.toLowerCase()) return false
  return true
}

/**
 * Empty flash API responses use status copy ("No active flash message") with data: null.
 * That is not an active clinical flash and must not drive General Alert suggestions.
 */
export function isActiveFlashMessageText(message: string | null | undefined): boolean {
  const t = normalizeText(message ?? '')
  if (!t) return false
  if (/^no active flash message\b/i.test(t)) return false
  return true
}

/**
 * Build a suggestion only when both indication and real supporting information exist.
 * Missing/empty/question-only evidence → no suggestion.
 */
export function resolveSuggestion(
  indication: 'YES' | 'NO' | null | undefined,
  supportingInfo: string | null | undefined,
): ResolvedSuggestion {
  const detail = normalizeText(supportingInfo ?? '')
  if (!indication || !isMeaningfulSupportingText(detail)) {
    return { suggestion: 'UNKNOWN', suggestionDetail: null }
  }
  return { suggestion: indication, suggestionDetail: detail }
}

export function hasViewableSuggestion(row: {
  suggestion: ClinicalGateSuggestion
  suggestionDetail?: string | null
}): boolean {
  return (
    (row.suggestion === 'YES' || row.suggestion === 'NO') &&
    isMeaningfulSupportingText(row.suggestionDetail)
  )
}

/** Prefer risk description / control measures — never question text or type title alone. */
export function supportingInfoFromIaRisk(
  record: InitialAssessmentRiskRecord | null | undefined,
): string | null {
  if (!record || record.status === 'CLOSED') return null
  const question = record.sourceQuestionText ?? ''
  const parts: string[] = []
  if (isMeaningfulSupportingText(record.description, question)) {
    parts.push(normalizeText(record.description))
  }
  if (isMeaningfulSupportingText(record.controlMeasures, question)) {
    parts.push(`Controls: ${normalizeText(record.controlMeasures ?? '')}`)
  }
  if (parts.length === 0) return null
  parts.push(`Status: ${record.status} · Level: ${record.riskLevel}`)
  return parts.join('\n')
}

export function findOpenIaRisks(
  records: InitialAssessmentRiskRecord[] | null | undefined,
  types: InitialAssessmentRiskRecord['riskType'][],
): InitialAssessmentRiskRecord[] {
  return (records ?? []).filter((r) => r.status !== 'CLOSED' && types.includes(r.riskType))
}

export function findOpenIaRisksByText(
  records: InitialAssessmentRiskRecord[] | null | undefined,
  pattern: RegExp,
): InitialAssessmentRiskRecord[] {
  return (records ?? []).filter((r) => {
    if (r.status === 'CLOSED') return false
    const blob = `${r.description ?? ''} ${r.sourceQuestionText ?? ''} ${r.controlMeasures ?? ''}`
    return pattern.test(blob)
  })
}

export function joinIaRiskEvidence(records: InitialAssessmentRiskRecord[]): string | null {
  const parts = records
    .map((r) => supportingInfoFromIaRisk(r))
    .filter((v): v is string => Boolean(v))
  return parts.length ? parts.join('\n\n') : null
}

export function allergySuggestionDetail(items: MedicalSafetyItem[]): string | null {
  if (!items.length) return null
  const lines = items
    .map((a) => {
      const title = normalizeText(a.title)
      if (!title || isLabelOrTitleOnly(title)) return null
      const desc = a.description?.trim()
      if (desc && isMeaningfulSupportingText(desc) && !/^allergy recorded$/i.test(desc)) {
        return `${title} — ${desc}`
      }
      return title
    })
    .filter((v): v is string => Boolean(v))
  return lines.length ? lines.join('\n') : null
}
