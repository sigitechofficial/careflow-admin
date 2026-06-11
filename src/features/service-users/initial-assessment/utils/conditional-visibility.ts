import {
  findQuestionByTextIncludes,
  findQuestionByFieldKey,
  isExplicitNo,
  isYesAnswer,
} from '@/features/service-users/initial-assessment/utils/question-lookup'
import type {
  InitialAssessmentAnswerInput,
  InitialAssessmentQuestion,
  InitialAssessmentSection,
} from '@/features/service-users/initial-assessment/types'

type ShowWhenRule = {
  gateTextIncludes?: string
  gateFieldKey?: string
  yes?: boolean
  no?: boolean
}

/** Follow-up questions in the enterprise seed that depend on a prior Yes/No gate. */
const INFERRED_RULES: { questionTextIncludes: string; when: ShowWhenRule }[] = [
  { questionTextIncludes: 'mca completed', when: { gateTextIncludes: 'mca required', yes: true } },
  {
    questionTextIncludes: 'best interest decision details',
    when: { gateTextIncludes: 'best interest decision required', yes: true },
  },
  { questionTextIncludes: 'language required', when: { gateTextIncludes: 'interpreter required', yes: true } },
  {
    questionTextIncludes: 'measures needed if home is unsafe',
    when: { gateTextIncludes: 'manage home environment safely', no: true },
  },
  {
    questionTextIncludes: 'if no, what measure should be taken',
    when: { gateTextIncludes: 'manage home environment safely', no: true },
  },
  { questionTextIncludes: 'key safe code', when: { gateTextIncludes: 'key safe present', yes: true } },
  { questionTextIncludes: 'key safe location', when: { gateTextIncludes: 'key safe present', yes: true } },
  { questionTextIncludes: 'pets secured during visits', when: { gateFieldKey: 'petsPresent', yes: true } },
  { questionTextIncludes: 'pet infestation', when: { gateFieldKey: 'petsPresent', yes: true } },
  { questionTextIncludes: 'oxygen care notes', when: { gateTextIncludes: 'oxygen dependent', yes: true } },
  { questionTextIncludes: 'pain location', when: { gateTextIncludes: 'pain or distress identified', yes: true } },
  { questionTextIncludes: 'pain score', when: { gateTextIncludes: 'pain or distress identified', yes: true } },
  {
    questionTextIncludes: 'pain trigger',
    when: { gateTextIncludes: 'pain or distress identified', yes: true },
  },
  { questionTextIncludes: 'current pain relief', when: { gateTextIncludes: 'pain or distress identified', yes: true } },
  { questionTextIncludes: 'pain assessment date', when: { gateTextIncludes: 'pain assessment completed', yes: true } },
  {
    questionTextIncludes: 'choking history details',
    when: { gateTextIncludes: 'swallowing or choking concerns', yes: true },
  },
  {
    questionTextIncludes: 'swallowing action plan',
    when: { gateTextIncludes: 'swallowing or choking concerns', yes: true },
  },
  { questionTextIncludes: 'salt referral made', when: { gateTextIncludes: 'salt referral required', yes: true } },
  { questionTextIncludes: 'salt referral date', when: { gateTextIncludes: 'salt referral made', yes: true } },
  { questionTextIncludes: 'hydration comment', when: { gateTextIncludes: 'adequately hydrated', no: true } },
  { questionTextIncludes: 'food allergy details', when: { gateTextIncludes: 'food allergies documented', yes: true } },
  { questionTextIncludes: 'bmi value', when: { gateTextIncludes: 'bmi completed', yes: true } },
  { questionTextIncludes: 'must score', when: { gateTextIncludes: 'must assessment completed', yes: true } },
  {
    questionTextIncludes: 'eating / drinking equipment details',
    when: { gateTextIncludes: 'requires aids for eating or drinking', yes: true },
  },
  {
    questionTextIncludes: 'skin condition comment',
    when: { gateTextIncludes: 'skin condition or concern', yes: true },
  },
  {
    questionTextIncludes: 'ulcers or wounds comment',
    when: { gateTextIncludes: 'currently has ulcers or wounds', yes: true },
  },
  {
    questionTextIncludes: 'wound type',
    when: { gateTextIncludes: 'currently has ulcers or wounds', yes: true },
  },
  {
    questionTextIncludes: 'has wound assessment been completed',
    when: { gateTextIncludes: 'currently has ulcers or wounds', yes: true },
  },
  {
    questionTextIncludes: 'pressure equipment details',
    when: { gateTextIncludes: 'pressure relieving equipment in use', yes: true },
  },
  { questionTextIncludes: 'equipment ordered', when: { gateTextIncludes: 'further pressure equipment required', yes: true } },
  { questionTextIncludes: 'date equipment ordered', when: { gateTextIncludes: 'equipment ordered', yes: true } },
  { questionTextIncludes: 'prosthesis care notes', when: { gateTextIncludes: 'uses prosthesis', yes: true } },
  { questionTextIncludes: 'number of falls', when: { gateTextIncludes: 'falls in last', yes: true } },
  { questionTextIncludes: 'falls assessment date', when: { gateTextIncludes: 'falls assessment completed', yes: true } },
  {
    questionTextIncludes: 'representative name',
    when: { gateTextIncludes: 'representative involved', yes: true },
  },
  {
    questionTextIncludes: 'safeguarding concern types',
    when: { gateTextIncludes: 'safeguarding concerns identified', yes: true },
  },
  {
    questionTextIncludes: 'safeguarding concern details',
    when: { gateTextIncludes: 'safeguarding concerns identified', yes: true },
  },
  {
    questionTextIncludes: 'immediate action taken',
    when: { gateTextIncludes: 'safeguarding concerns identified', yes: true },
  },
  {
    questionTextIncludes: 'safeguarding referral made',
    when: { gateTextIncludes: 'local authority safeguarding referral required', yes: true },
  },
  {
    questionTextIncludes: 'safeguarding referral date',
    when: { gateTextIncludes: 'safeguarding referral made', yes: true },
  },
  {
    questionTextIncludes: 'falls assessment completed',
    when: { gateTextIncludes: 'falls in last', yes: true },
  },
  {
    questionTextIncludes: 'gp referral for sleep concern made',
    when: { gateTextIncludes: 'gp referral for sleep concern requested', yes: true },
  },
  {
    questionTextIncludes: 'gp referral for sleep concern date',
    when: { gateTextIncludes: 'gp referral for sleep concern made', yes: true },
  },
]

