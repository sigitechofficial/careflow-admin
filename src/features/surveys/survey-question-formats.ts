/**
 * "Choose a format": every way a question can be asked, as a working example to pick from instead
 * of guessing from type names. Each format is built only from what questions already have (type,
 * answers, Other, clears-the-others, comment box, scale, not counted, "Show only if"). Examples use
 * plain UK English: person-facing wording for surveys of people we support (and public surveys), staff
 * wording for staff surveys.
 */
import type { SurveyQuestion, SurveyTargetKind } from '@/features/surveys/types'
import { STANDARD_SCALES } from '@/features/surveys/survey-likert'
import {
  DEFAULT_COMMENT_PROMPT,
  DEFAULT_OTHER_LABEL,
  DEFAULT_OTHER_PROMPT,
  STANDARD_ANSWER_SETS,
  answerRow,
  answerRows,
  draftRows,
  rowTexts,
  type AnswerRow,
  type QuestionDraft,
} from '@/features/surveys/survey-question-draft'

export type FormatAudience = 'person' | 'staff'
export type FormatGroup = 'Choices' | 'Scales and scores' | 'Written answers' | 'Follow-ups'
export const FORMAT_GROUPS: FormatGroup[] = ['Choices', 'Scales and scores', 'Written answers', 'Follow-ups']

/** Staff surveys get staff examples; everything else (people we support, public) person-facing ones. */
export function formatAudienceOf(targetKind: SurveyTargetKind | null | undefined): FormatAudience {
  return targetKind === 'EMPLOYEE' ? 'staff' : 'person'
}

/** What a format sets on a question: its type, example answers and settings. */
export type FormatPattern = Pick<QuestionDraft, 'questionType'> &
  Partial<
    Pick<
      QuestionDraft,
      | 'ratingMin'
      | 'ratingMax'
      | 'otherEnabled'
      | 'commentEnabled'
      | 'commentPrompt'
      | 'commentWhen'
      | 'commentShowWhen'
    >
  > & {
    /** Choice answers (One answer / Several answers), with their marks. */
    options?: Array<{ text: string; exclusive?: boolean; notCounted?: boolean }>
    /** Scale labels, first to last. */
    scale?: readonly string[]
    /** Answers from a CareFlow list (e.g. ETHNICITY) instead of example answers. */
    optionsFrom?: string
  }

export type FormatExample = {
  questionText: string
  helpText?: string
  pattern: FormatPattern
}

export type QuestionFormat = {
  key: string
  group: FormatGroup
  name: string
  /** One line on when to use it. */
  when: string
  example: (audience: FormatAudience) => FormatExample
  /** The question's text is part of the format (contact-me): it is set too. */
  setsText?: boolean
  /** Contact me: never on anonymous surveys. */
  contactMe?: boolean
  /** Asked only after an answer to an earlier question; the example shows the pair. */
  followUp?: { lead: (audience: FormatAudience) => FormatExample }
}

const scale = (key: string) => STANDARD_SCALES.find(s => s.key === key)!.options
const OVERALL = STANDARD_ANSWER_SETS.find(s => s.key === 'OVERALL')!.options
const rows = (...texts: string[]) => texts.map(text => ({ text }))
const byAudience = (person: string, staff: string) => (a: FormatAudience) => (a === 'staff' ? staff : person)

export const CONTACT_ME_TEXT = 'Would you like someone to contact you about your answers?'

