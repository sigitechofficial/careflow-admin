/**
 * The Add / Edit question editor's working copy of a question, and how it is saved. Same rules as
 * the API (survey-question-config.util.ts), which checks them again:
 * - choice questions need two or more different answers; a scale its labels; a score whole-number
 *   bounds (0–100);
 * - answers can be marked "Not counted in percentages" (choice and scale questions), but not all;
 * - an Other choice needs a label (not one of the answers) and a prompt; a comment box a prompt;
 * - "Show only if" needs an earlier, always-asked question and at least one of its answers.
 */
import {
  CHOICE_QUESTION_TYPES,
  type CreateQuestionInput,
  type PublicSurveyQuestion,
  type SurveyQuestion,
  type SurveyQuestionType,
} from '@/features/surveys/types'
import { answerChoices } from '@/features/surveys/survey-logic'
import { AGREEMENT_SCALE, STANDARD_SCALES, isBuiltInAgreementScale, likertLabels } from '@/features/surveys/survey-likert'

/** One answer (or scale label) being edited. */
export type AnswerRow = {
  /** Stable while editing (for keys and focus), never saved. */
  id: string
  text: string
  /** Several answers: choosing it clears the others ("None of these"). */
  exclusive: boolean
  /** Left out of percentages ("Don't know"). */
  notCounted: boolean
}

export type QuestionDraft = {
  questionText: string
  questionType: SurveyQuestionType
  helpText: string
  isRequired: boolean
  /** One answer / Several answers: the answers, in order. */
  options: AnswerRow[]
  /** One answer / Several answers: take the answers from a CareFlow list instead ('' = own answers). */
  optionsFrom: string
  /** Scale: its labels, first to last. */
  scale: AnswerRow[]
  ratingMin: string
  ratingMax: string
  /** Section heading the question sits under (empty = none). */
  sectionTitle: string
  otherEnabled: boolean
  otherLabel: string
  otherPrompt: string
  otherRequired: boolean
  commentEnabled: boolean
  commentPrompt: string
  /** The comment box after any answer, or only after the answers in commentShowWhen. */
  commentWhen: 'ANY' | 'SOME'
  commentShowWhen: string[]
  /** "Show only if": the earlier question's key ('' = always asked) and its answers. */
  showIfKey: string
  showIfAnswers: string[]
}

export const DEFAULT_OTHER_LABEL = 'Other (please tell us)'
export const DEFAULT_OTHER_PROMPT = 'Please tell us'
export const DEFAULT_COMMENT_PROMPT = 'Please tell us why'
export const MAX_PROMPT = 200
/** Question types "Show only if" can depend on (they have a fixed set of answers). */
export const SHOW_IF_SOURCE_TYPES: SurveyQuestionType[] = ['YES_NO', 'SINGLE_SELECT', 'MULTI_SELECT', 'LIKERT', 'RATING']
/** Written-answer questions have no comment box (the answer is already their own words). */
export const NO_COMMENT_TYPES: SurveyQuestionType[] = ['TEXT', 'TEXTAREA']
/** Question types whose answers can be marked "Not counted in percentages". */
export const NOT_COUNTED_TYPES: SurveyQuestionType[] = ['SINGLE_SELECT', 'MULTI_SELECT', 'LIKERT']
/**
 * Answers that are normally left out of percentages: marked "Not counted" when added from a
 * standard set or pasted in (the same answers the ready-made library marks).
 */
export const USUALLY_NOT_COUNTED = ["Don't know", 'Prefer not to say', 'Not applicable', 'Does not apply to me']

/** "Use a standard set" for One answer / Several answers: the standard scales and the overall-experience answers. */
export const STANDARD_ANSWER_SETS: { key: string; label: string; options: readonly string[] }[] = [
  ...STANDARD_SCALES.map(s => ({ key: s.key, label: s.label, options: s.options })),
  {
    key: 'OVERALL',
    label: 'Overall experience',
    options: ['Very good', 'Good', 'Neither good nor poor', 'Poor', 'Very poor', "Don't know"],
  },
]

let rowSeq = 0
/** A new answer row; standard opt-out answers start as not counted. */
export function answerRow(text = '', marks: Partial<Pick<AnswerRow, 'exclusive' | 'notCounted'>> = {}): AnswerRow {
  rowSeq += 1
  return {
    id: `row-${rowSeq}`,
    text,
    exclusive: marks.exclusive ?? false,
    notCounted: marks.notCounted ?? USUALLY_NOT_COUNTED.includes(text.trim()),
  }
}

