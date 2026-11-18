import type { QuestionKind, ScreeningQuestion } from '@/features/hr/recruitment/api/recruitment.api'

/** Questions care employers usually ask, ready to switch on. */
export const QUESTION_LIBRARY: (Omit<ScreeningQuestion, 'id'> & { kind: Exclude<QuestionKind, 'CUSTOM'>; label: string; hint: string })[] = [
  {
    kind: 'RIGHT_TO_WORK',
    label: 'Right to work',
    text: 'Do you have the right to work in the UK?',
    type: 'YES_NO',
    required: true,
    acceptedAnswers: ['Yes'],
    hint: 'Always asked.',
  },
  {
    kind: 'DRIVING',
    label: 'Driving licence and car',
    text: 'Do you have a full UK driving licence and a car you can use for work?',
    type: 'YES_NO',
    required: true,
    hint: 'For home visits between clients.',
  },
  {
    kind: 'DBS',
    label: 'DBS check',
    text: 'Do you have an Enhanced DBS check from the last three years?',
    type: 'YES_NO',
    required: false,
    hint: 'We can still apply for a new one.',
  },
  {
    kind: 'DBS_UPDATE_SERVICE',
    label: 'DBS Update Service',
    text: 'Is your DBS certificate on the DBS Update Service?',
    type: 'YES_NO',
    required: false,
    hint: 'Saves waiting for a new check.',
  },
  {
    kind: 'CARE_EXPERIENCE',
    label: 'Care experience',
    text: 'How much paid care experience do you have?',
    type: 'CHOICE',
    options: ['None', 'Under 1 year', '1–3 years', 'More than 3 years'],
    required: true,
    hint: 'Pick which answers the job needs.',
  },
  {
    kind: 'QUALIFICATION',
    label: 'Care qualification',
    text: 'Which care qualification do you have?',
    type: 'CHOICE',
    options: ['None yet', 'Care Certificate', 'Level 2 Diploma in Care', 'Level 3 Diploma or higher'],
    required: false,
    hint: 'NVQ / Diploma level.',
  },
  {
    kind: 'WEEKENDS',
    label: 'Weekends',
    text: 'Can you work weekends?',
    type: 'YES_NO',
    required: true,
    hint: 'Most home care rotas include weekends.',
  },
  {
    kind: 'START_DATE',
    label: 'Start date',
    text: 'Can you start by the start date shown in the advert?',
    type: 'YES_NO',
    required: false,
    hint: 'Uses the start date from step 1.',
  },
]

export const newQuestionId = () => `q_${Math.random().toString(36).slice(2, 10)}`

/** A library question, ready to add to a vacancy. */
export function fromLibrary(kind: Exclude<QuestionKind, 'CUSTOM'>): ScreeningQuestion {
  const { hint: _hint, label: _label, ...q } = QUESTION_LIBRARY.find(x => x.kind === kind)!
  return { ...q, id: newQuestionId(), ...(q.options ? { options: [...q.options] } : {}), ...(q.acceptedAnswers ? { acceptedAnswers: [...q.acceptedAnswers] } : {}) }
}

/** New vacancies start with right to work (a deal breaker) and driving. */
export const defaultQuestions = (): ScreeningQuestion[] => [fromLibrary('RIGHT_TO_WORK'), fromLibrary('DRIVING')]

/** The answers a question can have. */
export const answersOf = (q: ScreeningQuestion): string[] => (q.type === 'YES_NO' ? ['Yes', 'No'] : q.type === 'CHOICE' ? q.options ?? [] : [])
