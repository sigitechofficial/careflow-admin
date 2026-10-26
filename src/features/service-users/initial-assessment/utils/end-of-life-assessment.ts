/** End of life assessment worksheet — paper form (holistic tab 14). */

export type EndOfLifeTriStateAnswer = 'yes' | 'no' | 'unknown' | null

export type EndOfLifeQuestionId =
  | 'endOfLifeCarePlan'
  | 'awareOfDying'
  | 'medicationAssessed'
  | 'medicationAvailable'
  | 'interventionDiscussion'
  | 'significantBeliefs'
  | 'carersAwareWishes'
  | 'capacityEndOfLife'
  | 'comfortDiscussWishes'
  | 'medicalAidRecovery'
  | 'terminalResidence'
  | 'hospiceHospitalTransfer'
  | 'funeralArrangements'
  | 'lastWill'
  | 'contactNextOfKin'
  | 'reviewWishesFuture'
  | 'capacityLastWishes'
  | 'dnrInPlace'
  | 'consentMethod'

export type EndOfLifeAssessmentMetadata = Partial<
  Record<`${EndOfLifeQuestionId}Answer`, boolean | null> &
    Record<`${EndOfLifeQuestionId}TriAnswer`, EndOfLifeTriStateAnswer> &
    Record<`${EndOfLifeQuestionId}Notes`, string>
>

export type EndOfLifeQuestionDef = {
  id: EndOfLifeQuestionId
  label: string
  hint?: string
  kind: 'yesNo' | 'yesNoUnknown' | 'notesOnly'
  section?: 'lastWishes'
}

export const END_OF_LIFE_ASSESSMENT_QUESTIONS: EndOfLifeQuestionDef[] = [
  {
    id: 'endOfLifeCarePlan',
    label: 'Do I have an end of life care plan?',
    hint: 'Please record my end of life status and what I want to achieve.',
    kind: 'yesNo',
  },
  {
    id: 'awareOfDying',
    label: 'Am I aware that I am approaching the end of my life?',
    kind: 'yesNo',
  },
  {
    id: 'medicationAssessed',
    label:
      'Have my current medicines been reviewed, and have any non-essential medicines been stopped?',
    kind: 'yesNo',
  },
  {
    id: 'medicationAvailable',
    label: 'Are all my prescribed medicines available?',
    hint: 'My medicines are available and are managed daily by my Care Professionals.',
    kind: 'yesNo',
  },
  {
    id: 'interventionDiscussion',
    label:
      'Has there been a discussion with me about stopping interventions that are no longer right for me (e.g. feeding, turning)?',
    kind: 'yesNo',
  },
  {
    id: 'significantBeliefs',
    label:
      'My beliefs that need to be considered, including my religious or spiritual contact.',
    kind: 'notesOnly',
  },
  {
    id: 'carersAwareWishes',
    label: 'Are my Care Professionals aware of my advance wishes?',
    kind: 'yesNo',
  },
  {
    id: 'capacityEndOfLife',
    label: 'Do I have the mental capacity to make end of life decisions?',
    kind: 'yesNo',
  },
  {
    id: 'comfortDiscussWishes',
    label: 'Am I comfortable to discuss my last wishes and have them recorded?',
    kind: 'yesNo',
    section: 'lastWishes',
  },
  {
    id: 'medicalAidRecovery',
    label:
      'If my life is in danger, do I want medical treatment to help me recover?',
    kind: 'yesNoUnknown',
    section: 'lastWishes',
  },
  {
    id: 'terminalResidence',
    label: 'If I have a terminal condition, do I know where I would like to live and be cared for?',
    kind: 'yesNo',
    section: 'lastWishes',
  },
  {
    id: 'hospiceHospitalTransfer',
    label:
      'If my condition gets worse than my care at home can safely manage, would I like to move to another care setting such as a hospice or hospital?',
    kind: 'yesNo',
    section: 'lastWishes',
  },
  {
    id: 'funeralArrangements',
    label: 'Do I have funeral arrangements in place? (Please describe them.)',
    kind: 'yesNo',
    section: 'lastWishes',
  },
  {
    id: 'lastWill',
    label: 'Do I have a will in place?',
    kind: 'yesNoUnknown',
    section: 'lastWishes',
  },
  {
    id: 'contactNextOfKin',
    label:
      'If I become seriously ill, would I like you to contact my next of kin?',
    kind: 'yesNo',
    section: 'lastWishes',
  },
  {
    id: 'reviewWishesFuture',
    label: 'Am I happy to review my last wishes in the future?',
    kind: 'yesNo',
    section: 'lastWishes',
  },
  {
    id: 'capacityLastWishes',
    label: 'Do I have the mental capacity to make decisions about my last wishes?',
    kind: 'yesNo',
    section: 'lastWishes',
  },
  {
    id: 'dnrInPlace',
    label: 'Resuscitation statement in place DNR?',
    kind: 'yesNo',
    section: 'lastWishes',
  },
  {
    id: 'consentMethod',
    label: 'How I give consent to my last wishes',
    kind: 'notesOnly',
    section: 'lastWishes',
  },
]

