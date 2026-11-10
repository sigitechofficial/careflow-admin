/**
 * Respondent text and conditional questions, as people answer. Same rules as the API
 * (survey-question-config.util.ts), which checks them again on submit:
 * - "Show only if": a question is asked only when an earlier question's answer is one of a list
 *   (multiple choice: any ticked answer). Hidden questions are not required and their answers
 *   are not sent.
 * - "Other (please tell us)": choosing it shows a text box (required unless set otherwise).
 * - Comment box: offered once the question is answered — after any answer, or only after the
 *   listed answers.
 * - Answers that clear the others (multiple choice): ticking "None of these" clears the other
 *   ticks, and ticking another answer clears it.
 */
import {
  MAX_RESPONDENT_TEXT,
  type SurveyAnswerInput,
  type SurveyQuestionLogic,
  type SurveyQuestionType,
} from '@/features/surveys/types'
import { likertLabels } from '@/features/surveys/survey-likert'

type LogicQuestion = {
  id: string
  questionType: SurveyQuestionType
  options: string[] | null
  isRequired: boolean
  questionText: string
} & SurveyQuestionLogic

export function hasAnswer(type: SurveyQuestionType, answer: SurveyAnswerInput | undefined): boolean {
  if (!answer) return false
  switch (type) {
    case 'YES_NO':
      return typeof answer.booleanValue === 'boolean'
    case 'SINGLE_SELECT':
    case 'LIKERT':
    case 'MULTI_SELECT':
      return Boolean(answer.selectedOptions?.length)
    case 'TEXT':
    case 'TEXTAREA':
      return Boolean(answer.textValue?.trim())
    case 'NUMBER':
    case 'RATING':
      return typeof answer.numberValue === 'number' && !Number.isNaN(answer.numberValue)
    default:
      return false
  }
}

/** The labels an answer reads as for rules: Yes / No, chosen options, a rating's score. */
export function answerLabels(q: Pick<LogicQuestion, 'questionType'>, answer: SurveyAnswerInput | undefined): string[] {
  if (!answer) return []
  switch (q.questionType) {
    case 'YES_NO':
      return typeof answer.booleanValue === 'boolean' ? [answer.booleanValue ? 'Yes' : 'No'] : []
    case 'SINGLE_SELECT':
    case 'MULTI_SELECT':
    case 'LIKERT':
      return answer.selectedOptions ?? []
    case 'RATING':
      return typeof answer.numberValue === 'number' && !Number.isNaN(answer.numberValue) ? [String(answer.numberValue)] : []
    default:
      return []
  }
}

/** Every answer a question can be given, for the builder's pickers (null for free entry). */
export function answerChoices(
  q: Pick<LogicQuestion, 'questionType' | 'options' | 'otherOption'> & { config?: Record<string, unknown> | null },
): string[] | null {
  switch (q.questionType) {
    case 'YES_NO':
      return ['Yes', 'No']
    case 'SINGLE_SELECT':
    case 'MULTI_SELECT':
      return [...(q.options ?? []), ...(q.otherOption ? [q.otherOption.label] : [])]
    case 'LIKERT':
      return likertLabels(q.options)
    case 'RATING': {
      const min = typeof q.config?.min === 'number' ? q.config.min : 0
      const max = typeof q.config?.max === 'number' ? q.config.max : 10
      return Array.from({ length: Math.max(0, max - min) + 1 }, (_, i) => String(min + i))
    }
    default:
      return null
  }
}

/** Whether a question is asked, given the answers so far. */
export function isShown(
  q: LogicQuestion,
  questions: readonly LogicQuestion[],
  answers: Record<string, SurveyAnswerInput | undefined>,
): boolean {
  const rule = q.showIf
  if (!rule) return true
  const ref = questions.find(x => x.key === rule.questionKey) ?? questions.find(x => x.id === rule.questionId)
  // A rule pointing at a question that is not on the form never hides anything.
  if (!ref || ref.id === q.id) return true
  if (ref.showIf && !isShown(ref, questions.filter(x => x.id !== q.id), answers)) return false
  return answerLabels(ref, answers[ref.id]).some(label => rule.answers.includes(label))
}

/** The questions asked, in order, given the answers so far. */
export function visibleQuestions<Q extends LogicQuestion>(
  questions: readonly Q[],
  answers: Record<string, SurveyAnswerInput | undefined>,
): Q[] {
  return questions.filter(q => isShown(q, questions, answers))
}

/** True when the person chose the question's "Other" option. */
export function otherChosen(q: LogicQuestion, answer: SurveyAnswerInput | undefined): boolean {
  return Boolean(q.otherOption && answer?.selectedOptions?.includes(q.otherOption.label))
}