/** Rows for a list of answers, keeping which are marked. */
export function answerRows(
  options: readonly string[],
  marks: { exclusive?: readonly string[]; notCounted?: readonly string[] } = {},
): AnswerRow[] {
  return options.map(text =>
    answerRow(text, {
      exclusive: marks.exclusive?.includes(text) ?? false,
      notCounted: marks.notCounted ? marks.notCounted.includes(text) : undefined,
    }),
  )
}

/** The answers a list of rows saves: trimmed, empty rows left out. */
export const rowTexts = (rows: readonly AnswerRow[]) => rows.map(r => r.text.trim()).filter(Boolean)

/** Answers marked not counted in a question's settings. */
export function notCountedOf(config: Record<string, unknown> | null | undefined): string[] {
  const list = config?.notCountedOptions
  return Array.isArray(list) ? list.filter((v): v is string => typeof v === 'string') : []
}

export function emptyDraft(sectionTitle = ''): QuestionDraft {
  return {
    questionText: '',
    questionType: 'YES_NO',
    helpText: '',
    isRequired: false,
    options: [answerRow(), answerRow()],
    optionsFrom: '',
    scale: answerRows(AGREEMENT_SCALE),
    ratingMin: '0',
    ratingMax: '10',
    sectionTitle,
    otherEnabled: false,
    otherLabel: DEFAULT_OTHER_LABEL,
    otherPrompt: DEFAULT_OTHER_PROMPT,
    otherRequired: true,
    commentEnabled: false,
    commentPrompt: DEFAULT_COMMENT_PROMPT,
    commentWhen: 'ANY',
    commentShowWhen: [],
    showIfKey: '',
    showIfAnswers: [],
  }
}

/** A saved question as a draft for the editor. */
export function questionToDraft(q: SurveyQuestion): QuestionDraft {
  const notCounted = notCountedOf(q.config)
  const isScale = q.questionType === 'LIKERT'
  return {
    ...emptyDraft(q.sectionTitle ?? ''),
    questionText: q.questionText,
    questionType: q.questionType,
    helpText: q.helpText ?? '',
    isRequired: q.isRequired,
    optionsFrom: q.optionsFrom ?? '',
    options: isScale || !q.options?.length || q.optionsFrom
      ? [answerRow(), answerRow()]
      : answerRows(q.options, { exclusive: q.exclusiveOptions ?? [], notCounted }),
    // A scale question shows the labels it really uses (its own, or the built-in agreement scale).
    scale: answerRows(likertLabels(isScale ? q.options : null), { notCounted: isScale ? notCounted : [] }),
    ratingMin: String(typeof q.config?.min === 'number' ? q.config.min : 0),
    ratingMax: String(typeof q.config?.max === 'number' ? q.config.max : 10),
    otherEnabled: Boolean(q.otherOption),
    otherLabel: q.otherOption?.label ?? DEFAULT_OTHER_LABEL,
    otherPrompt: q.otherOption?.textPrompt ?? DEFAULT_OTHER_PROMPT,
    otherRequired: q.otherOption?.textRequired ?? true,
    commentEnabled: Boolean(q.commentConfig),
    commentPrompt: q.commentConfig?.prompt ?? DEFAULT_COMMENT_PROMPT,
    commentWhen: q.commentConfig?.showWhen?.length ? 'SOME' : 'ANY',
    commentShowWhen: q.commentConfig?.showWhen ?? [],
    showIfKey: q.showIf?.questionKey ?? '',
    showIfAnswers: q.showIf?.answers ?? [],
  }
}

const isChoice = (draft: QuestionDraft) => CHOICE_QUESTION_TYPES.includes(draft.questionType)
/** The rows the draft's type uses: choice answers or scale labels (none for other types). */
export function draftRows(draft: QuestionDraft): AnswerRow[] {
  if (draft.questionType === 'LIKERT') return draft.scale
  return isChoice(draft) ? draft.options : []
}
export const draftOptions = (draft: QuestionDraft) => rowTexts(draft.options)
export const draftScale = (draft: QuestionDraft) => rowTexts(draft.scale)

/** Answers marked not counted that the question still offers. */
export function draftNotCounted(draft: QuestionDraft): string[] {
  if (!NOT_COUNTED_TYPES.includes(draft.questionType)) return []
  return [...new Set(draftRows(draft).filter(r => r.notCounted && r.text.trim()).map(r => r.text.trim()))]
}