export const QUESTION_FORMATS: QuestionFormat[] = [
  // ─── Choices ───
  {
    key: 'yes-no',
    group: 'Choices',
    name: 'Yes or no',
    when: 'A simple fact or check with two answers.',
    example: a => ({
      questionText: byAudience('Did your care worker wear gloves and an apron?', 'Did you have the gloves and aprons you needed this week?')(a),
      pattern: { questionType: 'YES_NO' },
    }),
  },
  {
    key: 'yes-no-comment',
    group: 'Choices',
    name: 'Yes or no, with a comment if no',
    when: 'A check where you want to know why when the answer is no.',
    example: a => ({
      questionText: byAudience('Do your care workers arrive on time?', 'Do you get your rota in good time?')(a),
      pattern: { questionType: 'YES_NO', commentEnabled: true, commentPrompt: 'Please tell us what happened', commentWhen: 'SOME', commentShowWhen: ['No'] },
    }),
  },
  {
    key: 'one',
    group: 'Choices',
    name: 'One answer from a list',
    when: 'People pick one answer from your list.',
    example: a =>
      a === 'staff'
        ? {
            questionText: 'How did you first hear about this job?',
            pattern: { questionType: 'SINGLE_SELECT', options: rows('A friend or family member', 'A job website', 'Our website', 'Social media') },
          }
        : {
            questionText: 'How did you first hear about us?',
            pattern: { questionType: 'SINGLE_SELECT', options: rows('A friend or family member', 'Your GP or social worker', 'Our website', 'The council') },
          },
  },
  {
    key: 'one-other',
    group: 'Choices',
    name: 'One answer, with “Other (please tell us)”',
    when: 'Your list may not cover everyone: they can write their own.',
    example: a =>
      a === 'staff'
        ? {
            questionText: 'How do you usually travel between visits?',
            pattern: { questionType: 'SINGLE_SELECT', options: rows('Car', 'Bus', 'Walking', 'Bicycle'), otherEnabled: true },
          }
        : {
            questionText: 'How do you usually get in touch with the office?',
            pattern: { questionType: 'SINGLE_SELECT', options: rows('Phone', 'Email', 'Through my care worker'), otherEnabled: true },
          },
  },
  {
    key: 'one-comment',
    group: 'Choices',
    name: 'One answer, with a comment after certain answers',
    when: 'Ask “why?” only when someone picks a low answer.',
    example: a => ({
      questionText: byAudience('How would you rate the office staff?', 'How would you rate the support from your manager?')(a),
      pattern: {
        questionType: 'SINGLE_SELECT',
        options: rows(...scale('RATING')),
        commentEnabled: true,
        commentPrompt: 'Please tell us why',
        commentWhen: 'SOME',
        commentShowWhen: ['Poor', 'Very poor'],
      },
    }),
  },
  {
    key: 'several',
    group: 'Choices',
    name: 'Several answers',
    when: 'People tick every answer that applies.',
    example: a =>
      a === 'staff'
        ? { questionText: 'Which training would help you most?', pattern: { questionType: 'MULTI_SELECT', options: rows('Moving and handling', 'Medicines', 'Dementia care', 'First aid') } }
        : { questionText: 'Which of these do we help you with?', pattern: { questionType: 'MULTI_SELECT', options: rows('Washing and dressing', 'Meals', 'Medicines', 'Shopping') } },
  },
  {
    key: 'several-other',
    group: 'Choices',
    name: 'Several answers, with “Other (please tell us)”',
    when: 'Tick all that apply, and write in anything missing.',
    example: a =>
      a === 'staff'
        ? { questionText: 'Which training would help you most?', pattern: { questionType: 'MULTI_SELECT', options: rows('Moving and handling', 'Medicines', 'Dementia care'), otherEnabled: true } }
        : { questionText: 'Which of these do we help you with?', pattern: { questionType: 'MULTI_SELECT', options: rows('Washing and dressing', 'Meals', 'Medicines'), otherEnabled: true } },
  },
  {
    key: 'several-none',
    group: 'Choices',
    name: 'Several answers, with “None of these”',
    when: '“None of these” clears the other ticks; Other lets them write their own.',
    example: a => ({
      questionText: byAudience('Is there anything you would like more help with?', 'Has anything made your work harder this month?')(a),
      pattern: {
        questionType: 'MULTI_SELECT',
        options:
          a === 'staff'
            ? [...rows('Travel time', 'Short visits', 'Equipment'), { text: 'None of these', exclusive: true }]
            : [...rows('Cooking', 'Cleaning', 'Going out'), { text: 'None of these', exclusive: true }],
        otherEnabled: true,
      },
    }),
  },
  {
    key: 'careflow-list',
    group: 'Choices',
    name: 'From your CareFlow list (ethnic group and other equality questions)',
    when: 'Uses your own list from Settings, searchable under its groups. Results show groups, and detail only where at least 10 chose it.',
    example: () => ({
      questionText: 'What is your ethnic group?',
      helpText: 'Choose the answer that describes you best. You do not have to answer.',
      pattern: { questionType: 'SINGLE_SELECT', optionsFrom: 'ETHNICITY' },
    }),
  },
  // ─── Scales and scores ───
  {
    key: 'agree',
    group: 'Scales and scores',
    name: 'Agree or disagree',
    when: 'How much someone agrees with a statement.',
    example: a => ({
      questionText: byAudience('I feel listened to when I contact the office.', 'I feel supported by my manager.')(a),
      pattern: { questionType: 'LIKERT', scale: scale('AGREEMENT') },
    }),
  },
  {
    key: 'often',
    group: 'Scales and scores',
    name: 'How often',
    when: 'How often something happens, from Always to Never.',
    example: a => ({
      questionText: byAudience('Do your care workers have time to help you without rushing?', 'Do you have enough time for each visit?')(a),
      pattern: { questionType: 'LIKERT', scale: scale('FREQUENCY') },
    }),
  },
  {
    key: 'overall',
    group: 'Scales and scores',
    name: 'Very good to Very poor, with “Don’t know”',
    when: 'The standard overall question; “Don’t know” is not counted in percentages.',
    example: a => ({
      questionText: byAudience('Overall, how was your experience of our service?', 'Overall, how would you rate working here?')(a),
      pattern: { questionType: 'SINGLE_SELECT', options: OVERALL.map(text => ({ text, notCounted: text === "Don't know" })) },
    }),
  },
  {
    key: 'satisfaction',
    group: 'Scales and scores',
    name: 'Satisfaction',
    when: 'How satisfied someone is, from Very satisfied to Very dissatisfied.',
    example: a => ({
      questionText: byAudience('How satisfied are you with the help you get?', 'How satisfied are you with your working hours?')(a),
      pattern: { questionType: 'LIKERT', scale: scale('SATISFACTION') },
    }),
  },
  {
    key: 'scale-comment',
    group: 'Scales and scores',
    name: 'Scale, with a comment after the low answers',
    when: 'Ask “why?” only when someone gives a low answer.',
    example: a => ({
      questionText: byAudience('Do your care workers treat you with dignity and respect?', 'Do you feel valued for the work you do?')(a),
      pattern: {
        questionType: 'LIKERT',
        scale: scale('FREQUENCY'),
        commentEnabled: true,
        commentPrompt: 'Please tell us why',
        commentWhen: 'SOME',
        commentShowWhen: ['Rarely', 'Never'],
      },
    }),
  },
  {
    key: 'score-5',
    group: 'Scales and scores',
    name: 'Score 1 to 5',
    when: 'A quick score where 5 is best.',
    example: a => ({
      questionText: byAudience('How would you score your last visit, where 5 is best?', 'How would you score this week, where 5 is best?')(a),
      pattern: { questionType: 'RATING', ratingMin: '1', ratingMax: '5' },
    }),
  },
  {
    key: 'score-10',
    group: 'Scales and scores',
    name: 'Score 0 to 10',
    when: 'A score from 0 to 10, such as how likely they are to recommend you.',
    example: a => ({
      questionText: byAudience(
        'How likely are you to recommend us to a friend or family member?',
        'How likely are you to recommend working here to a friend?',
      )(a),
      helpText: '0 means not at all likely, 10 means extremely likely.',
      pattern: { questionType: 'RATING', ratingMin: '0', ratingMax: '10' },
    }),
  },
  {
    key: 'number',
    group: 'Scales and scores',
    name: 'A number',
    when: 'A count or amount people type in.',
    example: a => ({
      questionText: byAudience('How many visits a week do you have?', 'How many hours a week would you like to work?')(a),
      pattern: { questionType: 'NUMBER' },
    }),
  },
  // ─── Written answers ───
  {
    key: 'short-text',
    group: 'Written answers',
    name: 'Short written answer',
    when: 'A word or a few words.',
    example: () => ({ questionText: 'Your preferred name', pattern: { questionType: 'TEXT' } }),
  },
  {
    key: 'long-text',
    group: 'Written answers',
    name: 'Long written answer',
    when: 'Space for people to say more in their own words.',
    example: () => ({ questionText: 'What could we do better?', pattern: { questionType: 'TEXTAREA' } }),
  },
  // ─── Follow-ups ───
  {
    key: 'contact-me',
    group: 'Follow-ups',
    name: 'Contact me',
    when: 'Ask if they would like someone to get in touch (named surveys only).',
    setsText: true,
    contactMe: true,
    example: () => ({ questionText: CONTACT_ME_TEXT, pattern: { questionType: 'YES_NO' } }),
  },
  {
    key: 'follow-up',
    group: 'Follow-ups',
    name: 'Follow-up after a certain answer',
    when: 'A second question asked only after a certain answer to an earlier one.',
    followUp: {
      lead: a => ({
        questionText: byAudience(
          'Has a care worker ever been late without letting you know?',
          'Have you ever been sent to a visit without the information you needed?',
        )(a),
        pattern: { questionType: 'YES_NO' },
      }),
    },
    example: () => ({
      questionText: 'How often has this happened?',
      pattern: { questionType: 'SINGLE_SELECT', options: rows('Once', 'A few times', 'Often') },
    }),
  },
]

