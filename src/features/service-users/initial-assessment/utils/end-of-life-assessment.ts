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
    label: 'Does client have end of life care plan?',
    hint: 'Please indicate client end of life status and objective',
    kind: 'yesNo',
  },
  {
    id: 'awareOfDying',
    label: 'Is client aware about physical condition that he/she is dying?',
    kind: 'yesNo',
  },
  {
    id: 'medicationAssessed',
    label:
      'Has the current medication been assessed and have all none essential discontinued?',
    kind: 'yesNo',
  },
  {
    id: 'medicationAvailable',
    label: 'Are all Prescribed medication available?',
    hint: 'Medication is available and is manage daily by my formal carers.',
    kind: 'yesNo',
  },
  {
    id: 'interventionDiscussion',
    label:
      'Has there been discussion regarding discontinuation of inappropriate intervention e.g. feeding, turning?',
    kind: 'yesNo',
  },
  {
    id: 'significantBeliefs',
    label:
      'Please specify any significant belief which needs to be considered. Include details of any religious or spiritual contact.',
    kind: 'notesOnly',
  },
  {
    id: 'carersAwareWishes',
    label: 'Are the carers aware of the clients advance wishes?',
    kind: 'yesNo',
  },
  {
    id: 'capacityEndOfLife',
    label: 'Does the client have the mental capacity to make end of life decision?',
    kind: 'yesNo',
  },
  {
    id: 'comfortDiscussWishes',
    label: 'Is the client comfortable to discuss their last wishes and have them recorded?',
    kind: 'yesNo',
    section: 'lastWishes',
  },
  {
    id: 'medicalAidRecovery',
    label:
      'Should client experience life threatening experience does their wish medical aid to assist recovery?',
    kind: 'yesNoUnknown',
    section: 'lastWishes',
  },
  {
    id: 'terminalResidence',
    label: 'Does client experience terminal condition where they wish to reside?',
    kind: 'yesNo',
    section: 'lastWishes',
  },
  {
    id: 'hospiceHospitalTransfer',
    label:
      "Should the client's condition deteriorate beyond the capacity of the agency/ home to provide the effective, does their wish to provide effective care environment such as Hospice, Hospital etc?",
    kind: 'yesNo',
    section: 'lastWishes',
  },
  {
    id: 'funeralArrangements',
    label: 'Does the client have funeral arrangement in place? What are the arrangements?',
    kind: 'yesNo',
    section: 'lastWishes',
  },
  {
    id: 'lastWill',
    label: 'Does the client have last will arrangements?',
    kind: 'yesNoUnknown',
    section: 'lastWishes',
  },
  {
    id: 'contactNextOfKin',
    label:
      'If the client becomes dangerously ill would they like the care provider to contact next of kin?',
    kind: 'yesNo',
    section: 'lastWishes',
  },
  {
    id: 'reviewWishesFuture',
    label: 'Is client willing to review their last wishes in the future?',
    kind: 'yesNo',
    section: 'lastWishes',
  },
  {
    id: 'capacityLastWishes',
    label: 'Does the client have mental capacity to make decisions about her last wishes?',
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
    label: 'How does client consent to the last wishes?',
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