export function endOfLifeAnswerKey(id: EndOfLifeQuestionId): `${EndOfLifeQuestionId}Answer` {
  return `${id}Answer`
}

export function endOfLifeTriAnswerKey(
  id: EndOfLifeQuestionId,
): `${EndOfLifeQuestionId}TriAnswer` {
  return `${id}TriAnswer`
}

export function endOfLifeNotesKey(id: EndOfLifeQuestionId): `${EndOfLifeQuestionId}Notes` {
  return `${id}Notes`
}

export function boolAnswered(value: boolean | null | undefined): boolean {
  return value === true || value === false
}

export function triStateAnswered(value: EndOfLifeTriStateAnswer | undefined): boolean {
  return value === 'yes' || value === 'no' || value === 'unknown'
}

export function endOfLifeYesNoValue(
  meta: EndOfLifeAssessmentMetadata,
  id: EndOfLifeQuestionId,
): boolean | null | undefined {
  return meta[endOfLifeAnswerKey(id)] as boolean | null | undefined
}

export function endOfLifeTriValue(
  meta: EndOfLifeAssessmentMetadata,
  id: EndOfLifeQuestionId,
): EndOfLifeTriStateAnswer | undefined {
  return meta[endOfLifeTriAnswerKey(id)] as EndOfLifeTriStateAnswer | undefined
}

export function endOfLifeNotesValue(
  meta: EndOfLifeAssessmentMetadata,
  id: EndOfLifeQuestionId,
): string | undefined {
  return meta[endOfLifeNotesKey(id)]
}

export function defaultEndOfLifeAssessmentMetadata(): EndOfLifeAssessmentMetadata {
  return {}
}

export function normalizeEndOfLifeAssessmentMetadata(raw: unknown): EndOfLifeAssessmentMetadata {
  if (!raw || typeof raw !== 'object') return defaultEndOfLifeAssessmentMetadata()
  const row = raw as Record<string, unknown>
  const out: EndOfLifeAssessmentMetadata = {}

  for (const q of END_OF_LIFE_ASSESSMENT_QUESTIONS) {
    const answerKey = endOfLifeAnswerKey(q.id)
    const triKey = endOfLifeTriAnswerKey(q.id)
    const notesKey = endOfLifeNotesKey(q.id)

    if (row[answerKey] === true || row[answerKey] === false) {
      out[answerKey] = row[answerKey] as boolean
    }
    if (row[triKey] === 'yes' || row[triKey] === 'no' || row[triKey] === 'unknown') {
      out[triKey] = row[triKey] as EndOfLifeTriStateAnswer
    }
    if (typeof row[notesKey] === 'string') {
      out[notesKey] = row[notesKey]
    }
  }

  return out
}

export function isEndOfLifeAssessmentComplete(
  meta: EndOfLifeAssessmentMetadata | undefined,
): boolean {
  if (!meta) return false

  return END_OF_LIFE_ASSESSMENT_QUESTIONS.every((q) => {
    if (q.kind === 'notesOnly') return true
    if (q.kind === 'yesNoUnknown') return triStateAnswered(endOfLifeTriValue(meta, q.id))
    return boolAnswered(endOfLifeYesNoValue(meta, q.id))
  })
}