/** A format's example as a whole draft (for its live example and to apply it). */
export function formatDraft(base: QuestionDraft, example: FormatExample): QuestionDraft {
  const p = example.pattern
  return {
    ...base,
    questionText: example.questionText,
    helpText: example.helpText ?? '',
    questionType: p.questionType,
    options: p.options ? p.options.map(o => answerRow(o.text, { exclusive: o.exclusive ?? false, notCounted: o.notCounted ?? false })) : base.options,
    optionsFrom: p.optionsFrom ?? '',
    scale: p.scale ? answerRows(p.scale) : base.scale,
    ratingMin: p.ratingMin ?? base.ratingMin,
    ratingMax: p.ratingMax ?? base.ratingMax,
    otherEnabled: p.otherEnabled ?? false,
    otherLabel: DEFAULT_OTHER_LABEL,
    otherPrompt: DEFAULT_OTHER_PROMPT,
    otherRequired: true,
    commentEnabled: p.commentEnabled ?? false,
    commentPrompt: p.commentPrompt ?? DEFAULT_COMMENT_PROMPT,
    commentWhen: p.commentWhen ?? 'ANY',
    commentShowWhen: p.commentShowWhen ?? [],
    showIfKey: '',
    showIfAnswers: [],
  }
}

/** Answers someone has typed themselves (not an example or a standard set), which a format would replace. */
export function typedAnswers(draft: QuestionDraft): string[] {
  const texts = rowTexts(draftRows(draft))
  if (!texts.length) return []
  const same = (a: readonly string[]) => a.length === texts.length && a.every((t, i) => t === texts[i])
  if (STANDARD_ANSWER_SETS.some(s => same(s.options))) return []
  const examples = QUESTION_FORMATS.flatMap(f =>
    (['person', 'staff'] as const).map(a => {
      const p = f.example(a).pattern
      return p.options ? p.options.map(o => o.text) : p.scale ? [...p.scale] : []
    }),
  )
  return examples.some(same) ? [] : texts
}

