import type { MedicationRoundLookup } from '@/features/service-users/medication/medication-time-slots'
import type {
  InitialAssessmentAnswer,
  InitialAssessmentAnswerInput,
  InitialAssessmentQuestion,
} from '@/features/service-users/initial-assessment/types'
import {
  formatPreferredVisitTimesAnswer,
  hasPreferredVisitTimesAnswer,
  isPreferredVisitTimesQuestion,
  parsePreferredVisitTimesValue,
} from '@/features/service-users/initial-assessment/utils/preferred-visit-times'
import { resolveVisitTimeSlotOptions } from '@/features/service-users/initial-assessment/utils/visit-time-slot-options'

export type IaPreferredVisitTimeSlot = {
  code: string
  label: string
  from?: string
  to?: string
}

export type IaPreferredVisitTimesSummary = {
  hasAnswer: boolean
  summaryText: string
  selectedSlots: IaPreferredVisitTimeSlot[]
}

function isPreferredVisitTimesAnswer(answer: InitialAssessmentAnswer): boolean {
  const meta = answer.question?.metadata
  if (meta && typeof meta === 'object' && !Array.isArray(meta)) {
    if ((meta as { fieldKey?: string }).fieldKey === 'preferredVisitTimes') return true
  }
  return answer.question?.questionText?.toLowerCase().includes('preferred visit times') ?? false
}

function answerToQuestion(answer: InitialAssessmentAnswer): InitialAssessmentQuestion | null {
  if (!answer.question) return null
  return {
    id: answer.questionId,
    questionText: answer.question.questionText,
    questionType: answer.question.questionType as InitialAssessmentQuestion['questionType'],
    isRequired: false,
    sortOrder: 0,
    riskFlag: answer.question.riskFlag ?? false,
    carePlanTrigger: answer.question.carePlanTrigger ?? false,
    metadata:
      answer.question.metadata && typeof answer.question.metadata === 'object'
        ? (answer.question.metadata as Record<string, unknown>)
        : null,
  }
}

function answerInputFromRow(answer: InitialAssessmentAnswer): InitialAssessmentAnswerInput {
  return {
    questionId: answer.questionId,
    selectedOptions: answer.selectedOptions as InitialAssessmentAnswerInput['selectedOptions'],
  }
}

export function resolveIaPreferredVisitTimesFromAnswers(
  answers: InitialAssessmentAnswer[],
  rounds: MedicationRoundLookup[] = [],
): IaPreferredVisitTimesSummary | null {
  const answer = answers.find(isPreferredVisitTimesAnswer)
  if (!answer) return null

  const question = answerToQuestion(answer)
  if (!question || !isPreferredVisitTimesQuestion(question)) return null

  const input = answerInputFromRow(answer)
  const slotOptions = resolveVisitTimeSlotOptions(question, rounds)
  const hasAnswer = hasPreferredVisitTimesAnswer(input, question, rounds)
  if (!hasAnswer) {
    return { hasAnswer: false, summaryText: '', selectedSlots: [] }
  }

  const parsed = parsePreferredVisitTimesValue(input.selectedOptions, slotOptions)
  const selectedSlots: IaPreferredVisitTimeSlot[] = []
  for (const opt of slotOptions) {
    const slot = parsed[opt.value]
    if (!slot?.selected) continue
    selectedSlots.push({
      code: opt.value,
      label: slot.roundName?.trim() || opt.label,
      from: slot.from?.trim() || opt.defaultFrom,
      to: slot.to?.trim() || opt.defaultTo,
    })
  }

  return {
    hasAnswer: true,
    summaryText: formatPreferredVisitTimesAnswer(input, question, rounds),
    selectedSlots,
  }
}