/** Several answers: the answers that clear the others. */
export function draftExclusive(draft: QuestionDraft): string[] {
  if (draft.questionType !== 'MULTI_SELECT') return []
  return [...new Set(draft.options.filter(r => r.exclusive && r.text.trim()).map(r => r.text.trim()))]
}

/** Every answer the draft question can be given (for the comment box and the preview). */
export function draftAnswerChoices(draft: QuestionDraft): string[] {
  const options = draft.questionType === 'LIKERT' ? draftScale(draft) : draftOptions(draft)
  return (
    answerChoices({
      questionType: draft.questionType,
      options,
      otherOption:
        draft.otherEnabled && isChoice(draft)
          ? { label: draft.otherLabel.trim() || DEFAULT_OTHER_LABEL, textPrompt: '', textRequired: true }
          : null,
      config: { min: Number(draft.ratingMin), max: Number(draft.ratingMax) },
    }) ?? []
  )
}

/** Why a row is flagged: empty, or the same answer as an earlier row. */
export function rowProblems(rows: readonly AnswerRow[]): Map<string, string> {
  const out = new Map<string, string>()
  const seen = new Set<string>()
  rows.forEach((row, i) => {
    const text = row.text.trim()
    if (!text) {
      // Empty rows at the end are where the next answers are typed; a gap is flagged.
      if (rows.slice(i + 1).some(r => r.text.trim())) out.set(row.id, 'Empty — type an answer or remove it.')
      return
    }
    const key = text.toLocaleLowerCase('en-GB')
    if (seen.has(key)) out.set(row.id, 'Listed twice — each answer must be different.')
    seen.add(key)
  })
  return out
}

/** Comment box answers still on the question (answers can change after they were picked). */
export function commentAnswers(draft: QuestionDraft): string[] {
  const choices = draftAnswerChoices(draft)
  return draft.commentShowWhen.filter(a => choices.includes(a))
}

/** Same wording rule as the API (survey-respondent-anonymity.util.ts): the contact-me question. */
const CONTACT_ME_PATTERN = /^\s*would you like (someone|us) to (contact|get in touch with) you\b/i
export function isContactMeDraft(draft: Pick<QuestionDraft, 'questionType' | 'questionText'>): boolean {
  return draft.questionType === 'YES_NO' && CONTACT_ME_PATTERN.test(draft.questionText)
}
export const CONTACT_ME_ON_ANONYMOUS =
  'This survey is anonymous, so nobody could be contacted about their answers. Ask people to contact the office instead, or make the survey named.'

/** The comment box's own rules (also all that can be wrong on an answered, locked question). */
export function commentDraftError(draft: QuestionDraft): string | null {
  if (!draft.commentEnabled || NO_COMMENT_TYPES.includes(draft.questionType)) return null
  if (!draft.commentPrompt.trim()) return 'Give the comment box a prompt, e.g. Please tell us why.'
  if (draft.commentPrompt.trim().length > MAX_PROMPT) return `The comment prompt can be at most ${MAX_PROMPT} characters.`
  if (draft.commentWhen === 'SOME' && draftAnswerChoices(draft).length && !commentAnswers(draft).length) {
    return 'Pick the answers that show the comment box, or choose “Any answer”.'
  }
  return null
}

/** At least one answer stays counted in the percentages. */
export function notCountedDraftError(draft: QuestionDraft): string | null {
  const answers = rowTexts(draftRows(draft))
  return answers.length && draftNotCounted(draft).length >= answers.length
    ? 'At least one answer must be counted in the percentages.'
    : null
}