function parseMetadataShowWhen(metadata: Record<string, unknown> | null | undefined): ShowWhenRule | null {
  const raw = metadata?.showWhen
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const row = raw as Record<string, unknown>
  const gateTextIncludes = typeof row.gateTextIncludes === 'string' ? row.gateTextIncludes : undefined
  const gateFieldKey = typeof row.gateFieldKey === 'string' ? row.gateFieldKey : undefined
  if (!gateTextIncludes && !gateFieldKey) return null
  return {
    gateTextIncludes,
    gateFieldKey,
    yes: row.yes === true ? true : undefined,
    no: row.no === true ? true : undefined,
  }
}

function gateAnswerMatches(
  sections: InitialAssessmentSection[],
  rule: ShowWhenRule,
  draftAnswers: Record<string, InitialAssessmentAnswerInput>,
): boolean {
  const gate = rule.gateFieldKey
    ? findQuestionByFieldKey(sections, rule.gateFieldKey)
    : rule.gateTextIncludes
      ? findQuestionByTextIncludes(sections, rule.gateTextIncludes)
      : undefined
  if (!gate) return true

  const answer = draftAnswers[gate.id]
  if (rule.yes) return isYesAnswer(answer)
  if (rule.no) return isExplicitNo(answer)
  return true
}

function inferredRuleForQuestion(q: InitialAssessmentQuestion): ShowWhenRule | null {
  const needle = q.questionText.toLowerCase()
  for (const row of INFERRED_RULES) {
    if (needle.includes(row.questionTextIncludes)) return row.when
  }
  return null
}

export function shouldShowQuestion(
  q: InitialAssessmentQuestion,
  sections: InitialAssessmentSection[],
  draftAnswers: Record<string, InitialAssessmentAnswerInput>,
): boolean {
  const metaRule = parseMetadataShowWhen(q.metadata)
  if (metaRule) return gateAnswerMatches(sections, metaRule, draftAnswers)

  const inferred = inferredRuleForQuestion(q)
  if (inferred) return gateAnswerMatches(sections, inferred, draftAnswers)

  // Capacity not intact → surface MCA block when capacity is No
  if (q.questionText.toLowerCase().includes('mca completed')) {
    const capacityQ = sections.flatMap((s) => s.questions).find((x) => x.metadata?.specRef === '2.4')
    if (capacityQ && isExplicitNo(draftAnswers[capacityQ.id])) return true
  }

  // Assessor sign-off fields only on section 14
  const fieldKey = q.metadata?.fieldKey
  if (typeof fieldKey === 'string' && ['assessorName', 'assessorRole', 'assessorSignDate'].includes(fieldKey)) {
    return sections.some((s) => s.sectionNumber === 14 && s.questions.some((x) => x.id === q.id))
  }

  return true
}

export function visibleQuestionsForSection(
  section: InitialAssessmentSection,
  allSections: InitialAssessmentSection[],
  draftAnswers: Record<string, InitialAssessmentAnswerInput>,
): InitialAssessmentQuestion[] {
  return section.questions.filter((q) => shouldShowQuestion(q, allSections, draftAnswers))
}