/** Whether applying the format would replace answers (or question text) the person typed. */
export function formatReplacesTyped(draft: QuestionDraft, format: QuestionFormat, audience: FormatAudience): boolean {
  const p = format.example(audience).pattern
  const usesRows = Boolean(p.options || p.scale)
  const answers = usesRows && typedAnswers(draft).length > 0
  const text = Boolean(format.setsText && draft.questionText.trim() && draft.questionText.trim() !== format.example(audience).questionText)
  return answers || text
}

/**
 * Applies a format to the draft: its type and settings always; its example answers unless the person
 * keeps their own (then the format's marks — "None of these", not counted — are added to theirs).
 * Their question text and help text are kept (contact-me sets its own text when replacing).
 * A follow-up is pointed at the most fitting earlier question (the last yes / no one, else the last
 * that can be used), asked after "Yes" where it has that answer.
 */
export function applyFormat(
  draft: QuestionDraft,
  format: QuestionFormat,
  opts: { audience: FormatAudience; replaceTyped: boolean; earlier: readonly SurveyQuestion[] },
): { draft: QuestionDraft; followUpOn: SurveyQuestion | null } {
  const example = format.example(opts.audience)
  const shaped = formatDraft(draft, example)
  const keepTyped = !opts.replaceTyped && typedAnswers(draft).length > 0
  const p = example.pattern
  let options: AnswerRow[] = shaped.options
  let scale: AnswerRow[] = shaped.scale
  if (keepTyped && p.options && draft.questionType !== 'LIKERT') {
    // Their answers stay; the format's own marked answers ("None of these") are added if missing.
    const kept = draft.options.map(r => ({ ...r, exclusive: false }))
    for (const o of p.options.filter(o => o.exclusive)) {
      const at = kept.findIndex(r => r.text.trim() === o.text)
      if (at >= 0) kept[at] = { ...kept[at]!, exclusive: true }
      else kept.push(answerRow(o.text, { exclusive: true }))
    }
    options = kept
  } else if (keepTyped && p.options && draft.questionType === 'LIKERT') {
    options = draft.scale.map(r => ({ ...r, exclusive: false }))
  } else if (keepTyped && p.scale) {
    scale = draftRows(draft).map(r => ({ ...r, exclusive: false }))
  }
  const answersNow = rowTexts(p.scale ? scale : options)
  const showWhen = (p.commentShowWhen ?? []).filter(a => p.questionType === 'YES_NO' || answersNow.includes(a))
  const next: QuestionDraft = {
    ...shaped,
    questionText: format.setsText && (opts.replaceTyped || !draft.questionText.trim()) ? example.questionText : draft.questionText,
    helpText: draft.helpText,
    sectionTitle: draft.sectionTitle,
    isRequired: draft.isRequired,
    options,
    scale,
    commentWhen: shaped.commentEnabled && showWhen.length ? 'SOME' : 'ANY',
    commentShowWhen: shaped.commentEnabled ? showWhen : [],
    // "When it is asked" is about the earlier question, not this one's format: it stays as it was.
    showIfKey: draft.showIfKey,
    showIfAnswers: draft.showIfAnswers,
  }
  let followUpOn: SurveyQuestion | null = null
  if (format.followUp) {
    followUpOn = [...opts.earlier].reverse().find(q => q.questionType === 'YES_NO') ?? opts.earlier[opts.earlier.length - 1] ?? null
    if (followUpOn?.key) {
      next.showIfKey = followUpOn.key
      next.showIfAnswers = followUpOn.questionType === 'YES_NO' ? ['Yes'] : []
    }
  }
  return { draft: next, followUpOn }
}

/** What to say after a follow-up format is applied: which question it follows, or what to do first. */
export function followUpNote(format: QuestionFormat, draft: QuestionDraft, followUpOn: SurveyQuestion | null): string | null {
  if (!format.followUp) return null
  return followUpOn
    ? `This question is asked only if “${followUpOn.questionText}” is answered${draft.showIfAnswers.length ? ` ${draft.showIfAnswers.join(' or ')}` : ' a certain way'} — check it under “When it is asked”.`
    : 'A follow-up needs the question it follows first: add that question (yes / no, choice, scale or score), then add this one and set “When it is asked”.'
}