/** Same rules as the API; null when the draft can be saved. */
export function questionDraftError(draft: QuestionDraft): string | null {
  const isScale = draft.questionType === 'LIKERT'
  // Answers from a CareFlow list: the list is checked when it is saved.
  if (isChoice(draft) && draft.optionsFrom) return null
  if (isChoice(draft) || isScale) {
    const rows = isScale ? draft.scale : draft.options
    const answers = rowTexts(rows)
    if (answers.length < 2) return isScale ? 'Add at least two scale labels.' : 'Add at least two answers.'
    const seen = new Set<string>()
    for (const o of answers) {
      const key = o.toLocaleLowerCase('en-GB')
      if (seen.has(key)) return `“${o}” is listed more than once.`
      seen.add(key)
    }
    const notCounted = notCountedDraftError(draft)
    if (notCounted) return notCounted
  }
  if (draft.questionType === 'RATING') {
    const min = Number(draft.ratingMin)
    const max = Number(draft.ratingMax)
    if (draft.ratingMin.trim() === '' || draft.ratingMax.trim() === '' || !Number.isInteger(min) || !Number.isInteger(max)) {
      return 'The lowest and highest score must be whole numbers.'
    }
    if (min < 0 || max > 100) return 'Scores must be between 0 and 100.'
    if (min >= max) return 'The highest score must be above the lowest.'
  }
  if (draft.otherEnabled && isChoice(draft)) {
    const label = draft.otherLabel.trim()
    if (!label || !draft.otherPrompt.trim()) return 'Give the “Other” choice a label and a text box prompt.'
    if (label.length > MAX_PROMPT || draft.otherPrompt.trim().length > MAX_PROMPT) {
      return `The “Other” label and prompt can be at most ${MAX_PROMPT} characters.`
    }
    if (draftOptions(draft).some(o => o.toLocaleLowerCase('en-GB') === label.toLocaleLowerCase('en-GB'))) {
      return `“${label}” is already one of the answers — give the Other choice a different label.`
    }
  }
  const comment = commentDraftError(draft)
  if (comment) return comment
  if (draft.showIfKey && !draft.showIfAnswers.length) {
    return 'Pick at least one answer for “Only after certain answers”, or choose “Always”.'
  }
  return null
}

const sameList = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((v, i) => v === b[i])

/**
 * Scale labels to send. The built-in agreement scale is stored as "no labels". When editing, labels
 * the user has not changed are left out entirely, so saving never rewrites a question's scale.
 */
function scaleOptionsToSend(draft: QuestionDraft, original?: SurveyQuestion): string[] | null | undefined {
  const labels = draftScale(draft)
  if (original?.questionType === 'LIKERT' && sameList(labels, likertLabels(original.options))) return undefined
  if (isBuiltInAgreementScale(labels)) return original ? null : undefined
  return labels
}

/** The comment box as saved (null = none). */
export function draftComment(draft: QuestionDraft): CreateQuestionInput['commentConfig'] {
  if (!draft.commentEnabled || NO_COMMENT_TYPES.includes(draft.questionType)) return null
  return {
    prompt: draft.commentPrompt.trim(),
    showWhen: draft.commentWhen === 'SOME' && draftAnswerChoices(draft).length ? commentAnswers(draft) : null,
  }
}

/**
 * The question's settings to send: a score's bounds, or the answers not counted. When editing,
 * an unchanged not-counted list is left out (the API keeps it, and drops answers taken off).
 */
function configToSend(draft: QuestionDraft, original?: SurveyQuestion): CreateQuestionInput['config'] | undefined {
  if (draft.questionType === 'RATING') return { min: Number(draft.ratingMin), max: Number(draft.ratingMax) }
  if (!NOT_COUNTED_TYPES.includes(draft.questionType)) return undefined
  const notCounted = draftNotCounted(draft)
  if (original && original.questionType === draft.questionType && sameList(notCounted, notCountedOf(original.config))) {
    return undefined
  }
  if (notCounted.length) return { notCountedOptions: notCounted }
  return original ? null : undefined
}

export function draftToInput(draft: QuestionDraft, original?: SurveyQuestion): CreateQuestionInput {
  const choice = isChoice(draft)
  const fromList = choice && Boolean(draft.optionsFrom)
  const options = fromList
    ? undefined
    : choice
    ? draftOptions(draft)
    : draft.questionType === 'LIKERT'
      ? scaleOptionsToSend(draft, original)
      : undefined
  const exclusive = draftExclusive(draft)
  const config = configToSend(draft, original)
  return {
    questionText: draft.questionText.trim(),
    questionType: draft.questionType,
    // Editing: an emptied help text is removed (null); a new question just leaves it out.
    helpText: draft.helpText.trim() || (original ? null : undefined),
    isRequired: draft.isRequired,
    ...(options === undefined ? {} : { options }),
    // A CareFlow list (e.g. the organisation's ethnicity list) instead of the question's own answers.
    ...(fromList ? { optionsFrom: draft.optionsFrom, options: null } : original?.optionsFrom ? { optionsFrom: null } : {}),
    ...(config === undefined || fromList ? {} : { config }),
    sectionTitle: draft.sectionTitle.trim() || null,
    otherOption:
      choice && draft.otherEnabled && !fromList
        ? { label: draft.otherLabel.trim(), textPrompt: draft.otherPrompt.trim(), textRequired: draft.otherRequired }
        : null,
    exclusiveOptions: exclusive.length && !fromList ? exclusive : null,
    commentConfig: draftComment(draft),
    showIf: draft.showIfKey ? { questionKey: draft.showIfKey, answers: draft.showIfAnswers } : null,
  }
}

