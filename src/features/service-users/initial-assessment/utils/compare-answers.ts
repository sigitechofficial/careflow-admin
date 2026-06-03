import { formatAnswerForDisplay } from '@/features/service-users/initial-assessment/utils/answer-display'
import { specRefOf } from '@/features/service-users/initial-assessment/utils/question-lookup'
import type {
  InitialAssessmentAnswer,
  InitialAssessmentAnswerInput,
  InitialAssessmentQuestion,
  InitialAssessmentSection,
} from '@/features/service-users/initial-assessment/types'

export type CompareRow = {
  specRef: string
  questionText: string
  valueA: string
  valueB: string
  changed: boolean
}

function toAnswerSelectedOptions(
  raw: unknown,
): InitialAssessmentAnswerInput['selectedOptions'] | undefined {
  if (raw == null) return undefined
  if (typeof raw === 'string' || Array.isArray(raw)) return raw
  if (typeof raw === 'object' && Object.keys(raw as object).length > 0) {
    return raw as Record<string, unknown>
  }
  return undefined
}

function toInputMap(answers: InitialAssessmentAnswer[]): Record<string, InitialAssessmentAnswerInput> {
  const map: Record<string, InitialAssessmentAnswerInput> = {}
  for (const a of answers) {
    map[a.questionId] = {
      questionId: a.questionId,
      checked: a.checked ?? undefined,
      booleanValue: a.booleanValue ?? undefined,
      textValue: a.textValue ?? undefined,
      numberValue: a.numberValue ?? undefined,
      dateValue: a.dateValue ?? undefined,
      timeValue: a.timeValue ?? undefined,
      selectedOptions: toAnswerSelectedOptions(a.selectedOptions),
      notes: a.notes ?? undefined,
    }
  }
  return map
}

export function buildCompareRows(
  sections: InitialAssessmentSection[],
  answersA: InitialAssessmentAnswer[],
  answersB: InitialAssessmentAnswer[],
): CompareRow[] {
  const mapA = toInputMap(answersA)
  const mapB = toInputMap(answersB)
  const questions: InitialAssessmentQuestion[] = []
  for (const sec of sections) {
    for (const q of sec.questions) questions.push(q)
  }

  const rows: CompareRow[] = []
  for (const q of questions) {
    const ref = specRefOf(q) ?? '—'
    const valueA = formatAnswerForDisplay(mapA[q.id], q)
    const valueB = formatAnswerForDisplay(mapB[q.id], q)
    const changed = valueA !== valueB
    if (changed) {
      rows.push({ specRef: ref, questionText: q.questionText, valueA, valueB, changed })
    }
  }
  return rows
}