/** Whether the comment box is offered: once answered, after any answer or the listed ones. */
export function commentShown(q: LogicQuestion, answer: SurveyAnswerInput | undefined): boolean {
  const config = q.commentConfig
  if (!config || !hasAnswer(q.questionType, answer)) return false
  return !config.showWhen?.length || answerLabels(q, answer).some(label => config.showWhen!.includes(label))
}

/** Multiple choice tick / untick, with answers that clear the others. */
export function toggleMultiOption(
  q: Pick<LogicQuestion, 'exclusiveOptions'>,
  selected: readonly string[],
  option: string,
): string[] {
  if (selected.includes(option)) return selected.filter(s => s !== option)
  const exclusive = q.exclusiveOptions ?? []
  if (exclusive.includes(option)) return [option]
  return [...selected.filter(s => !exclusive.includes(s)), option]
}

/** What still needs doing before the answers can be sent: required questions and Other text. */
export function answerProblems(
  questions: readonly LogicQuestion[],
  answers: Record<string, SurveyAnswerInput | undefined>,
): { missingRequired: LogicQuestion[]; missingOtherText: LogicQuestion[] } {
  const shown = visibleQuestions(questions, answers)
  return {
    missingRequired: shown.filter(q => q.isRequired && !hasAnswer(q.questionType, answers[q.id])),
    missingOtherText: shown.filter(
      q => q.otherOption?.textRequired && otherChosen(q, answers[q.id]) && !answers[q.id]?.otherText?.trim(),
    ),
  }
}

const clip = (text: string | undefined) => {
  const trimmed = text?.trim()
  return trimmed ? trimmed.slice(0, MAX_RESPONDENT_TEXT) : undefined
}

/**
 * Answers to send: only questions that are asked and answered; Other text only when Other is
 * chosen; comments only when the comment box is offered (all trimmed).
 */
export function answersToSend(
  questions: readonly LogicQuestion[],
  answers: Record<string, SurveyAnswerInput | undefined>,
): SurveyAnswerInput[] {
  return visibleQuestions(questions, answers)
    .filter(q => hasAnswer(q.questionType, answers[q.id]))
    .map(q => {
      const { otherText, comment, ...rest } = answers[q.id]!
      const other = otherChosen(q, answers[q.id]) ? clip(otherText) : undefined
      const note = commentShown(q, answers[q.id]) ? clip(comment) : undefined
      return { ...rest, ...(other ? { otherText: other } : {}), ...(note ? { comment: note } : {}) }
    })
}

/** Plain-English description of a show-if rule, e.g. Asked only if “Q” is Rarely or Never. */
export function describeShowIf(
  rule: { answers: string[] },
  questionText: string | null | undefined,
): string {
  const answers = rule.answers.length > 1
    ? `${rule.answers.slice(0, -1).join(', ')} or ${rule.answers[rule.answers.length - 1]}`
    : (rule.answers[0] ?? '')
  return `Asked only if “${questionText ?? 'an earlier question'}” is ${answers}`
}

/** Short descriptions of a question's extras for lists and the Ready-made reader. */
export function describeQuestionExtras(
  q: SurveyQuestionLogic & { notCountedOptions?: string[] },
  questionTextByKey: (key: string) => string | null | undefined,
): string[] {
  const out: string[] = []
  if (q.notCountedOptions?.length) out.push(`Not counted in percentages: ${q.notCountedOptions.join(', ')}`)
  if (q.otherOption) out.push(q.otherOption.label)
  for (const option of q.exclusiveOptions ?? []) out.push(`Choosing “${option}” clears other answers`)
  if (q.commentConfig) {
    out.push(
      q.commentConfig.showWhen?.length
        ? `Comment box after: ${q.commentConfig.showWhen.join(', ')}`
        : 'Comment box after any answer',
    )
  }
  if (q.showIf) out.push(describeShowIf(q.showIf, questionTextByKey(q.showIf.questionKey)))
  return out
}

/**
 * The questions asked of someone answering without their name: the contact-me question is left out
 * (we could not reply), and so is any question asked only after it. Same rule as the API.
 */
export function questionsAsked<Q extends LogicQuestion & { contactRequest?: boolean }>(
  questions: readonly Q[],
  withoutName: boolean,
): Q[] {
  if (!withoutName) return [...questions]
  const removed = new Set(questions.filter(q => q.contactRequest).map(q => q.id))
  let changed = removed.size > 0
  while (changed) {
    changed = false
    for (const q of questions) {
      if (removed.has(q.id) || !q.showIf) continue
      const ref =
        questions.find(x => x.key === q.showIf!.questionKey) ?? questions.find(x => x.id === q.showIf!.questionId)
      if (ref && removed.has(ref.id)) {
        removed.add(q.id)
        changed = true
      }
    }
  }
  return questions.filter(q => !removed.has(q.id))
}
