import type { InitialAssessmentAnswerInput } from '@/features/service-users/initial-assessment/types'

function normalizeSelectedOptions(
  value: InitialAssessmentAnswerInput['selectedOptions'],
): unknown {
  if (value == null) return null
  if (Array.isArray(value)) return [...value].map(String).sort()
  return value
}

function answerSnapshot(answer: InitialAssessmentAnswerInput): string {
  return JSON.stringify([
    answer.checked ?? null,
    answer.booleanValue ?? null,
    answer.textValue ?? null,
    answer.numberValue ?? null,
    answer.dateValue ?? null,
    answer.timeValue ?? null,
    normalizeSelectedOptions(answer.selectedOptions),
    answer.notes ?? null,
    answer.secureMasked ?? null,
    answer.hasSecureValue ?? null,
  ])
}

/** Stable compare for draft answer maps — avoids re-render / autosave loops on identical content. */
export function draftAnswersEqual(
  a: Record<string, InitialAssessmentAnswerInput>,
  b: Record<string, InitialAssessmentAnswerInput>,
): boolean {
  const aKeys = Object.keys(a).sort()
  const bKeys = Object.keys(b).sort()
  if (aKeys.length !== bKeys.length) return false
  for (let i = 0; i < aKeys.length; i += 1) {
    if (aKeys[i] !== bKeys[i]) return false
    const key = aKeys[i]!
    if (answerSnapshot(a[key]!) !== answerSnapshot(b[key]!)) return false
  }
  return true
}