/** What an answered (locked) question may still change: help text, section, comment box and answers not counted. */
export function lockedDraftToInput(draft: QuestionDraft, original: SurveyQuestion): CreateQuestionInput | Partial<CreateQuestionInput> {
  const comment = draftComment(draft)
  // "Not counted in percentages" only changes how the percentages are worked out, so it can change.
  const config = configToSend(draft, original)
  return {
    helpText: draft.helpText.trim() || null,
    sectionTitle: draft.sectionTitle.trim() || null,
    ...(JSON.stringify(comment) === JSON.stringify(original.commentConfig ?? null) ? {} : { commentConfig: comment }),
    ...(config === undefined || draft.questionType === 'RATING' ? {} : { config }),
  }
}

/** The draft as people will see it (for the live preview). */
export function draftPreviewQuestion(draft: QuestionDraft): PublicSurveyQuestion {
  const choice = isChoice(draft)
  return {
    id: 'preview',
    questionText: draft.questionText.trim() || 'Your question',
    helpText: draft.helpText.trim() || null,
    questionType: draft.questionType,
    options: choice ? draftOptions(draft) : draft.questionType === 'LIKERT' ? draftScale(draft) : null,
    config: draft.questionType === 'RATING' ? { min: Number(draft.ratingMin) || 0, max: Number(draft.ratingMax) || 0 } : null,
    isRequired: draft.isRequired,
    sortOrder: 0,
    sectionTitle: draft.sectionTitle.trim() || null,
    otherOption:
      choice && draft.otherEnabled
        ? {
            label: draft.otherLabel.trim() || DEFAULT_OTHER_LABEL,
            textPrompt: draft.otherPrompt.trim() || DEFAULT_OTHER_PROMPT,
            textRequired: draft.otherRequired,
          }
        : null,
    exclusiveOptions: draftExclusive(draft),
    commentConfig: draftComment(draft) ?? null,
    showIf: null,
  }
}

/** Earlier questions a question can depend on: always asked, with a fixed set of answers. */
export function showIfSources(questions: readonly SurveyQuestion[], before: number): SurveyQuestion[] {
  return questions
    .slice(0, before)
    .filter(q => q.key && !q.showIf && SHOW_IF_SOURCE_TYPES.includes(q.questionType))
}

/** The survey's section headings, in order, once each (for the Section picker). */
export function sectionTitles(questions: readonly SurveyQuestion[]): string[] {
  return [...new Set(questions.map(q => q.sectionTitle?.trim()).filter((t): t is string => Boolean(t)))]
}

/** Which standard set the rows are, if any. */
export function standardSetOf(rows: readonly AnswerRow[], sets: ReadonlyArray<{ key: string; options: readonly string[] }>): string | null {
  const texts = rowTexts(rows)
  return sets.find(s => sameList(s.options, texts))?.key ?? null
}

/**
 * A question bank question as a new draft: its text, help text, type, answers (with which clear the
 * others and which are not counted), scale, score, Other choice, comment box and a section
 * suggestion — fully editable before it is saved. "Show only if" is never copied: the question it
 * depends on is not in this survey.
 */
export function bankQuestionToDraft(
  q: Pick<
    SurveyQuestion,
    'questionText' | 'helpText' | 'questionType' | 'options' | 'config' | 'isRequired' | 'otherOption' | 'exclusiveOptions' | 'commentConfig'
  > & { topic?: string | null; optionsFrom?: string | null },
  sectionTitle?: string | null,
): QuestionDraft {
  return questionToDraft({
    id: 'bank',
    sortOrder: 0,
    questionText: q.questionText,
    helpText: q.helpText,
    questionType: q.questionType,
    options: q.options,
    optionsFrom: q.optionsFrom ?? null,
    config: q.config,
    isRequired: q.isRequired,
    otherOption: q.otherOption ?? null,
    exclusiveOptions: q.exclusiveOptions ?? [],
    commentConfig: q.commentConfig ?? null,
    showIf: null,
    sectionTitle: sectionTitle === undefined ? (q.topic ?? null) : sectionTitle,
  })
}
